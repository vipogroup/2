
import { MongoClient } from "mongodb";

const rawUri = process.env.MONGODB_URI;
const uri = typeof rawUri === "string" ? rawUri.trim() : "";
const USE_MOCK = process.env.USE_MOCK_DB === "true";

function isValidMongoConnectionString(s) {
  return typeof s === "string" && (s.startsWith("mongodb://") || s.startsWith("mongodb+srv://"));
}

let client;
let clientPromise;
let useMock = USE_MOCK;

if ((!uri || !isValidMongoConnectionString(uri)) && !USE_MOCK) {
  console.warn("⚠️  MONGODB_URI missing or invalid - falling back to mock DB");
  useMock = true;
}

if (!useMock && !global._mongoClientPromise) {
  client = new MongoClient(uri, { 
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    retryReads: true,
  });
  global._mongoClientPromise = client.connect().catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.warn('⚠️  Falling back to mock DB');
    useMock = true;
    return null;
  });
}

if (!useMock) {
  clientPromise = global._mongoClientPromise;
}

export async function getDb() {
  if (useMock) {
    const { getDb: getMockDb } = await import('./db-mock.js');
    return getMockDb();
  }
  
  try {
    const c = await clientPromise;
    if (!c) {
      useMock = true;
      const { getDb: getMockDb } = await import('./db-mock.js');
      return getMockDb();
    }
    const dbName = process.env.MONGODB_DB || "vipo";
    return c.db(dbName);
  } catch (err) {
    console.error('❌ MongoDB error:', err.message);
    console.warn('⚠️  Falling back to mock DB');
    useMock = true;
    const { getDb: getMockDb } = await import('./db-mock.js');
    return getMockDb();
  }
}
