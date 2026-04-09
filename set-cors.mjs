// One-time script to set CORS on Firebase Storage bucket.
// Run with: node set-cors.mjs
import { readFileSync } from 'fs'

// ── Read .env.local ───────────────────────────────────────────────────────────
const env = {}
try {
  const raw = readFileSync('.env.local', 'utf8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    env[key] = val
  }
} catch {
  console.error('Could not read .env.local')
  process.exit(1)
}

const projectId   = env.FIREBASE_ADMIN_PROJECT_ID   || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const clientEmail = env.FIREBASE_ADMIN_CLIENT_EMAIL
const privateKey  = (env.FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n')
const bucketName  = env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET

if (!projectId || !clientEmail || !privateKey || !bucketName) {
  console.error('Missing env vars')
  process.exit(1)
}

// ── JWT via Web Crypto (Node 18+, no OpenSSL 3 issues) ───────────────────────
function pemToDer(pem) {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')
  return Buffer.from(base64, 'base64')
}

async function makeJwt() {
  const keyDer = pemToDer(privateKey)
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'pkcs8',
    keyDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const now = Math.floor(Date.now() / 1000)
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/devstorage.full_control',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url')
  const unsigned = `${header}.${payload}`
  const sig = await globalThis.crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    Buffer.from(unsigned),
  )
  return `${unsigned}.${Buffer.from(sig).toString('base64url')}`
}

async function getAccessToken() {
  const jwt = await makeJwt()
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(data))
  return data.access_token
}

// ── CORS config ───────────────────────────────────────────────────────────────
const corsConfig = [
  {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      `https://${projectId}.web.app`,
      `https://${projectId}.firebaseapp.com`,
    ],
    method: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
    responseHeader: [
      'Content-Type',
      'Authorization',
      'Content-Length',
      'User-Agent',
      'x-goog-resumable',
      'x-firebase-storage-version',
    ],
    maxAgeSeconds: 3600,
  },
]

async function setCors(bucket, token) {
  const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}?fields=cors`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ cors: corsConfig }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(data.error?.message ?? data)}`)
  return data
}

async function listBuckets(token) {
  const res = await fetch(`https://storage.googleapis.com/storage/v1/b?project=${projectId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  if (!res.ok) return []
  return (data.items || []).map(b => b.name)
}

// ── Run ───────────────────────────────────────────────────────────────────────
console.log('Authenticating...')
const token = await getAccessToken()
console.log('✓ Got access token\n')

console.log('Listing buckets in project...')
const buckets = await listBuckets(token)
if (buckets.length > 0) {
  console.log('Buckets found:')
  buckets.forEach(b => console.log('  -', b))
} else {
  console.log('  (none found or no list permission)')
}
console.log()

// Try the configured bucket + common fallbacks
const toTry = [...new Set([
  bucketName,
  `${projectId}.appspot.com`,
  ...buckets,
])]

let success = false
for (const bucket of toTry) {
  process.stdout.write(`Setting CORS on gs://${bucket} ... `)
  try {
    await setCors(bucket, token)
    console.log('✓')
    success = true
  } catch (err) {
    console.log(`✗ ${err.message}`)
  }
}

if (success) {
  console.log('\n✓ Done! Refresh your browser and try uploading again.')
} else {
  console.error('\n✗ All attempts failed.')
  console.error('Make sure the service account has the "Storage Admin" role in Google Cloud Console > IAM.')
  process.exit(1)
}
