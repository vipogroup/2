// Cloudinary URL transformation helpers
// TODO: Implement signed URLs for sensitive areas if needed

/**
 * Generate optimized Cloudinary URL with transformations
 * @param {string} url - Original Cloudinary URL
 * @param {object} options - Transformation options
 * @returns {string} - Transformed URL
 */
export function getOptimizedImageUrl(url, options = {}) {
  if (!url || !url.includes("res.cloudinary.com")) {
    return url;
  }

  const {
    width = null,
    height = null,
    quality = "auto:good",
    format = "auto",
    crop = "fill",
  } = options;

  // Extract parts from URL
  const parts = url.split("/upload/");
  if (parts.length !== 2) return url;

  // Build transformation string
  const transforms = [];
  
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (crop) transforms.push(`c_${crop}`);
  if (quality) transforms.push(`q_${quality}`);
  if (format) transforms.push(`f_${format}`);

  const transformString = transforms.join(",");
  
  // Return transformed URL
  return `${parts[0]}/upload/${transformString}/${parts[1]}`;
}

/**
 * Get thumbnail URL (small preview)
 */
export function getThumbnailUrl(url) {
  return getOptimizedImageUrl(url, {
    width: 200,
    height: 200,
    crop: "fill",
  });
}

/**
 * Get card image URL (medium size for product cards)
 */
export function getCardImageUrl(url) {
  return getOptimizedImageUrl(url, {
    width: 400,
    height: 400,
    crop: "fill",
  });
}

// Alias: components import `getCardImageSrc` for Next/Image `src`.
export const getCardImageSrc = getCardImageUrl;

/**
 * Get full image URL (large size for product details)
 */
export function getFullImageUrl(url) {
  return getOptimizedImageUrl(url, {
    width: 1200,
    quality: "auto:best",
  });
}

// TODO: Implement signed URLs for private/sensitive images
// export function getSignedUrl(publicId, options = {}) {
//   const cloudinary = require("cloudinary").v2;
//   return cloudinary.url(publicId, {
//     ...options,
//     sign_url: true,
//     type: "authenticated",
//   });
// }
