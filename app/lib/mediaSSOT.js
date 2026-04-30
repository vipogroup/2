const PLACEHOLDER_IMAGE_SRC = 'https://via.placeholder.com/800x600?text=Product';

export function getPrimaryImage(product) {
  const images = Array.isArray(product?.media?.images) ? product.media.images : [];
  const first = images[0];

  if (!first) {
    return null;
  }

  if (typeof first === 'object' && first !== null) {
    const url = typeof first.url === 'string' ? first.url.trim() : '';
    if (!url) return null;
    return {
      url,
      alt: typeof first.alt === 'string' ? first.alt : '',
      position: Number.isFinite(first.position) ? first.position : 0,
      publicId: typeof first.publicId === 'string' ? first.publicId : '',
    };
  }

  return null;
}

export function getPrimaryImageSrc(product, fallback = PLACEHOLDER_IMAGE_SRC) {
  const primary = getPrimaryImage(product);
  const normalizedFallback =
    typeof fallback === 'string' && fallback.trim()
      ? fallback
      : PLACEHOLDER_IMAGE_SRC;
  return primary?.url || normalizedFallback;
}

export function getVideoUrl(product) {
  const videoUrl = product?.media?.videoUrl;
  return typeof videoUrl === 'string' ? videoUrl : '';
}
