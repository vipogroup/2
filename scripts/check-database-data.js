// scripts/check-database-data.js
// Check what data exists in MongoDB
require('dotenv').config({ path: '.env.production.upload' });

const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'vipo';

console.log('🔍 Checking database data...');
console.log('📋 Database:', dbName);
console.log('');

(async () => {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    console.log('');
    
    const db = client.db(dbName);
    
    // Check all collections
    const collections = await db.listCollections().toArray();
    console.log('📊 Collections in database:');
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`   - ${col.name}: ${count} documents`);
    }
    console.log('');
    
    // Check products specifically
    const products = db.collection('products');
    const productCount = await products.countDocuments();
    
    console.log('🛍️  Products:');
    console.log(`   Total: ${productCount}`);
    
    if (productCount > 0) {
      console.log('');
      console.log('   Sample products:');
      const sampleProducts = await products.find({}).limit(5).toArray();
      sampleProducts.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name} (ID: ${p._id})`);
      });
    } else {
      console.log('   ⚠️  No products found!');
    }
    console.log('');
    
    // Check users
    const users = db.collection('users');
    const userCount = await users.countDocuments();
    console.log('👥 Users:');
    console.log(`   Total: ${userCount}`);
    
    const adminCount = await users.countDocuments({ role: 'admin' });
    const agentCount = await users.countDocuments({ role: 'agent' });
    const customerCount = await users.countDocuments({ role: 'customer' });
    
    console.log(`   - Admins: ${adminCount}`);
    console.log(`   - Agents: ${agentCount}`);
    console.log(`   - Customers: ${customerCount}`);
    console.log('');
    
    // Check orders
    const orders = db.collection('orders');
    const orderCount = await orders.countDocuments();
    console.log('📦 Orders:');
    console.log(`   Total: ${orderCount}`);
    console.log('');
    
    // Summary
    console.log('═══════════════════════════════════');
    console.log('📊 Summary:');
    console.log('═══════════════════════════════════');
    if (productCount === 0) {
      console.log('⚠️  Database has NO PRODUCTS!');
      console.log('   This is why updates don\'t work.');
      console.log('');
      console.log('💡 Solution:');
      console.log('   1. Import products from local database');
      console.log('   2. Or seed demo products');
    } else {
      console.log('✅ Database has products');
      console.log('   Updates should work if permissions are correct');
    }
    
  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    await client.close();
    console.log('');
    console.log('🔌 Disconnected');
  }
})();
