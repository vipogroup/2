export const DEFAULT_PRODUCT_CATEGORIES = [
  'אביזרי מחשב',
  'אודיו',
  'מסכים',
  'ריהוט',
  'רכישה קבוצתית',
];

export const DEFAULT_PRODUCT_SUBCATEGORIES = {
  default: ['כללי'],
  'נירוסטה': [
    'שולחן עבודה',
    'שולחן עבודה עם מדף',
    'ארון שולחן עבודה',
    'עגלת מטבח',
    'עגלה שטוחה',
    'עגלת מגשים',
    'כיורי נירוסטה',
    'מדף מטבח',
    'מפריד שומנים',
    'ציוד מטבח תעשייתי',
  ],
  'אביזרי מחשב': ['מקלדות', 'עכברים', 'אוזניות', 'מצלמות', 'אביזרים'],
  'אודיו': ['רמקולים', 'אוזניות', 'מיקרופונים', 'מערכות סאונד'],
  'מסכים': ['מסכי מחשב', 'טלוויזיות', 'מסכים ניידים'],
  'ריהוט': ['כיסאות', 'שולחנות', 'ארונות', 'מדפים'],
  'רכישה קבוצתית': ['מוצרי בית', 'אלקטרוניקה', 'ריהוט', 'מזון'],
};

// Cache for categories (to avoid too many API calls)
let cachedCategories = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30000; // 30 seconds

function broadcastCategories(categories) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent('productCategoriesUpdated', {
      detail: { categories },
    }),
  );
}

// Fetch categories from API
export async function fetchCategoriesFromAPI() {
  try {
    const res = await fetch('/api/categories');
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    cachedCategories = data.categories || DEFAULT_PRODUCT_CATEGORIES;
    cacheTimestamp = Date.now();
    return cachedCategories;
  } catch (error) {
    console.error('Failed to fetch categories from API:', error);
    return cachedCategories || [...DEFAULT_PRODUCT_CATEGORIES];
  }
}

// Sync load (returns cached or defaults, triggers async fetch)
export function loadProductCategories() {
  // Return cached if fresh
  if (cachedCategories && Date.now() - cacheTimestamp < CACHE_TTL) {
    return [...cachedCategories];
  }
  
  // Trigger async fetch for next time
  if (typeof window !== 'undefined') {
    fetchCategoriesFromAPI().then(cats => {
      broadcastCategories(cats);
    });
  }
  
  return cachedCategories ? [...cachedCategories] : [...DEFAULT_PRODUCT_CATEGORIES];
}

// Delete a category via API
export async function deleteCategory(category, currentCategories) {
  try {
    const res = await fetch(`/api/categories?name=${encodeURIComponent(category)}`, {
      method: 'DELETE',
    });
    
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete');
    }
    
    // Update cache
    const updated = currentCategories.filter(c => c !== category);
    cachedCategories = updated;
    broadcastCategories(updated);
    return updated;
  } catch (error) {
    console.error('Failed to delete category:', error);
    // Fallback: remove locally
    const updated = currentCategories.filter(c => c !== category);
    return updated;
  }
}

// Add a new category via API
export async function addCategory(category, currentCategories) {
  try {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: category }),
    });
    
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to add');
    }
    
    // Update cache
    const updated = [...currentCategories, category];
    cachedCategories = updated;
    broadcastCategories(updated);
    return updated;
  } catch (error) {
    console.error('Failed to add category:', error);
    // Fallback: add locally
    const updated = [...currentCategories, category];
    return updated;
  }
}

// Save categories (for compatibility - now just broadcasts)
export function saveProductCategories(categories) {
  cachedCategories = categories;
  broadcastCategories(categories);
  return categories;
}

export function getSubCategoryOptions(category) {
  if (!category || typeof category !== 'string') {
    return [];
  }

  const normalized = category.trim();
  const options = DEFAULT_PRODUCT_SUBCATEGORIES[normalized]
    || DEFAULT_PRODUCT_SUBCATEGORIES.default
    || [];

  return [...options];
}
