const path = require('path');
const { MongoClient } = require('mongodb');
const chalk = require('chalk');

require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'vipo';

if (!uri) {
  console.error(chalk.red('❌ Missing MONGODB_URI in .env.local'));
  process.exit(1);
}

(async () => {
  const client = new MongoClient(uri);
  try {
    process.stdout.write('🔄 Connecting to MongoDB... ');
    await client.connect();
    console.log(chalk.green('connected'));

    const admin = client.db(dbName).admin();
    const info = await admin.serverStatus().catch(() => null);
    if (info) {
      console.log(chalk.green('✅ Server status:'), {
        version: info.version,
        connections: info.connections?.current,
        host: info.host,
      });
    }

    const collections = await client.db(dbName).listCollections({}, { nameOnly: true }).toArray();
    console.log(
      chalk.green('📦 Collections:'),
      collections.map((c) => c.name),
    );
  } catch (err) {
    console.error(chalk.red('❌ Connection failed:'), err.message);
    process.exitCode = 1;
  } finally {
    await client.close().catch(() => {});
  }
})();
