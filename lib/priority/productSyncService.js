/**
 * Product Sync Service
 * מנהל סנכרון מוצרים בין VIPO לפריוריטי
 */

import { getPriorityClient, isPriorityConfigured } from './client.js';

/**
 * Sync product to Priority when created
 * @param {Object} product - Product document from MongoDB
 */
export async function syncProductToPriority(product) {
  if (!isPriorityConfigured()) {
    console.warn('[PRIORITY_SYNC] Priority not configured, skipping product sync');
    return { synced: false, reason: 'not_configured' };
  }

  const priority = getPriorityClient();
  if (!priority) {
    return { synced: false, reason: 'client_unavailable' };
  }

  try {
    // Check if product already exists
    const itemCode = product.sku || product._id.toString();
    const exists = await priority.itemExists(itemCode);

    if (exists) {
      // Update existing product
      const result = await priority.updateItem(itemCode, {
        name: product.name,
        price: product.price,
        cost: product.cost,
        category: product.category,
        description: product.description,
        barcode: product.barcode,
        active: product.active !== false,
      });

      return {
        synced: true,
        itemCode,
        action: 'updated',
        isNew: false,
        data: result,
      };
    }

    // Create new product
    const result = await priority.createItem({
      sku: itemCode,
      itemCode,
      name: product.name,
      price: product.price,
      cost: product.cost || 0,
      category: product.category || 'GENERAL',
      description: product.description || '',
      barcode: product.barcode || '',
      unit: product.unit || 'יח',
      vatIncluded: product.vatIncluded !== false,
    });

    return {
      synced: true,
      itemCode: result.id,
      action: 'created',
      isNew: true,
      data: result,
    };

  } catch (err) {
    console.error('[PRIORITY_SYNC] Product sync failed:', err.message);
    return {
      synced: false,
      reason: err.message,
      error: err,
    };
  }
}

/**
 * Update product in Priority when modified
 * @param {Object} product - Product document from MongoDB
 * @param {Object} changes - Changed fields
 */
export async function updateProductInPriority(product, changes = {}) {
  if (!isPriorityConfigured()) {
    return { synced: false, reason: 'not_configured' };
  }

  const priority = getPriorityClient();
  if (!priority) {
    return { synced: false, reason: 'client_unavailable' };
  }

  try {
    const itemCode = product.priorityItemCode || product.sku || product._id.toString();
    
    // Check if exists first
    const exists = await priority.itemExists(itemCode);
    if (!exists) {
      // Create if doesn't exist
      return await syncProductToPriority(product);
    }

    // Map changes to Priority fields
    const updates = {};
    if (changes.name || product.name) updates.name = changes.name || product.name;
    if (changes.price !== undefined || product.price !== undefined) updates.price = changes.price ?? product.price;
    if (changes.cost !== undefined) updates.cost = changes.cost;
    if (changes.category) updates.category = changes.category;
    if (changes.description) updates.description = changes.description;
    if (changes.barcode) updates.barcode = changes.barcode;
    if (changes.active !== undefined) updates.active = changes.active;

    const result = await priority.updateItem(itemCode, updates);

    return {
      synced: true,
      itemCode,
      action: 'updated',
      data: result,
    };

  } catch (err) {
    console.error('[PRIORITY_SYNC] Product update failed:', err.message);
    return {
      synced: false,
      reason: err.message,
      error: err,
    };
  }
}

/**
 * Deactivate product in Priority when deleted
 * @param {Object} product - Product document from MongoDB
 */
export async function deactivateProductInPriority(product) {
  if (!isPriorityConfigured()) {
    return { synced: false, reason: 'not_configured' };
  }

  const priority = getPriorityClient();
  if (!priority) {
    return { synced: false, reason: 'client_unavailable' };
  }

  try {
    const itemCode = product.priorityItemCode || product.sku || product._id.toString();
    
    // Check if exists
    const exists = await priority.itemExists(itemCode);
    if (!exists) {
      return { synced: true, action: 'not_found', message: 'Product not in Priority' };
    }

    // Deactivate (soft delete)
    const result = await priority.deactivateItem(itemCode);

    return {
      synced: true,
      itemCode,
      action: 'deactivated',
      data: result,
    };

  } catch (err) {
    console.error('[PRIORITY_SYNC] Product deactivation failed:', err.message);
    return {
      synced: false,
      reason: err.message,
      error: err,
    };
  }
}

/**
 * Bulk sync all products to Priority
 * @param {Array} products - Array of product documents
 */
export async function bulkSyncProductsToPriority(products) {
  if (!isPriorityConfigured()) {
    return { synced: false, reason: 'not_configured', results: [] };
  }

  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (const product of products) {
    try {
      const result = await syncProductToPriority(product);
      results.push({ productId: product._id, ...result });
      if (result.synced) successCount++;
      else failCount++;
    } catch (err) {
      results.push({ productId: product._id, synced: false, error: err.message });
      failCount++;
    }
  }

  return {
    synced: failCount === 0,
    total: products.length,
    success: successCount,
    failed: failCount,
    results,
  };
}

/**
 * Import products from Priority to VIPO
 * @param {Object} options - Import options
 */
export async function importProductsFromPriority(options = {}) {
  if (!isPriorityConfigured()) {
    return { imported: false, reason: 'not_configured', products: [] };
  }

  const priority = getPriorityClient();
  if (!priority) {
    return { imported: false, reason: 'client_unavailable', products: [] };
  }

  try {
    const priorityProducts = await priority.syncProducts(options);

    // Map Priority products to VIPO format
    const products = priorityProducts.map(p => ({
      priorityItemCode: p.PARTNAME,
      sku: p.PARTNAME,
      name: p.PARTDES,
      price: p.SELLPRICE || 0,
      cost: p.COSTPRICE || 0,
      category: p.FAMILYNAME || 'כללי',
      barcode: p.BARCODE || '',
      description: p.SPEC1 || '',
      unit: p.UNIT || 'יח',
      active: p.STATDES === 'פעיל',
      source: 'priority',
      prioritySyncedAt: new Date(),
    }));

    return {
      imported: true,
      count: products.length,
      products,
    };

  } catch (err) {
    console.error('[PRIORITY_SYNC] Import products failed:', err.message);
    return {
      imported: false,
      reason: err.message,
      error: err,
      products: [],
    };
  }
}
