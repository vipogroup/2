import { getDb } from '@/lib/db';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.vipo-group.com').trim();

async function getTenantBySlug(slug) {
  if (!slug || typeof slug !== 'string') return null;

  try {
    const db = await getDb();
    if (!db) return null;

    const tenant = await db.collection('tenants').findOne(
      { slug: slug.toLowerCase() },
      {
        projection: {
          name: 1,
          slug: 1,
          description: 1,
          branding: 1,
          contact: 1,
          status: 1,
        },
      },
    );

    return tenant;
  } catch (error) {
    console.error('Tenant metadata lookup failed:', error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;
  const tenant = await getTenantBySlug(slug);
  const status = String(tenant?.status || '').toLowerCase();
  const isIndexable = Boolean(tenant) && !['inactive', 'suspended', 'disabled', 'archived'].includes(status);

  const canonicalUrl = `${SITE_URL}/t/${slug}`;
  const tenantName = tenant?.name || `חנות ${slug}`;
  const rawDescription =
    tenant?.description ||
    tenant?.branding?.tagline ||
    tenant?.contact?.about ||
    `צפו במוצרים של ${tenantName} ב-VIPO`;
  const description = String(rawDescription).slice(0, 160);
  const baseTitle = `${tenantName} | VIPO`;
  const title = baseTitle.length >= 45
    ? baseTitle
    : `${tenantName} | חנות נירוסטה מקצועית ב-VIPO`;

  return {
    title,
    description,
    robots: {
      index: isIndexable,
      follow: true,
    },
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
      locale: 'he_IL',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function TenantLayout({ children, params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;
  const tenant = await getTenantBySlug(slug);
  const tenantName = tenant?.name || `חנות ${slug}`;
  const tenantUrl = `${SITE_URL}/t/${slug}`;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'דף הבית',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: tenantName,
        item: tenantUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
