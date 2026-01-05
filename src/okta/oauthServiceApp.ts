import * as jose from 'jose';
import type { Config } from '../config.js';

interface TokenCache {
  accessToken: string;
  expiresAt: number; // Unix timestamp in ms
}

let tokenCache: TokenCache | null = null;

/**
 * Build a client_assertion JWT for private_key_jwt authentication
 */
async function buildClientAssertion(config: Config): Promise<string> {
  const privateKey = await jose.importPKCS8(config.privateKey, 'RS256');

  const tokenEndpoint = config.authServerId
    ? `${config.oktaDomain}/oauth2/${config.authServerId}/v1/token`
    : `${config.oktaDomain}/oauth2/v1/token`;

  const now = Math.floor(Date.now() / 1000);

  const jwt = await new jose.SignJWT({})
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(config.clientId)
    .setSubject(config.clientId)
    .setAudience(tokenEndpoint)
    .setIssuedAt(now)
    .setExpirationTime(now + 300) // 5 minutes
    .setJti(crypto.randomUUID())
    .sign(privateKey);

  return jwt;
}

/**
 * Exchange client_assertion for an access token using client_credentials grant
 */
async function fetchAccessToken(config: Config): Promise<TokenCache> {
  const tokenEndpoint = config.authServerId
    ? `${config.oktaDomain}/oauth2/${config.authServerId}/v1/token`
    : `${config.oktaDomain}/oauth2/v1/token`;

  const clientAssertion = await buildClientAssertion(config);

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: config.scopes.join(' '),
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: clientAssertion,
  });

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Token request failed (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
  };

  // Cache with a 60-second safety margin
  const expiresAt = Date.now() + (data.expires_in - 60) * 1000;

  return {
    accessToken: data.access_token,
    expiresAt,
  };
}

/**
 * Get a valid access token, refreshing if expired or about to expire
 */
export async function getAccessToken(config: Config): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.accessToken;
  }

  tokenCache = await fetchAccessToken(config);
  return tokenCache.accessToken;
}

/**
 * Clear the token cache (useful for testing or forced refresh)
 */
export function clearTokenCache(): void {
  tokenCache = null;
}
