/**
 * Canonical GA4 Measurement ID from public env (build-time).
 * Single source of truth order — prefer NEXT_PUBLIC_GA_MEASUREMENT_ID, then legacy names.
 */
export function getPublicGaMeasurementId() {
  return (
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID ||
    process.env.NEXT_PUBLIC_GA_ID ||
    ''
  ).trim();
}
