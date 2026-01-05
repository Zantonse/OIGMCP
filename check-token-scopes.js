#!/usr/bin/env node
/**
 * Check what scopes are actually in the access token
 */

import { readFileSync } from 'fs';
import * as jose from 'jose';

const OKTA_DOMAIN = process.env.OKTA_DOMAIN;
const OKTA_CLIENT_ID = process.env.OKTA_CLIENT_ID;
const OKTA_PRIVATE_KEY_PATH = process.env.OKTA_PRIVATE_KEY_PATH;

// Generate DPoP key pair
const { privateKey: dpopPrivateKey, publicKey: dpopPublicKey } = await jose.generateKeyPair('ES256');
const dpopJwk = await jose.exportJWK(dpopPublicKey);

async function createDPoPProof(method, url, accessToken, nonce) {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    jti: crypto.randomUUID(),
    htm: method,
    htu: url,
    iat: now,
  };
  
  if (nonce) {
    claims.nonce = nonce;
  }
  
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
  
  return await new jose.SignJWT(claims)
    .setProtectedHeader({
      alg: 'ES256',
      typ: 'dpop+jwt',
      jwk: dpopJwk,
    })
    .sign(dpopPrivateKey);
}

async function getAccessToken() {
  const privateKeyPem = readFileSync(OKTA_PRIVATE_KEY_PATH, 'utf-8');
  const privateKey = await jose.importPKCS8(privateKeyPem, 'RS256');
  
  const tokenEndpoint = `${OKTA_DOMAIN}/oauth2/v1/token`;
  
  async function buildClientAssertion() {
    const now = Math.floor(Date.now() / 1000);
    return await new jose.SignJWT({})
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .setIssuer(OKTA_CLIENT_ID)
      .setSubject(OKTA_CLIENT_ID)
      .setAudience(tokenEndpoint)
      .setIssuedAt(now)
      .setExpirationTime(now + 300)
      .setJti(crypto.randomUUID())
      .sign(privateKey);
  }
  
  // Request with ALL possible scopes
  const requestedScopes = [
    'okta.governance.accessCertifications.read',
    'okta.governance.accessCertifications.manage',
    'okta.governance.accessRequests.read',
    'okta.governance.accessRequests.manage',
    'okta.governance.entitlements.read',
    'okta.users.read',
    'okta.groups.read',
    'okta.apps.read',
  ].join(' ');
  
  console.log('🔍 Requesting scopes:', requestedScopes);
  console.log('');
  
  // First attempt
  let clientAssertion = await buildClientAssertion();
  let body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: requestedScopes,
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: clientAssertion,
  });
  
  let dpopProof = await createDPoPProof('POST', tokenEndpoint);
  let response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      DPoP: dpopProof,
    },
    body: body.toString(),
  });
  
  // Handle nonce challenge
  if (response.status === 400) {
    const errorBody = await response.text();
    if (errorBody.includes('use_dpop_nonce')) {
      const nonce = response.headers.get('DPoP-Nonce');
      
      // Generate NEW client assertion
      clientAssertion = await buildClientAssertion();
      body = new URLSearchParams({
        grant_type: 'client_credentials',
        scope: requestedScopes,
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: clientAssertion,
      });
      
      dpopProof = await createDPoPProof('POST', tokenEndpoint, undefined, nonce);
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
  
  if (!response.ok) {
    const errorBody = await response.text();
    console.error('❌ Token request failed:', response.status);
    console.error('   Error:', errorBody);
    throw new Error(`Token request failed: ${response.status}`);
  }
  
  const data = await response.json();
  console.log('✅ Successfully obtained access token');
  console.log('');
  console.log('📋 Token Details:');
  console.log('   Token type:', data.token_type);
  console.log('   Expires in:', data.expires_in, 'seconds');
  console.log('');
  console.log('🔐 GRANTED SCOPES:');
  console.log('   ', data.scope);
  console.log('');
  
  // Check which scopes are missing
  const grantedScopes = data.scope.split(' ');
  const requestedScopesArray = requestedScopes.split(' ');
  const missingScopes = requestedScopesArray.filter(s => !grantedScopes.includes(s));
  
  if (missingScopes.length > 0) {
    console.log('⚠️  MISSING SCOPES (not granted in Okta):');
    missingScopes.forEach(scope => {
      console.log('   ❌', scope);
    });
    console.log('');
    console.log('💡 To fix:');
    console.log('   1. Go to Okta Admin Console');
    console.log('   2. Applications → Your service app');
    console.log('   3. Okta API Scopes tab');
    console.log('   4. Grant the missing scopes listed above');
    console.log('   5. Click Save');
  } else {
    console.log('✅ All requested scopes are granted!');
  }
  
  return data.access_token;
}

try {
  await getAccessToken();
} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}


