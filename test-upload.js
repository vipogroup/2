const { MongoClient } = require('mongodb');

async function testUpload() {
  const client = new MongoClient('mongodb://127.0.0.1:27017/vipo');
  await client.connect();
  const db = client.db('vipo');
  
  // Test direct upload to products collection
  const testProduct = {
    tenantId: '673cf592ff41a83f879ab063',
    sku: 'TEST-001',
    name: 'מוצר בדיקה',
    description: 'תיאור בדיקה',
    price: 100,
    groupPrice: 90,
    type: 'group',
    purchaseType: 'group',
    status: 'published'
  };
  
  try {
    const result = await db.collection('products').insertOne(testProduct);
    console.log('Insert successful:', result.insertedId);
    
    // Verify it was saved
    const found = await db.collection('products').findOne({ _id: result.insertedId });
    console.log('Found product:', found ? 'YES' : 'NO');
    
    // Count all products
    const count = await db.collection('products').countDocuments();
    console.log('Total products in DB:', count);
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  await client.close();
}

testUpload();
