const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vipogroup1:Aa123456@cluster0.mongodb.net/vipo?retryWrites=true&w=majority';

async function deleteAllProducts() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected successfully!');
    
    const db = client.db('vipo');
    const productsCollection = db.collection('products');
    
    // Count products before deletion
    const countBefore = await productsCollection.countDocuments();
    console.log(`Found ${countBefore} products`);
    
    if (countBefore === 0) {
      console.log('No products to delete');
      return;
    }
    
    // Delete all products
    console.log('Deleting all products...');
    const result = await productsCollection.deleteMany({});
    console.log(`Deleted ${result.deletedCount} products`);
    
    // Verify deletion
    const countAfter = await productsCollection.countDocuments();
    console.log(`Products remaining: ${countAfter}`);
    
    console.log('\n✅ All products deleted successfully!');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('Connection closed');
  }
}

deleteAllProducts();
