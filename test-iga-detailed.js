#!/usr/bin/env node
/**
 * Detailed IGA API test with full error information
 */

import { readFileSync } from 'fs';
import * as jose from 'jose';

const OKTA_DOMAIN = process.env.OKTA_DOMAIN;
const OKTA_CLIENT_ID = process.env.OKTA_CLIENT_ID;
const OKTA_PRIVATE_KEY_PATH = process.env.OKTA_PRIVATE_KEY_PATH;

const { privateKey: dpopPrivateKey, publicKey: dpopPublicKey } = await jose.generateKeyPair('ES256');
const dpopJwk = await jose.exportJWK(dpopPublicKey);

async function createDPoPProof(method, url, accessToken, nonce) {
  const now = Math.floor(Date.now() / 1000);
  const claims = { jti: crypto.randomUUID(), htm: method, htu: url, iat: now };
  if (nonce) claims.nonce = nonce;
  if (accessToken) {
    const encoder = new TextEncoder();
    const data = encoder.encode(accessToken);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashBase64 = btoa(String.fromCharCode(...hashArray))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    claims.ath = hashBase64;
  }
  return await new jose.SignJWT(claims)
    .setProtectedHeader({ alg: 'ES256', typ: 'dpop+jwt', jwk: dpopJwk })
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
      .setIssuer(OKTA_CLIENT_ID).setSubject(OKTA_CLIENT_ID)
      .setAudience(tokenEndpoint).setIssuedAt(now)
      .setExpirationTime(now + 300).setJti(crypto.randomUUID())
      .sign(privateKey);
  }
  
  let clientAssertion = await buildClientAssertion();
  let body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'okta.governance.accessCertifications.read',
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: clientAssertion,
  });
  
  let dpopProof = await createDPoPProof('POST', tokenEndpoint);
  let response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', DPoP: dpopProof },
    body: body.toString(),
  });
  
  if (response.status === 400) {
    const errorBody = await response.text();
    if (errorBody.includes('use_dpop_nonce')) {
      const nonce = response.headers.get('DPoP-Nonce');
      clientAssertion = await buildClientAssertion();
      body = new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'okta.governance.accessCertifications.read',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: clientAssertion,
      });
      dpopProof = await createDPoPProof('POST', tokenEndpoint, undefined, nonce);
      response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', DPoP: dpopProof },
        body: body.toString(),
      });
    }
  }
  
  if (!response.ok) throw new Error(`Token failed: ${response.status}`);
  const data = await response.json();
  return { token: data.access_token, nonce: response.headers.get('DPoP-Nonce') };
}

try {
  console.log('🔍 Detailed IGA API Test\n');
  console.log('Okta Domain:', OKTA_DOMAIN);
  console.log('Client ID:', OKTA_CLIENT_ID);
  console.log('');
  
  const { token, nonce } = await getAccessToken();
  console.log('✅ Successfully obtained access token\n');
  
  const apiUrl = `${OKTA_DOMAIN}/governance/api/v1/campaigns`;
  const htu = apiUrl;
  const dpopProof = await createDPoPProof('GET', htu, token, nonce);
  
  console.log('Testing endpoint:', apiUrl);
  console.log('');
  
  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      Authorization: `DPoP ${token}`,
      Accept: 'application/json',
      DPoP: dpopProof,
    },
  });
  
  console.log('Response Status:', response.status, response.statusText);
  console.log('');
  console.log('Response Headers:');
  response.headers.forEach((value, key) => {
    console.log(`  ${key}: ${value}`);
  });
  console.log('');
  
  const body = await response.text();
  console.log('Response Body:');
  try {
    const json = JSON.parse(body);
    console.log(JSON.stringify(json, null, 2));
    
    if (json.errorCode === 'E0000006') {
      console.log('\n⚠️  Error E0000006: Insufficient permissions');
      console.log('\nPossible causes:');
      console.log('1. Service app needs to be assigned IGA admin role');
      console.log('2. Service app needs additional permissions beyond OAuth scopes');
      console.log('3. IGA requires user context (service app might not work for all endpoints)');
      console.log('\n💡 Try these steps:');
      console.log('1. In Okta Admin Console, go to Security → Administrators');
      console.log('2. Click "Add Administrator"');
      console.log('3. Search for your service app client ID:', OKTA_CLIENT_ID);
      console.log('4. Assign an IGA-related admin role (e.g., "Access Certifications Admin")');
    }
  } catch {
    console.log(body);
  }
  
} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}

