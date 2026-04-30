/**
 * Aggregation helpers: catalog mode string תואם ל־{@link getCatalogProductMode}
 * (מלאי | קבוצתית | מכולה משותפת) לסינון בשרת.
 */

/** @returns {{ $addFields: Record<string, unknown> }} */
export function buildCatalogProductModeAddFieldsStage() {
  const normGroupPurchase = {
    $toLower: {
      $trim: { input: { $toString: { $ifNull: ['$groupPurchaseType', ''] } } },
    },
  };

  const purchaseOrTypeToken = {
    $let: {
      vars: {
        ptPick: {
          $cond: [
            {
              $gt: [
                {
                  $strLenCP: {
                    $trim: { input: { $toString: { $ifNull: ['$purchaseType', ''] } } },
                  },
                },
                0,
              ],
            },
            '$purchaseType',
            { $ifNull: ['$type', ''] },
          ],
        },
      },
      in: {
        $toLower: {
          $trim: { input: { $toString: { $ifNull: ['$$ptPick', ''] } } },
        },
      },
    },
  };

  const inventoryToken = {
    $toLower: {
      $trim: { input: { $toString: { $ifNull: ['$inventoryMode', ''] } } },
    },
  };

  return {
    $addFields: {
      catalogProductMode: {
        $let: {
          vars: {
            ng: normGroupPurchase,
            pt: purchaseOrTypeToken,
            inv: inventoryToken,
          },
          in: {
            $switch: {
              branches: [
                {
                  case: {
                    $in: [
                      '$$ng',
                      [
                        'shared_container',
                        'sharedcontainer',
                        'shared-container',
                        'shared container',
                      ],
                    ],
                  },
                  then: 'shared_container',
                },
                { case: { $eq: ['$$pt', 'group'] }, then: 'group' },
                { case: { $eq: ['$$inv', 'group'] }, then: 'group' },
                {
                  case: {
                    $or: [{ $eq: ['$$inv', 'shared_container'] }, { $eq: ['$$inv', 'sharedcontainer'] }],
                  },
                  then: 'shared_container',
                },
              ],
              default: 'stock',
            },
          },
        },
      },
    },
  };
}

/** @param {string[]} allowedModes subset of stock|group|shared_container */
export function buildCatalogModeVisibilityMatch(allowedModes) {
  return { catalogProductMode: { $in: allowedModes } };
}
