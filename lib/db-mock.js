// Mock DB for development when MongoDB connection fails
import bcrypt from 'bcryptjs';
import { seedMockUsers } from './db-mock-seed.js';

const mockUsers = new Map();

// Initialize with test users
const initMockDb = async () => {
  if (mockUsers.size === 0) {
    await seedMockUsers(mockUsers);
    console.log('🔧 Mock DB initialized with test users');
  }
};

class MockCollection {
  constructor(name, data) {
    this.name = name;
    this.data = data;
  }

  async findOne(query) {
    if (this.name === 'users' && query.email) {
      return mockUsers.get(query.email) || null;
    }
    return null;
  }

  find(query, options = {}) {
    const self = this;
    const projection = options?.projection || null;
    const chain = {
      sort() {
        return chain;
      },
      limit() {
        return chain;
      },
      project(fields) {
        return {
          sort() {
            return chain;
          },
          limit() {
            return chain;
          },
          async toArray() {
            return self._findToArray(query, fields || projection);
          },
        };
      },
      async toArray() {
        return self._findToArray(query, projection);
      },
    };
    return chain;
  }

  async _findToArray(query, fields) {
    if (this.name === 'users') {
      return Array.from(mockUsers.values()).map((user) => {
        if (!fields) return user;
        const projected = {};
        Object.keys(fields).forEach((key) => {
          if (fields[key]) projected[key] = user[key];
        });
        return projected;
      });
    }
    if (this.name === 'products') {
      return [];
    }
    return [];
  }

  async countDocuments() {
    if (this.name === 'users') return mockUsers.size;
    return 0;
  }

  async insertOne(doc) {
    if (this.name === 'users') {
      const id = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newDoc = { ...doc, _id: id };
      const key = doc.email || doc.phone || id;
      mockUsers.set(key, newDoc);
      return { insertedId: id };
    }
    return { insertedId: null };
  }

  async updateOne(filter, update, options) {
    if (this.name === 'users' && filter.email) {
      const existing = mockUsers.get(filter.email);
      if (existing || options?.upsert) {
        const updated = {
          ...existing,
          ...update.$set,
          _id: existing?._id || `mock-${Date.now()}`,
        };
        if (update.$setOnInsert && !existing) {
          Object.assign(updated, update.$setOnInsert);
        }
        mockUsers.set(filter.email, updated);
        return {
          matchedCount: existing ? 1 : 0,
          modifiedCount: existing ? 1 : 0,
          upsertedId: existing ? null : updated._id,
        };
      }
    }
    return { matchedCount: 0, modifiedCount: 0 };
  }
}

class MockDb {
  constructor() {
    this.databaseName = 'vipo-mock';
  }

  collection(name) {
    return new MockCollection(name, mockUsers);
  }
}

let mockDbInstance = null;

export async function getDb() {
  if (!mockDbInstance) {
    await initMockDb();
    mockDbInstance = new MockDb();
    console.log('⚠️  Using MOCK database (MongoDB connection unavailable)');
  }
  return mockDbInstance;
}
