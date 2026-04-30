const { MongoClient } = require('mongodb');
const uri = 'mongodb://127.0.0.1:27017/vipo';

(async () => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('vipo');
    const products = db.collection('products');
    
    // Count before
    const total = await products.countDocuments();
    const withStatus = await products.countDocuments({ status: { $exists: true } });
    const withoutStatus = await products.countDocuments({ status: { $exists: false } });
    
    console.log(JSON.stringify({ phase: 'before', total, withStatus, withoutStatus }));
    
    // Backfill: active=true or undefined => published, else draft
    const publishedResult = await products.updateMany(
      { status: { $exists: false }, $or: [{ active: true }, { active: { $exists: false } }, { active: null }] },
      { $set: { status: 'published' } }
    );
    
    const draftResult = await products.updateMany(
      { status: { $exists: false }, active: false },
      { $set: { status: 'draft' } }
    );
    
    // Count after
    const remaining = await products.countDocuments({ status: { $exists: false } });
    const published = await products.countDocuments({ status: 'published' });
    const draft = await products.countDocuments({ status: 'draft' });
    const archived = await products.countDocuments({ status: 'archived' });
    
    console.log(JSON.stringify({
      phase: 'after',
      modified: { published: publishedResult.modifiedCount, draft: draftResult.modifiedCount },
      counts: { published, draft, archived },
      remaining
    }));
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.close();
  }
})();
