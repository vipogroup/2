import mongoose from 'mongoose';

const DEFAULT_LOCAL_URI = 'mongodb://127.0.0.1:27017/vipo_dev';

function resolveMongoUri() {
  const explicitUri = process.env.MONGODB_URI && process.env.MONGODB_URI.trim();
  if (explicitUri) {
    return explicitUri;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.warn('[i]  MONGODB_URI missing; defaulting to local MongoDB at 127.0.0.1:27017/vipo_dev');
    return DEFAULT_LOCAL_URI;
  }

  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null, uri: null };
}

async function dbConnect() {
  const MONGODB_URI = resolveMongoUri();
  
  // If already connected with same URI, return existing connection
  if (cached.conn && cached.uri === MONGODB_URI) {
    return cached.conn;
  }

  // If mongoose is already connected (from another call), reuse it
  if (mongoose.connection.readyState === 1) {
    cached.conn = mongoose;
    cached.uri = MONGODB_URI;
    return cached.conn;
  }

  // If there's a pending promise, wait for it
  if (cached.promise && cached.uri === MONGODB_URI) {
    cached.conn = await cached.promise;
    return cached.conn;
  }

  // Create new connection
  cached.uri = MONGODB_URI;
  cached.promise = mongoose
    .connect(MONGODB_URI, {
      bufferCommands: false,
    })
    .then((mongoose) => mongoose);

  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
