#!/usr/bin/env node
/**
 * Debug script to test Okta API authentication and see detailed error responses
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
  
  // First attempt
  let clientAssertion = await buildClientAssertion();
  let body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'okta.governance.accessCertifications.read okta.governance.accessRequests.read okta.governance.entitlements.read okta.groups.read',
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
      console.log('📝 Received DPoP nonce:', nonce);
      
      // Generate NEW client assertion (must be unique!)
      clientAssertion = await buildClientAssertion();
      body = new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'okta.governance.accessCertifications.read okta.governance.accessRequests.read okta.governance.entitlements.read okta.groups.read',
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
    console.error('❌ Token request failed:', response.status, errorBody);
    throw new Error(`Token request failed: ${response.status}`);
  }
  
  const data = await response.json();
  console.log('✅ Got access token');
  console.log('   Token type:', data.token_type);
  console.log('   Expires in:', data.expires_in, 'seconds');
  console.log('   Scopes:', data.scope);
  
  return { token: data.access_token, nonce: response.headers.get('DPoP-Nonce') };
}

async function testApiCall(accessToken, nonce) {
  const apiUrl = `${OKTA_DOMAIN}/api/v1/groups?limit=1`;
  
  // HTU should be the URL WITHOUT query parameters per DPoP spec
  const htu = `${OKTA_DOMAIN}/api/v1/groups`;
  const dpopProof = await createDPoPProof('GET', htu, accessToken, nonce);
  
  console.log('\n🔍 Testing API call to:', apiUrl);
  console.log('   DPoP HTU:', htu);
  console.log('   Authorization header:', `DPoP ${accessToken.substring(0, 20)}...`);
  console.log('   DPoP proof:', dpopProof.substring(0, 50) + '...');
  
  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      Authorization: `DPoP ${accessToken}`,
      Accept: 'application/json',
      DPoP: dpopProof,
    },
  });
  
  console.log('\n📊 Response status:', response.status, response.statusText);
  console.log('   Content-Type:', response.headers.get('Content-Type'));
  
  const responseBody = await response.text();
  console.log('\n📄 Response body:');
  try {
    console.log(JSON.stringify(JSON.parse(responseBody), null, 2));
  } catch {
    console.log(responseBody);
  }
}

try {
  const { token, nonce } = await getAccessToken();
  await testApiCall(token, nonce);
} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}

