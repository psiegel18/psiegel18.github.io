/**
 * Apple Client Secret Generator
 *
 * Usage: node generate-apple-secret.js
 *
 * Before running, update the configuration below with your values.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ============================================
// UPDATE THESE VALUES WITH YOUR INFORMATION
// ============================================

const CONFIG = {
  // Your Team ID (found in Apple Developer account - top right corner, or Membership page)
  teamId: 'YOUR_TEAM_ID',

  // Your Service ID (the identifier you created, e.g., org.psiegel.signin)
  serviceId: 'org.psiegel.signin',

  // Your Key ID (shown when you created/downloaded the key)
  keyId: 'YOUR_KEY_ID',

  // Path to your .p8 private key file
  privateKeyPath: './AuthKey_XXXXXX.p8',
};

// ============================================
// DO NOT MODIFY BELOW THIS LINE
// ============================================

function generateAppleClientSecret() {
  // Read the private key
  let privateKey;
  try {
    privateKey = fs.readFileSync(path.resolve(CONFIG.privateKeyPath), 'utf8');
  } catch (error) {
    console.error('❌ Error reading private key file:', error.message);
    console.error('   Make sure the path is correct and the file exists.');
    process.exit(1);
  }

  // Create JWT header
  const header = {
    alg: 'ES256',
    kid: CONFIG.keyId,
    typ: 'JWT'
  };

  // Create JWT payload
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + (86400 * 180); // 180 days (max allowed is 6 months)

  const payload = {
    iss: CONFIG.teamId,
    iat: now,
    exp: expiry,
    aud: 'https://appleid.apple.com',
    sub: CONFIG.serviceId
  };

  // Base64URL encode
  const base64UrlEncode = (obj) => {
    const json = JSON.stringify(obj);
    const base64 = Buffer.from(json).toString('base64');
    return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  };

  const headerEncoded = base64UrlEncode(header);
  const payloadEncoded = base64UrlEncode(payload);
  const signatureInput = `${headerEncoded}.${payloadEncoded}`;

  // Sign with ES256
  const sign = crypto.createSign('SHA256');
  sign.update(signatureInput);
  sign.end();

  const signature = sign.sign({
    key: privateKey,
    dsaEncoding: 'ieee-p1363'
  });

  const signatureEncoded = signature.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const clientSecret = `${signatureInput}.${signatureEncoded}`;

  // Output results
  console.log('\n✅ Apple Client Secret Generated Successfully!\n');
  console.log('='.repeat(60));
  console.log('\nAPPLE_CLIENT_ID (Service ID):');
  console.log(CONFIG.serviceId);
  console.log('\nAPPLE_CLIENT_SECRET:');
  console.log(clientSecret);
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 Copy the values above to your Vercel environment variables.');
  console.log(`\n⏰ This secret expires: ${new Date(expiry * 1000).toLocaleDateString()}`);
  console.log('   (You\'ll need to regenerate it before then)\n');
}

// Validate config before running
if (CONFIG.teamId === 'YOUR_TEAM_ID') {
  console.error('❌ Please update CONFIG.teamId with your Apple Team ID');
  console.error('   Find it at: https://developer.apple.com/account -> Membership');
  process.exit(1);
}
if (CONFIG.keyId === 'YOUR_KEY_ID') {
  console.error('❌ Please update CONFIG.keyId with your Key ID');
  console.error('   This was shown when you created the key in Apple Developer portal');
  process.exit(1);
}
if (CONFIG.privateKeyPath === './AuthKey_XXXXXX.p8') {
  console.error('❌ Please update CONFIG.privateKeyPath with the path to your .p8 file');
  process.exit(1);
}

generateAppleClientSecret();
