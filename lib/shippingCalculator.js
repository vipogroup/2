/**
 * Shipping Calculator - חישוב עלות משלוח לפי מרחק
 * 
 * משתמש ב-OSRM לחישוב מרחק כביש אמיתי (עם fallback ל-Haversine)
 * ו-Nominatim (OpenStreetMap) להמרת כתובת לקואורדינטות
 */

// קואורדינטות נקודות האיסוף
const PICKUP_COORDINATES = {
  beer_yaakov: { lat: 31.9294, lon: 34.8336, name: 'באר יעקב' },
  naale: { lat: 31.8947, lon: 35.0561, name: 'נעלה' },
};

// מחירון
const BASE_PRICE = 250;       // מחיר בסיס עד 30 ק"מ
const BASE_DISTANCE_KM = 30;  // מרחק בסיס כלול במחיר
const PRICE_PER_EXTRA_KM = 3; // מחיר לכל ק"מ נוסף
const ROAD_FACTOR = 1.3;      // מקדם תיקון קו אווירי → כביש (fallback בלבד)

/**
 * חישוב מרחק בין שתי נקודות בנוסחת Haversine
 * @returns מרחק בקילומטרים
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // רדיוס כדור הארץ בק"מ
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * קריאה ל-Nominatim API
 */
async function nominatimSearch(params) {
  try {
    const searchParams = new URLSearchParams({
      format: 'json',
      limit: '1',
      countrycodes: 'il',
      ...params,
    });
    const url = `https://nominatim.openstreetmap.org/search?${searchParams.toString()}`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'he,en',
        'User-Agent': 'VipoShop/1.0',
      },
    });
    if (!response.ok) return null;
    const results = await response.json();
    if (!results || results.length === 0) return null;
    return { lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) };
  } catch {
    return null;
  }
}

// טבלת ערים ישראליות נפוצות עם קואורדינטות
const ISRAEL_CITIES = {
  'נתניה': { lat: 32.3215, lon: 34.8532 },
  'תל אביב': { lat: 32.0853, lon: 34.7818 },
  'ירושלים': { lat: 31.7683, lon: 35.2137 },
  'חיפה': { lat: 32.7940, lon: 34.9896 },
  'באר שבע': { lat: 31.2520, lon: 34.7915 },
  'ראשון לציון': { lat: 31.9730, lon: 34.7925 },
  'פתח תקווה': { lat: 32.0841, lon: 34.8878 },
  'אשדוד': { lat: 31.8014, lon: 34.6434 },
  'חולון': { lat: 32.0158, lon: 34.7794 },
  'בני ברק': { lat: 32.0834, lon: 34.8344 },
  'רמת גן': { lat: 32.0700, lon: 34.8243 },
  'אשקלון': { lat: 31.6688, lon: 34.5743 },
  'רחובות': { lat: 31.8928, lon: 34.8113 },
  'בת ים': { lat: 32.0171, lon: 34.7514 },
  'הרצליה': { lat: 32.1629, lon: 34.8447 },
  'כפר סבא': { lat: 32.1780, lon: 34.9066 },
  'רעננה': { lat: 32.1849, lon: 34.8708 },
  'הוד השרון': { lat: 32.1500, lon: 34.8900 },
  'מודיעין': { lat: 31.8969, lon: 35.0104 },
  'לוד': { lat: 31.9510, lon: 34.8886 },
  'רמלה': { lat: 31.9275, lon: 34.8625 },
  'נס ציונה': { lat: 31.9314, lon: 34.7983 },
  'יבנה': { lat: 31.8769, lon: 34.7388 },
  'גבעתיים': { lat: 32.0717, lon: 34.8108 },
  'קריית אונו': { lat: 32.0636, lon: 34.8554 },
  'אור יהודה': { lat: 32.0289, lon: 34.8561 },
  'באר יעקב': { lat: 31.9294, lon: 34.8336 },
  'נעלה': { lat: 31.8947, lon: 35.0561 },
  'גדרה': { lat: 31.8144, lon: 34.7789 },
  'עפולה': { lat: 32.6080, lon: 35.2890 },
  'נצרת': { lat: 32.6996, lon: 35.3035 },
  'טבריה': { lat: 32.7922, lon: 35.5312 },
  'קריית גת': { lat: 31.6100, lon: 34.7642 },
  'אילת': { lat: 29.5577, lon: 34.9519 },
  'נהריה': { lat: 33.0060, lon: 35.0984 },
  'עכו': { lat: 32.9272, lon: 35.0764 },
  'קריית שמונה': { lat: 33.2067, lon: 35.5714 },
  'דימונה': { lat: 31.0697, lon: 35.0336 },
  'ערד': { lat: 31.2561, lon: 35.2126 },
  'צפת': { lat: 32.9658, lon: 35.4983 },
  'כרמיאל': { lat: 32.9136, lon: 35.3039 },
  'טירה': { lat: 32.2339, lon: 34.9500 },
  'קלנסוואה': { lat: 32.2833, lon: 34.9833 },
  'טייבה': { lat: 32.2667, lon: 35.0000 },
  'שדרות': { lat: 31.5250, lon: 34.5964 },
  'יהוד': { lat: 32.0333, lon: 34.8833 },
  'קריית מלאכי': { lat: 31.7297, lon: 34.7453 },
  'מגדל העמק': { lat: 32.6794, lon: 35.2408 },
  'ראש העין': { lat: 32.0956, lon: 34.9567 },
  'גבעת שמואל': { lat: 32.0756, lon: 34.8500 },
  'שוהם': { lat: 31.9992, lon: 34.9464 },
};

/**
 * המרת כתובת לקואורדינטות - עם מספר אסטרטגיות fallback
 * @returns {{ lat: number, lon: number }} | null
 */
export async function geocodeAddress(address, city) {
  // ניקוי שם העיר
  const cleanCity = city?.trim() || '';
  const cleanAddress = address?.trim() || '';

  // 1) נסה חיפוש מובנה (structured) - street + city
  if (cleanAddress && cleanCity) {
    const result = await nominatimSearch({ street: cleanAddress, city: cleanCity, country: 'Israel' });
    if (result) return result;
  }

  // 2) נסה חיפוש חופשי עם כתובת + עיר
  if (cleanAddress && cleanCity) {
    const result = await nominatimSearch({ q: `${cleanAddress}, ${cleanCity}, ישראל` });
    if (result) return result;
  }

  // 3) נסה חיפוש לפי עיר בלבד (ב-Nominatim)
  if (cleanCity) {
    const result = await nominatimSearch({ q: `${cleanCity}, ישראל` });
    if (result) return result;
  }

  // 4) Fallback - טבלה מקומית של ערים ישראליות
  if (cleanCity) {
    const cityLower = cleanCity;
    for (const [name, coords] of Object.entries(ISRAEL_CITIES)) {
      if (name === cityLower || cityLower.includes(name) || name.includes(cityLower)) {
        return coords;
      }
    }
  }

  return null;
}

/**
 * חישוב מרחק כביש אמיתי באמצעות OSRM (חינמי)
 * @returns מרחק בק"מ או null אם נכשל
 */
async function getOSRMRoadDistance(lat1, lon1, lat2, lon2) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'VipoShop/1.0' },
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) return null;
    // OSRM מחזיר מרחק במטרים → ממירים לק"מ
    return Math.round(data.routes[0].distance / 1000);
  } catch {
    return null;
  }
}

/**
 * חישוב המרחק מנקודת האיסוף הקרובה ביותר
 * משתמש ב-OSRM למרחק כביש אמיתי, עם fallback ל-Haversine × 1.3
 * @returns {{ distance: number, nearestPointId: string, nearestPointName: string }}
 */
export async function getDistanceFromNearestPickup(lat, lon) {
  // שלב 1: מצא את נקודת האיסוף הקרובה ביותר (לפי קו אווירי)
  let minDistance = Infinity;
  let nearestPoint = null;

  for (const [id, point] of Object.entries(PICKUP_COORDINATES)) {
    const dist = haversineDistance(lat, lon, point.lat, point.lon);
    if (dist < minDistance) {
      minDistance = dist;
      nearestPoint = { id, name: point.name, lat: point.lat, lon: point.lon };
    }
  }

  // שלב 2: נסה לקבל מרחק כביש אמיתי מ-OSRM
  const roadDistance = await getOSRMRoadDistance(lat, lon, nearestPoint.lat, nearestPoint.lon);

  // שלב 3: אם OSRM נכשל → fallback ל-Haversine × מקדם תיקון
  const finalDistance = roadDistance !== null ? roadDistance : Math.round(minDistance * ROAD_FACTOR);

  return {
    distance: finalDistance,
    nearestPointId: nearestPoint.id,
    nearestPointName: nearestPoint.name,
  };
}

/**
 * חישוב עלות משלוח לפי מרחק
 * @param {number} distanceKm - מרחק בק"מ
 * @returns {{ price: number, distance: number, extraKm: number }}
 */
export function calculateShippingPrice(distanceKm) {
  const extraKm = Math.max(0, distanceKm - BASE_DISTANCE_KM);
  const price = BASE_PRICE + (extraKm * PRICE_PER_EXTRA_KM);

  return {
    price: Math.round(price),
    distance: distanceKm,
    extraKm,
    basePrice: BASE_PRICE,
    extraCharge: Math.round(extraKm * PRICE_PER_EXTRA_KM),
  };
}

/**
 * פונקציה משולבת - מקבלת כתובת ומחזירה עלות משלוח
 * @returns {{ price, distance, nearestPointName, nearestPointId, extraKm, basePrice, extraCharge }} | null
 */
export async function getShippingCostForAddress(address, city) {
  const coords = await geocodeAddress(address, city);
  if (!coords) return null;

  const { distance, nearestPointId, nearestPointName } = await getDistanceFromNearestPickup(coords.lat, coords.lon);
  const pricing = calculateShippingPrice(distance);

  return {
    ...pricing,
    nearestPointId,
    nearestPointName,
  };
}

// קבועים לייצוא
export const SHIPPING_CONSTANTS = {
  BASE_PRICE,
  BASE_DISTANCE_KM,
  PRICE_PER_EXTRA_KM,
  PICKUP_COORDINATES,
};
