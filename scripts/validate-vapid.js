#!/usr/bin/env node

/**
 * VAPID Keys Validation Script
 * Run with: node scripts/validate-vapid.js
 */

function sanitizeBase64Key(rawValue) {
  if (!rawValue) return '';
  const trimmed = String(rawValue).trim();
  const withoutWrappingQuotes = trimmed.replace(/^['"]+|['"]+$/g, '');
  return withoutWrappingQuotes.replace(/\s+/g, '');
}

function validateBase64(str, keyName) {
  console.log(`\n=== Validating ${keyName} ===`);
  
  if (!str) {
    console.log(`❌ ${keyName}: Missing or empty`);
    return false;
  }
  
  console.log(`📏 Original length: ${str.length}`);
  console.log(`🔍 First 20 chars: "${str.substring(0, 20)}"`);
  console.log(`🔍 Last 20 chars: "${str.substring(str.length - 20)}"`);
  
  // Check for whitespace
  if (str !== str.trim()) {
    console.log(`⚠️  ${keyName}: Has leading/trailing whitespace`);
  }
  
  // Check for quotes
  if (str.match(/^['"]+|['"]+$/)) {
    console.log(`⚠️  ${keyName}: Has wrapping quotes`);
  }
  
  // Check for newlines/spaces
  if (str.match(/[\n\r\s]/)) {
    console.log(`⚠️  ${keyName}: Contains whitespace characters`);
  }
  
  const cleaned = sanitizeBase64Key(str);
  console.log(`🧹 Cleaned length: ${cleaned.length}`);
  
  if (cleaned !== str) {
    console.log(`🔧 Sanitization changed the key`);
  }
  
  // Check Base64 format
  const base64Regex = /^[A-Za-z0-9+/\-_]*={0,2}$/;
  if (!base64Regex.test(cleaned)) {
    console.log(`❌ ${keyName}: Invalid Base64 characters`);
    return false;
  }
  
  // Try to decode
  try {
    const buffer = Buffer.from(cleaned, 'base64');
    console.log(`✅ ${keyName}: Valid Base64, decoded to ${buffer.length} bytes`);
    
    // VAPID keys should be around 65 bytes for public key, 32 bytes for private key
    if (keyName.includes('PUBLIC') && buffer.length !== 65) {
      console.log(`⚠️  ${keyName}: Expected 65 bytes for public key, got ${buffer.length}`);
    }
    if (keyName.includes('PRIVATE') && buffer.length !== 32) {
      console.log(`⚠️  ${keyName}: Expected 32 bytes for private key, got ${buffer.length}`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ ${keyName}: Failed to decode - ${error.message}`);
    return false;
  }
}

function main() {
  console.log('🔐 VAPID Keys Validation\n');
  
  // Load environment variables
  require('dotenv').config({ path: '.env.local' });
  require('dotenv').config({ path: '.env' });
  
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY || process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
  const contactEmail = process.env.WEB_PUSH_CONTACT_EMAIL || process.env.SUPPORT_EMAIL;
  
  console.log('📋 Environment Variables:');
  console.log(`- WEB_PUSH_PUBLIC_KEY: ${publicKey ? 'Set' : 'Missing'}`);
  console.log(`- NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY: ${process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY ? 'Set' : 'Missing'}`);
  console.log(`- WEB_PUSH_PRIVATE_KEY: ${privateKey ? 'Set' : 'Missing'}`);
  console.log(`- WEB_PUSH_CONTACT_EMAIL: ${contactEmail || 'Missing'}`);
  
  let allValid = true;
  
  if (publicKey) {
    allValid = validateBase64(publicKey, 'WEB_PUSH_PUBLIC_KEY') && allValid;
  } else {
    console.log('\n❌ No public key found in environment variables');
    allValid = false;
  }
  
  if (privateKey) {
    allValid = validateBase64(privateKey, 'WEB_PUSH_PRIVATE_KEY') && allValid;
  } else {
    console.log('\n❌ No private key found in environment variables');
    allValid = false;
  }
  
  console.log('\n' + '='.repeat(50));
  if (allValid) {
    console.log('✅ All VAPID keys are valid!');
  } else {
    console.log('❌ VAPID validation failed');
    console.log('\n📝 To generate new VAPID keys:');
    console.log('1. Install web-push: npm install -g web-push');
    console.log('2. Generate keys: web-push generate-vapid-keys');
    console.log('3. Copy the keys to your environment variables');
  }
}

if (require.main === module) {
  main();
}
