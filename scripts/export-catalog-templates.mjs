import { MongoClient, ObjectId } from 'mongodb';
import fs from 'fs/promises';
import path from 'path';

const TENANT_ID = '6980e7a13862e2a30b667a62'; // מחסני נירוסטה
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vipo';
const OUTPUT_PATH = path.resolve('exports', 'catalog-templates-stainless.json');

const stripTemplate = (template) => {
  const {
    _id,
    tenantId,
    createdAt,
    updatedAt,
    __v,
    ...rest
  } = template;
  return rest;
};

const run = async () => {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db();

  const templates = await db
    .collection('catalogtemplates')
    .find({ tenantId: new ObjectId(TENANT_ID) })
    .sort({ createdAt: -1 })
    .toArray();

  const pack = {
    format: 'vipo.catalogTemplatesPack',
    version: 1,
    source: {
      name: 'מחסני נירוסטה',
      tenantId: TENANT_ID,
    },
    exportedAt: new Date().toISOString(),
    templates: templates.map(stripTemplate),
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(pack, null, 2), 'utf8');

  console.log(`Exported ${templates.length} templates to ${OUTPUT_PATH}`);
  await client.close();
};

run().catch((err) => {
  console.error('Export failed:', err);
  process.exit(1);
});
