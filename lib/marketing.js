import { ObjectId } from 'mongodb';

import { getDb } from '@/lib/db';

export async function createMarketingAsset(payload) {
  const db = await getDb();
  const collection = db.collection('marketing_assets');

  const now = new Date();
  const doc = {
    title: payload.title,
    type: payload.type,
    mediaUrl: payload.mediaUrl,
    thumbnailUrl: payload.thumbnailUrl ?? null,
    messageTemplate: payload.messageTemplate ?? '',
    target: payload.target ?? { type: 'products' },
    isActive: payload.isActive !== false,
    createdAt: now,
    updatedAt: now,
    tags: payload.tags ?? [],
  };

  const result = await collection.insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

export async function updateMarketingAsset(id, payload) {
  const db = await getDb();
  const collection = db.collection('marketing_assets');

  const objectId = new ObjectId(id);
  const update = {
    updatedAt: new Date(),
  };

  if (payload.title !== undefined) update.title = payload.title;
  if (payload.type !== undefined) update.type = payload.type;
  if (payload.mediaUrl !== undefined) update.mediaUrl = payload.mediaUrl;
  if (payload.thumbnailUrl !== undefined) update.thumbnailUrl = payload.thumbnailUrl;
  if (payload.messageTemplate !== undefined) update.messageTemplate = payload.messageTemplate;
  if (payload.target !== undefined) update.target = payload.target;
  if (payload.isActive !== undefined) update.isActive = payload.isActive;
  if (payload.tags !== undefined) update.tags = payload.tags;

  await collection.updateOne({ _id: objectId }, { $set: update });
  return collection.findOne({ _id: objectId });
}

export async function deleteMarketingAsset(id) {
  const db = await getDb();
  const collection = db.collection('marketing_assets');
  const objectId = new ObjectId(id);

  const result = await collection.deleteOne({ _id: objectId });
  return result.deletedCount > 0;
}
