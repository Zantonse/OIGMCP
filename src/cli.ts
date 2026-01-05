#!/usr/bin/env node
/**
 * Simple local MCP client for this repo.
 * Lets you call MCP tools from your terminal without needing an MCP host app.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

function usage(exitCode = 1): never {
  // Keep this intentionally short.
  console.error(
    [
      'Usage:',
      '  okta-iga-mcp-cli tools',
      '  okta-iga-mcp-cli call <toolName> [jsonArgs]',
      '',
      'Examples:',
      '  okta-iga-mcp-cli tools',
      '  okta-iga-mcp-cli call iga_campaigns_list_all "{}"',
      '  okta-iga-mcp-cli call iga_campaigns_list_all "{\\"status\\":\\"ACTIVE\\"}"',
    ].join('\n')
  );
  process.exit(exitCode);
}

function getStringEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string') env[key] = value;
  }
  return env;
}

function getServerParams() {
  const cwd = process.cwd();

  const distIndex = resolve(cwd, 'dist/index.js');
  const hasDist = existsSync(distIndex);

  if (!hasDist) {
    throw new Error(
      'dist/index.js not found. Run `npm run build` first, then retry.'
    );
  }

  return {
    command: process.execPath, // node
    args: [distIndex],
    cwd,
    env: getStringEnv(),
    // Keep stderr visible to help debug auth/env issues.
    stderr: 'inherit' as const,
  };
}

function parseJsonArg(maybeJson: string | undefined): Record<string, unknown> {
  if (!maybeJson) return {};
  try {
    const parsed = JSON.parse(maybeJson);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('jsonArgs must be a JSON object');
    }
    return parsed as Record<string, unknown>;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid jsonArgs: ${message}`);
  }
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (!command) usage(1);

  const client = new Client(
    { name: 'okta-iga-mcp-cli', version: '0.1.0' },
    { capabilities: {} }
  );

  const transport = new StdioClientTransport(getServerParams());

  try {
    await client.connect(transport);

    if (command === 'tools') {
      const result = await client.listTools();
      console.log(JSON.stringify(result.tools, null, 2));
      return;
    }

    if (command === 'call') {
      const [toolName, jsonArgs] = rest;
      if (!toolName) usage(1);

      const args = parseJsonArg(jsonArgs);
      const result = await client.callTool({ name: toolName, arguments: args });

      // Prefer the server's plain-text JSON payload.
      const textParts = Array.isArray((result as any).content)
        ? (result as any).content
            .filter((p: any) => p?.type === 'text' && typeof p.text === 'string')
            .map((p: any) => p.text)
        : [];

      if (textParts.length > 0) {
        // If it's JSON, reformat for readability.
        const joined = textParts.join('\n');
        try {
          console.log(JSON.stringify(JSON.parse(joined), null, 2));
        } catch {
          console.log(joined);
        }
        return;
      }

      console.log(JSON.stringify(result, null, 2));
      return;
    }

    usage(1);
  } finally {
    await transport.close().catch(() => undefined);
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exit(1);
});
