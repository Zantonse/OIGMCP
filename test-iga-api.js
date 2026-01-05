#!/usr/bin/env node
/**
 * Test direct access to IGA API endpoints
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
    scope: 'okta.governance.accessCertifications.read okta.governance.accessRequests.read',
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
        scope: 'okta.governance.accessCertifications.read okta.governance.accessRequests.read',
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

async function testEndpoint(token, nonce, path, name) {
  const fullUrl = `${OKTA_DOMAIN}${path}`;
  const htu = fullUrl.split('?')[0];
  const dpopProof = await createDPoPProof('GET', htu, token, nonce);
  
  console.log(`\n🔍 Testing: ${name}`);
  console.log(`   URL: ${fullUrl}`);
  
  const response = await fetch(fullUrl, {
    method: 'GET',
    headers: { Authorization: `DPoP ${token}`, Accept: 'application/json', DPoP: dpopProof },
  });
  
  console.log(`   Status: ${response.status} ${response.statusText}`);
  
  const body = await response.text();
  if (response.ok) {
    console.log('   ✅ SUCCESS!');
    try {
      const json = JSON.parse(body);
      console.log('   Data:', JSON.stringify(json, null, 2).substring(0, 500));
    } catch {
      console.log('   Response:', body.substring(0, 300));
    }
  } else {
    console.log('   ❌ FAILED');
    try {
      const json = JSON.parse(body);
      console.log('   Error:', json.errorSummary || json.error_description || json.errorCode);
    } catch {
      console.log('   Response:', body.substring(0, 200));
    }
  }
}

try {
  console.log('🚀 Testing IGA API endpoints...\n');
  const { token, nonce } = await getAccessToken();
  console.log('✅ Got access token with IGA scopes\n');
  
  // Test various IGA endpoints
  await testEndpoint(token, nonce, '/api/v1/governance/campaigns', 'IGA Campaigns (v1)');
  await testEndpoint(token, nonce, '/governance/api/v1/campaigns', 'IGA Campaigns (governance path)');
  await testEndpoint(token, nonce, '/api/v1/iga/campaigns', 'IGA Campaigns (iga path)');
  await testEndpoint(token, nonce, '/api/v1/accessCertifications/campaigns', 'Access Certifications');
  
  console.log('\n');
} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}

