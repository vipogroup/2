require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

async function testMongoose() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect('mongodb://127.0.0.1:27017/vipo', {
      dbName: 'vipo'
    });
    console.log('Connected!');
    
    // Create a test product
    const testProduct = {
      tenantId: '673cf592ff41a83f879ab063',
      sku: 'MONGOOSE-TEST-001',
      name: 'מוצר בדיקה Mongoose',
      description: 'תיאור בדיקה',
      price: 100,
      groupPrice: 90,
      type: 'group',
      purchaseType: 'group',
      status: 'published'
    };
    
    console.log('Creating product...');
    const created = await Product.create(testProduct);
    console.log('Created product:', created._id);
    
    // Verify it was saved
    const found = await Product.findById(created._id);
    console.log('Found product:', found ? 'YES' : 'NO');
    
    // Count all products
    const count = await Product.countDocuments();
    console.log('Total products in DB:', count);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Connection closed');
  }
}

testMongoose();
