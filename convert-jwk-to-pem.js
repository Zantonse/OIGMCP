#!/usr/bin/env node
/**
 * Convert JWK (JSON Web Key) to PEM format
 * This is a one-time conversion utility
 */

import { readFileSync, writeFileSync } from 'fs';
import { exportPKCS8 } from 'jose';

async function convertJwkToPem(jwkPath, pemPath) {
  try {
    // Read the JWK file
    const jwkContent = readFileSync(jwkPath, 'utf-8');
    const jwk = JSON.parse(jwkContent);

    // Import the JWK
    const { importJWK } = await import('jose');
    const privateKey = await importJWK(jwk, 'RS256');

    // Export as PEM (PKCS#8 format)
    const pem = await exportPKCS8(privateKey);

    // Write the PEM file
    writeFileSync(pemPath, pem, 'utf-8');

    console.log(`✅ Successfully converted JWK to PEM`);
    console.log(`   Input:  ${jwkPath}`);
    console.log(`   Output: ${pemPath}`);
    console.log(`\n📝 Update your configuration to use: ${pemPath}`);
  } catch (error) {
    console.error('❌ Error converting JWK to PEM:', error.message);
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('Usage: node convert-jwk-to-pem.js <jwk-file> <output-pem-file>');
  console.error('Example: node convert-jwk-to-pem.js key.json key.pem');
  process.exit(1);
}

const [jwkPath, pemPath] = args;
convertJwkToPem(jwkPath, pemPath);

