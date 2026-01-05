#!/usr/bin/env node
/**
 * Okta IGA MCP Server
 * Read-only access to Okta Identity Governance APIs
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { getConfig } from './config.js';
import { createOktaClient, OktaApiError, type StructuredError } from './okta/client.js';
import { tools, zodToJsonSchema } from './mcp/tools.js';

// ============================================================================
// Error Helpers
// ============================================================================

function createStructuredError(
  err: unknown,
  toolName: string
): StructuredError {
  if (err instanceof OktaApiError) {
    return err.toStructured(toolName);
  }

  const error = err as Error;
  let type: StructuredError['type'] = 'unknown_error';
  let suggestion = 'An unexpected error occurred. Check the error details and retry.';

  if (error.name === 'AbortError' || error.name === 'TimeoutError') {
    type = 'network_error';
    suggestion = 'Request timed out. Check network connectivity or increase timeout.';
  } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
    type = 'network_error';
    suggestion = 'Network error occurred. Check OKTA_DOMAIN configuration and connectivity.';
  } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
    type = 'network_error';
    suggestion = 'Could not connect to Okta. Verify OKTA_DOMAIN is correct.';
  }

  return {
    type,
    message: error.message || 'Unknown error',
    suggestion,
    timestamp: new Date().toISOString(),
  };
}

function parseTopLevelFields(args: unknown): string[] | undefined {
  if (!args || typeof args !== 'object') return undefined;
  const record = args as Record<string, unknown>;
  const raw = record.fields;
  if (!raw) return undefined;

  const values = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(/[\s,]+/)
      : [];

  const fields = values
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean);

  if (fields.length === 0) return undefined;
  return Array.from(new Set(fields));
}

function projectTopLevel(value: unknown, fields: string[]): unknown {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => projectTopLevel(v, fields));

  const record = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const key of fields) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      output[key] = record[key];
    }
  }
  return output;
}

function applyFieldsProjection(result: unknown, fields: string[] | undefined): unknown {
  if (!fields) return result;

  if (Array.isArray(result)) {
    return result.map((item) => projectTopLevel(item, fields));
  }

  if (result && typeof result === 'object') {
    const record = result as Record<string, unknown>;

    if (Array.isArray(record.items)) {
      return {
        ...record,
        items: record.items.map((item) => projectTopLevel(item, fields)),
      };
    }

    return projectTopLevel(record, fields);
  }

  return result;
}

async function main() {
  // Load config (validates env vars)
  const config = getConfig();

  // Create Okta client
  const oktaClient = createOktaClient(config);

  // Create MCP server
  const server = new Server(
    {
      name: 'okta-iga-mcp',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle list tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: zodToJsonSchema(tool.inputSchema),
      })),
    };
  });

  // Handle call tool
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const fields = parseTopLevelFields(args);

    const tool = tools.find((t) => t.name === name);
    if (!tool) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: `Unknown tool: ${name}` }),
          },
        ],
        isError: true,
      };
    }

    try {
      const result = await tool.handler(oktaClient, args || {});
      const projected = applyFieldsProjection(result, fields);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(projected, null, 2),
          },
        ],
      };
    } catch (err) {
      const structuredError = createStructuredError(err, name);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(structuredError, null, 2),
          },
        ],
        isError: true,
      };
    }
  });

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr so it doesn't interfere with MCP protocol
  console.error('Okta IGA MCP server started');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
