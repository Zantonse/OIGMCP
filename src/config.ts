import { z } from 'zod';
import * as fs from 'fs';

const configSchema = z.object({
  oktaDomain: z.string().url().describe('Okta org domain (e.g., https://your-org.okta.com)'),
  clientId: z.string().min(1).describe('OAuth 2.0 service app client ID'),
  privateKey: z.string().min(1).describe('Private key (PEM format) for JWT assertion'),
  scopes: z.array(z.string()).default([
    'okta.governance.accessCertifications.read',
    'okta.governance.accessCertifications.manage',
    'okta.governance.accessRequests.read',
    'okta.governance.accessRequests.manage',
    'okta.governance.entitlements.read',
  ]),
  authServerId: z.string().optional().describe('Auth server ID (empty for org auth server)'),
  timeoutMs: z.number().int().positive().default(30000),
  maxRetries: z.number().int().min(0).default(3),
});

export type Config = z.infer<typeof configSchema>;

function loadPrivateKey(): string {
  const keyPath = process.env.OKTA_PRIVATE_KEY_PATH;
  const keyValue = process.env.OKTA_PRIVATE_KEY;

  if (keyPath) {
    try {
      return fs.readFileSync(keyPath, 'utf-8');
    } catch (err) {
      throw new Error(`Failed to read private key from ${keyPath}: ${err}`);
    }
  }

  if (keyValue) {
    // Handle escaped newlines from env vars
    return keyValue.replace(/\\n/g, '\n');
  }

  throw new Error('Either OKTA_PRIVATE_KEY or OKTA_PRIVATE_KEY_PATH must be set');
}

export function loadConfig(): Config {
  const rawConfig = {
    oktaDomain: process.env.OKTA_DOMAIN?.replace(/\/$/, ''), // strip trailing slash
    clientId: process.env.OKTA_CLIENT_ID,
    privateKey: loadPrivateKey(),
    scopes: process.env.OKTA_SCOPES?.split(/\s+/).filter(Boolean),
    authServerId: process.env.OKTA_AUTH_SERVER_ID || undefined,
    timeoutMs: process.env.OKTA_TIMEOUT_MS ? parseInt(process.env.OKTA_TIMEOUT_MS, 10) : undefined,
    maxRetries: process.env.OKTA_MAX_RETRIES ? parseInt(process.env.OKTA_MAX_RETRIES, 10) : undefined,
  };

  const result = configSchema.safeParse(rawConfig);
  if (!result.success) {
    const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new Error(`Invalid configuration: ${errors}`);
  }

  return result.data;
}

let cachedConfig: Config | null = null;

export function getConfig(): Config {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}
