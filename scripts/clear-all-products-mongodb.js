// Script to delete ALL products directly from MongoDB
// Run this with: node scripts/clear-all-products-mongodb.js

const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://vipogroup1:Aa123456@cluster0.mongodb.net/vipo?retryWrites=true&w=majority';

async function clearAllProducts() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!');
    
    const db = mongoose.connection.db;
    const productsCollection = db.collection('products');
    
    // Count products before deletion
    const countBefore = await productsCollection.countDocuments();
    console.log(`\nFound ${countBefore} products in database`);
    
    if (countBefore === 0) {
      console.log('No products to delete');
      await mongoose.disconnect();
      return;
    }
    
    // Delete ALL products (including seed products)
    console.log('\nDeleting ALL products...');
    const result = await productsCollection.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} products`);
    
    // Verify deletion
    const countAfter = await productsCollection.countDocuments();
    console.log(`\nProducts remaining: ${countAfter}`);
    
    if (countAfter === 0) {
      console.log('\n✅ SUCCESS! All products deleted from database!');
    } else {
      console.log(`\n⚠️ Warning: ${countAfter} products still remain`);
    }
    
    await mongoose.disconnect();
    console.log('\nConnection closed');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

clearAllProducts();
