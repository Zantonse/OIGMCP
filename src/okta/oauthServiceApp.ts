import * as jose from 'jose';
import type { Config } from '../config.js';

interface TokenCache {
  accessToken: string;
  expiresAt: number; // Unix timestamp in ms
}

interface DPoPKeyPair {
  privateKey: jose.KeyLike;
  publicKey: jose.KeyLike;
  jwk: jose.JWK;
}

let tokenCache: TokenCache | null = null;
let dpopKeyPair: DPoPKeyPair | null = null;
let dpopNonce: string | null = null;

/**
 * Generate or retrieve a DPoP key pair
 */
async function getDPoPKeyPair(): Promise<DPoPKeyPair> {
  if (dpopKeyPair) {
    return dpopKeyPair;
  }

  // Generate a new EC key pair for DPoP
  const { privateKey, publicKey } = await jose.generateKeyPair('ES256');
  const jwk = await jose.exportJWK(publicKey);

  dpopKeyPair = { privateKey, publicKey, jwk };
  return dpopKeyPair;
}

/**
 * Create a DPoP proof JWT
 */
async function createDPoPProof(
  httpMethod: string,
  httpUri: string,
  accessToken?: string,
  nonce?: string
): Promise<string> {
  const keyPair = await getDPoPKeyPair();
  const now = Math.floor(Date.now() / 1000);

  const claims: Record<string, unknown> = {
    jti: crypto.randomUUID(),
    htm: httpMethod,
    htu: httpUri,
    iat: now,
  };

  // Include nonce if provided
  if (nonce || dpopNonce) {
    claims.nonce = nonce || dpopNonce;
  }

  // Include access token hash if present (for authorized requests)
  if (accessToken) {
    const encoder = new TextEncoder();
    const data = encoder.encode(accessToken);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashBase64 = btoa(String.fromCharCode(...hashArray))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    claims.ath = hashBase64;
  }

  const dpopProof = await new jose.SignJWT(claims)
    .setProtectedHeader({
      alg: 'ES256',
      typ: 'dpop+jwt',
      jwk: keyPair.jwk,
    })
    .sign(keyPair.privateKey);

  return dpopProof;
}

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

  // First attempt - may receive nonce challenge
  let clientAssertion = await buildClientAssertion(config);
  let dpopProof = await createDPoPProof('POST', tokenEndpoint);

  let body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: config.scopes.join(' '),
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: clientAssertion,
  });

  let response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      DPoP: dpopProof,
    },
    body: body.toString(),
  });

  // Handle DPoP nonce challenge
  if (response.status === 400) {
    const errorBody = await response.text();
    if (errorBody.includes('use_dpop_nonce')) {
      // Extract nonce from response header
      const nonce = response.headers.get('DPoP-Nonce');
      if (nonce) {
        // Store nonce for future requests
        dpopNonce = nonce;
        
        // Generate NEW client assertion (JTI must be unique!)
        clientAssertion = await buildClientAssertion(config);
        dpopProof = await createDPoPProof('POST', tokenEndpoint, undefined, nonce);
        
        // Rebuild body with new assertion
        body = new URLSearchParams({
          grant_type: 'client_credentials',
          scope: config.scopes.join(' '),
          client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
          client_assertion: clientAssertion,
        });
        
        response = await fetch(tokenEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
            DPoP: dpopProof,
          },
          body: body.toString(),
        });
      }
    }
  }

  // Update nonce from response if provided
  const nonceHeader = response.headers.get('DPoP-Nonce');
  if (nonceHeader) {
    dpopNonce = nonceHeader;
  }

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

/**
 * Create a DPoP proof for an API request
 */
export async function createDPoPProofForRequest(
  httpMethod: string,
  httpUri: string,
  accessToken: string
): Promise<string> {
  return createDPoPProof(httpMethod, httpUri, accessToken, dpopNonce || undefined);
}

/**
 * Update the DPoP nonce from response headers
 */
export function updateDPoPNonce(nonce: string | null): void {
  if (nonce) {
    dpopNonce = nonce;
  }
}
