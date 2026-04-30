/**
 * Validate Mongo env + connection (no secrets printed).
 * Run: node --env-file=.env.prod.current scripts/validate-mongo-env.mjs
 */
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI?.trim();
const dbName = (process.env.MONGODB_DB || 'vipo').trim();
const appMode = process.env.APP_DATA_MODE || '';

function hostFromUri(u) {
  try {
    const s = String(u).replace(/^mongodb(\+srv)?:\/\//, 'http://');
    const noQuery = s.split('?')[0];
    const at = noQuery.lastIndexOf('@');
    const hostPart = at >= 0 ? noQuery.slice(at + 1) : noQuery;
    return hostPart.split('/')[0].split(':')[0];
  } catch {
    return '(parse-error)';
  }
}

const localLike =
  uri &&
  (/mongodb:\/\/(127\.0\.0\.1|localhost)/i.test(uri) || /localhost/i.test(uri));

async function main() {
  const host = hostFromUri(uri || '');
  console.log('MONGODB_URI host:', host);
  console.log('MONGODB_DB:', dbName || '(missing)');
  console.log('APP_DATA_MODE:', appMode || '(unset)');

  if (!uri) {
    console.log('RESULT: FAIL missing MONGODB_URI');
    process.exit(1);
  }
  if (dbName !== 'vipo') {
    console.log('RESULT: FAIL MONGODB_DB expected vipo');
    process.exit(1);
  }
  if (appMode !== 'shared_remote') {
    console.log('RESULT: WARN APP_DATA_MODE not shared_remote');
  }
  if (localLike) {
    console.log('RESULT: WARN URI looks local');
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 45000 });
  await client.connect();
  try {
    const db = client.db(dbName);
    const resolved = db.databaseName;
    const products = await db.collection('products').countDocuments();
    const tenants = await db.collection('tenants').countDocuments();
    console.log('DB name resolved:', resolved);
    console.log('products count:', products);
    console.log('tenants count:', tenants);
    console.log('RESULT: PASS');
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.log('RESULT: FAIL', e.message);
  process.exit(1);
});
