import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';
import { rateLimiters, buildRateLimitKey } from '@/lib/rateLimit';
import { ObjectId } from 'mongodb';
import { getProductPublicPath } from '@/lib/stainlessSeoCategories';
import { apiDebugLog } from '@/lib/apiDebugLog';

// Report type labels
const REPORT_TYPES = {
  social_metadata_audit: {
    label: 'Social Metadata Audit',
    description: 'בדיקת Open Graph tags, Twitter Cards ותאימות מטא-דאטה',
    icon: '[TAG]',
  },
  social_preview_shareability: {
    label: 'Social Preview & Shareability Report',
    description: 'תצוגת Preview משוערת לפלטפורמות חברתיות',
    icon: '[PREVIEW]',
  },
  social_crawlability_discovery: {
    label: 'Social Crawlability & Fast Discovery Report',
    description: 'בדיקת יכולת סריקה וגילוי מהיר',
    icon: '[SEARCH]',
  },
};

/**
 * GET /api/admin/social-audit
 * Get social audit reports history
 */
async function GETHandler(req) {
  try {
    const admin = await requireAdminApi(req);
    const { searchParams } = new URL(req.url);
    
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const reportType = searchParams.get('type');
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');

    const db = await getDb();
    const reportsCol = db.collection('social_reports');

    const query = {};
    if (reportType) query.reportType = reportType;
    if (status) query.status = status;
    if (platform) query['issues.platform'] = platform;

    const [reports, total] = await Promise.all([
      reportsCol.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .project({ 
          issues: { $slice: 5 }, // Only return first 5 issues in list view
          pagesMetadata: 0,
          previewData: 0,
          crawlData: 0,
        })
        .toArray(),
      reportsCol.countDocuments(query),
    ]);

    // Get aggregate stats
    const stats = await reportsCol.aggregate([
      {
        $group: {
          _id: null,
          totalReports: { $sum: 1 },
          passCount: { $sum: { $cond: [{ $eq: ['$status', 'PASS'] }, 1, 0] } },
          warnCount: { $sum: { $cond: [{ $eq: ['$status', 'WARN'] }, 1, 0] } },
          failCount: { $sum: { $cond: [{ $eq: ['$status', 'FAIL'] }, 1, 0] } },
          avgScore: { $avg: '$score' },
          totalCritical: { $sum: '$summary.criticalIssues' },
          totalWarnings: { $sum: '$summary.warningIssues' },
        },
      },
    ]).toArray();

    return NextResponse.json({
      ok: true,
      reports,
      stats: stats[0] || {},
      reportTypes: REPORT_TYPES,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });

  } catch (err) {
    console.error('GET_SOCIAL_REPORTS_ERROR:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/social-audit
 * Run a social audit scan
 */
async function POSTHandler(req) {
  try {
    const admin = await requireAdminApi(req);
    const identifier = buildRateLimitKey(req, admin.id);
    const rateLimit = rateLimiters.admin(req, identifier);

    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const { 
      action = 'scan', 
      reportTypes = ['social_metadata_audit', 'social_preview_shareability', 'social_crawlability_discovery'],
      scanId = null,
      baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    } = body;

    if (action !== 'scan') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const db = await getDb();
    const reportsCol = db.collection('social_reports');
    const auditCol = db.collection('auditlogs');

    const now = new Date();
    const generatedReports = [];

    // Get pages to scan (from sitemap or predefined list)
    const pagesToScan = await getPagesToScan(baseUrl);

    // Generate each requested report type
    for (const reportType of reportTypes) {
      if (!REPORT_TYPES[reportType]) continue;

      const reportId = generateReportId(reportType);
      let report;

      switch (reportType) {
        case 'social_metadata_audit':
          report = await generateMetadataAuditReport(pagesToScan, baseUrl, admin, reportId, scanId);
          break;
        case 'social_preview_shareability':
          report = await generatePreviewShareabilityReport(pagesToScan, baseUrl, admin, reportId, scanId);
          break;
        case 'social_crawlability_discovery':
          report = await generateCrawlabilityReport(pagesToScan, baseUrl, admin, reportId, scanId);
          break;
      }

      if (report) {
        await reportsCol.insertOne(report);
        generatedReports.push({
          reportId: report.reportId,
          reportType,
          status: report.status,
          score: report.score,
          issuesCount: report.summary.totalIssues,
        });
      }
    }

    // Log audit event
    await logAudit(auditCol, 'social_audit_scan', admin, { 
      reportsGenerated: generatedReports.length,
      reportTypes,
    });

    // Calculate overall social readiness
    const isSocialReady = generatedReports.every(r => r.status === 'PASS');
    const overallStatus = generatedReports.some(r => r.status === 'FAIL') ? 'FAIL' :
                          generatedReports.some(r => r.status === 'WARN') ? 'WARN' : 'PASS';

    return NextResponse.json({
      ok: true,
      isSocialReady,
      overallStatus,
      reportsGenerated: generatedReports.length,
      reports: generatedReports,
      scannedPages: pagesToScan.length,
    });

  } catch (err) {
    console.error('SOCIAL_AUDIT_ERROR:', err);
    return NextResponse.json({ error: 'Scan failed', details: err.message }, { status: 500 });
  }
}

// Helper functions

function generateReportId(type) {
  const prefix = type.split('_').map(w => w[0].toUpperCase()).join('');
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 6);
  return `${prefix}-${ts}-${rand}`.toUpperCase();
}

async function logAudit(col, action, admin, details) {
  try {
    await col.insertOne({
      action,
      category: 'social_audit',
      actorId: new ObjectId(admin.id),
      actorName: admin.fullName || admin.email,
      details,
      ip: '',
      createdAt: new Date(),
    });
  } catch (e) {
    console.error('Audit log failed:', e);
  }
}

async function getPagesToScan(baseUrl) {
  // Define important pages to scan
  const pages = [
    '/',
    '/products',
    '/about',
    '/contact',
    '/login',
    '/register',
  ];

  // Try to get product pages
  try {
    const res = await fetch(`${baseUrl}/api/products?limit=10`);
    if (res.ok) {
      const data = await res.json();
      if (data.products) {
        data.products.forEach(p => {
          pages.push(getProductPublicPath(p));
        });
      }
    }
  } catch (e) {
    apiDebugLog('Could not fetch products for social audit');
  }

  return pages.map(path => `${baseUrl}${path}`);
}

// Report 1: Social Metadata Audit
async function generateMetadataAuditReport(pages, baseUrl, admin, reportId, scanId) {
  const now = new Date();
  const issues = [];
  const pagesMetadata = [];
  let passedChecks = 0;
  let failedChecks = 0;

  for (const pageUrl of pages) {
    try {
      const pageData = await analyzePageMetadata(pageUrl);
      pagesMetadata.push(pageData);

      // Check Open Graph tags
      const ogChecks = [
        { tag: 'og:title', value: pageData.og_title, required: true },
        { tag: 'og:description', value: pageData.og_description, required: true },
        { tag: 'og:image', value: pageData.og_image, required: true },
        { tag: 'og:url', value: pageData.og_url, required: true },
        { tag: 'og:type', value: pageData.og_type, required: false },
      ];

      for (const check of ogChecks) {
        if (!check.value && check.required) {
          failedChecks++;
          issues.push({
            page_url: pageUrl,
            issue_type: 'missing_tag',
            tag_type: 'og',
            severity: 'critical',
            detected_value: null,
            expected_value: check.tag,
            issue_description: `חסר תג ${check.tag}`,
            recommended_fix: `הוסף <meta property="${check.tag}" content="..." /> לעמוד`,
          });
        } else if (check.value) {
          passedChecks++;
        }
      }

      // Check Twitter Cards
      const twitterChecks = [
        { tag: 'twitter:card', value: pageData.twitter_card, required: true },
        { tag: 'twitter:title', value: pageData.twitter_title, required: true },
        { tag: 'twitter:description', value: pageData.twitter_description, required: true },
        { tag: 'twitter:image', value: pageData.twitter_image, required: true },
      ];

      for (const check of twitterChecks) {
        if (!check.value && check.required) {
          failedChecks++;
          issues.push({
            page_url: pageUrl,
            issue_type: 'missing_tag',
            tag_type: 'twitter',
            severity: 'warning',
            detected_value: null,
            expected_value: check.tag,
            issue_description: `חסר תג ${check.tag}`,
            recommended_fix: `הוסף <meta name="${check.tag}" content="..." /> לעמוד`,
          });
        } else if (check.value) {
          passedChecks++;
        }
      }

      // Check consistency between title/meta and og/twitter
      if (pageData.title && pageData.og_title && pageData.title !== pageData.og_title) {
        issues.push({
          page_url: pageUrl,
          issue_type: 'inconsistency',
          tag_type: 'og',
          severity: 'warning',
          detected_value: `title: "${pageData.title}" vs og:title: "${pageData.og_title}"`,
          expected_value: 'התאמה בין title ו-og:title',
          issue_description: 'חוסר התאמה בין title ל-og:title',
          recommended_fix: 'ודא שה-title וה-og:title זהים או דומים',
        });
      }

      // Check image if exists
      if (pageData.og_image) {
        const imageCheck = await validateImage(pageData.og_image);
        if (!imageCheck.valid) {
          failedChecks++;
          issues.push({
            page_url: pageUrl,
            issue_type: 'invalid_image',
            tag_type: 'og',
            severity: imageCheck.status === 404 ? 'critical' : 'warning',
            detected_value: `Status: ${imageCheck.status}, Size: ${imageCheck.size}KB`,
            expected_value: '1200x630px, < 8MB, HTTP 200',
            issue_description: imageCheck.issue,
            recommended_fix: imageCheck.fix,
          });
        } else {
          passedChecks++;
          pageData.image_valid = true;
          pageData.image_dimensions = imageCheck.dimensions;
          pageData.image_size_kb = imageCheck.size;
          pageData.image_status = 200;
        }
      }

    } catch (err) {
      issues.push({
        page_url: pageUrl,
        issue_type: 'fetch_error',
        severity: 'critical',
        issue_description: `לא ניתן לגשת לעמוד: ${err.message}`,
        recommended_fix: 'ודא שהעמוד נגיש ומגיב',
      });
      failedChecks++;
    }
  }

  // Calculate status
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const status = criticalCount > 0 ? 'FAIL' : warningCount > 0 ? 'WARN' : 'PASS';
  const score = Math.round((passedChecks / (passedChecks + failedChecks)) * 100) || 0;

  return {
    reportId,
    scanId,
    reportType: 'social_metadata_audit',
    title: 'Social Metadata Audit Report',
    description: 'בדיקת Open Graph tags, Twitter Cards ותאימות מטא-דאטה לכל עמודי האתר',
    status,
    score,
    isSocialReady: status === 'PASS',
    summary: {
      totalPages: pages.length,
      pagesChecked: pagesMetadata.length,
      totalIssues: issues.length,
      criticalIssues: criticalCount,
      warningIssues: warningCount,
      infoIssues: issues.filter(i => i.severity === 'info').length,
      passedChecks,
      failedChecks,
    },
    issues,
    pagesMetadata,
    generatedBy: new ObjectId(admin.id),
    generatedByName: admin.fullName || admin.email,
    trigger: scanId ? 'full_scan' : 'manual',
    createdAt: now,
    updatedAt: now,
  };
}

// Report 2: Social Preview & Shareability Report
async function generatePreviewShareabilityReport(pages, baseUrl, admin, reportId, scanId) {
  const now = new Date();
  const issues = [];
  const previewData = [];
  let passedChecks = 0;
  let failedChecks = 0;

  const platforms = ['facebook', 'whatsapp', 'linkedin', 'twitter'];
  const platformSummary = {};

  for (const platform of platforms) {
    platformSummary[platform] = { status: 'PASS', issues: 0 };
  }

  for (const pageUrl of pages) {
    try {
      const metadata = await analyzePageMetadata(pageUrl);

      for (const platform of platforms) {
        const preview = simulatePreview(metadata, platform, pageUrl);
        previewData.push({
          url: pageUrl,
          platform,
          ...preview,
        });

        if (preview.preview_status === 'broken') {
          failedChecks++;
          platformSummary[platform].issues++;
          platformSummary[platform].status = 'FAIL';
          
          issues.push({
            page_url: pageUrl,
            platform,
            preview_status: 'broken',
            severity: 'critical',
            issue_description: `תצוגת Preview שבורה ב-${platform}`,
            recommended_fix: preview.issues.join('; '),
          });
        } else if (preview.preview_status === 'partial') {
          passedChecks++;
          platformSummary[platform].issues++;
          if (platformSummary[platform].status !== 'FAIL') {
            platformSummary[platform].status = 'WARN';
          }
          
          issues.push({
            page_url: pageUrl,
            platform,
            preview_status: 'partial',
            severity: 'warning',
            issue_description: `תצוגת Preview חלקית ב-${platform}`,
            recommended_fix: preview.issues.join('; '),
          });
        } else {
          passedChecks++;
        }
      }

      // Check for cache issues
      if (!metadata.og_url) {
        issues.push({
          page_url: pageUrl,
          platform: 'all',
          severity: 'warning',
          issue_description: 'חסר og:url - עלול לגרום לבעיות cache',
          recommended_fix: 'הוסף og:url עם הכתובת הקנונית של העמוד',
        });
      }

    } catch (err) {
      for (const platform of platforms) {
        platformSummary[platform].issues++;
        platformSummary[platform].status = 'FAIL';
      }
      issues.push({
        page_url: pageUrl,
        platform: 'all',
        severity: 'critical',
        issue_description: `שגיאת גישה לעמוד: ${err.message}`,
        recommended_fix: 'ודא שהעמוד נגיש',
      });
      failedChecks++;
    }
  }

  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const status = criticalCount > 0 ? 'FAIL' : warningCount > 0 ? 'WARN' : 'PASS';
  const score = Math.round((passedChecks / (passedChecks + failedChecks)) * 100) || 0;

  return {
    reportId,
    scanId,
    reportType: 'social_preview_shareability',
    title: 'Social Preview & Shareability Report',
    description: 'בדיקת תצוגת Preview בפלטפורמות חברתיות שונות',
    status,
    score,
    isSocialReady: status === 'PASS',
    summary: {
      totalPages: pages.length,
      pagesChecked: pages.length,
      totalIssues: issues.length,
      criticalIssues: criticalCount,
      warningIssues: warningCount,
      infoIssues: 0,
      passedChecks,
      failedChecks,
    },
    issues,
    previewData,
    platformSummary,
    generatedBy: new ObjectId(admin.id),
    generatedByName: admin.fullName || admin.email,
    trigger: scanId ? 'full_scan' : 'manual',
    createdAt: now,
    updatedAt: now,
  };
}

// Report 3: Social Crawlability & Fast Discovery Report
async function generateCrawlabilityReport(pages, baseUrl, admin, reportId, scanId) {
  const now = new Date();
  const issues = [];
  const crawlData = [];
  let passedChecks = 0;
  let failedChecks = 0;

  // Check sitemap availability
  let sitemapAvailable = false;
  try {
    const sitemapRes = await fetch(`${baseUrl}/sitemap.xml`, { method: 'HEAD' });
    sitemapAvailable = sitemapRes.ok;
    if (!sitemapAvailable) {
      issues.push({
        page_url: `${baseUrl}/sitemap.xml`,
        issue_type: 'crawl',
        severity: 'warning',
        detected_value: `HTTP ${sitemapRes.status}`,
        expected_value: 'HTTP 200',
        issue_description: 'Sitemap לא זמין',
        technical_fix_hint: 'צור קובץ sitemap.xml בתיקיית public או השתמש ב-next-sitemap',
      });
      failedChecks++;
    } else {
      passedChecks++;
    }
  } catch (e) {
    issues.push({
      page_url: `${baseUrl}/sitemap.xml`,
      issue_type: 'crawl',
      severity: 'warning',
      issue_description: 'לא ניתן לבדוק sitemap',
      technical_fix_hint: 'צור קובץ sitemap.xml',
    });
  }

  // Check robots.txt
  let robotsContent = '';
  try {
    const robotsRes = await fetch(`${baseUrl}/robots.txt`);
    if (robotsRes.ok) {
      robotsContent = await robotsRes.text();
      passedChecks++;
      
      // Check if robots blocks social crawlers
      if (robotsContent.includes('Disallow: /') && !robotsContent.includes('Allow:')) {
        issues.push({
          page_url: `${baseUrl}/robots.txt`,
          issue_type: 'crawl',
          severity: 'critical',
          detected_value: 'Disallow: /',
          expected_value: 'Allow access to pages',
          issue_description: 'robots.txt חוסם את כל הסורקים',
          technical_fix_hint: 'עדכן robots.txt לאפשר גישה לסורקי רשתות חברתיות',
        });
        failedChecks++;
      }
    } else {
      issues.push({
        page_url: `${baseUrl}/robots.txt`,
        issue_type: 'crawl',
        severity: 'info',
        issue_description: 'robots.txt לא קיים (לא חובה אבל מומלץ)',
        technical_fix_hint: 'צור קובץ robots.txt עם הגדרות מתאימות',
      });
    }
  } catch (e) {
    // robots.txt is optional
  }

  // Calculate share depth and check each page
  for (let i = 0; i < pages.length; i++) {
    const pageUrl = pages[i];
    try {
      const response = await fetch(pageUrl, { 
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SocialBot/1.0)' },
        redirect: 'manual',
      });

      const pageData = {
        url: pageUrl,
        http_status: response.status,
        cache_control: response.headers.get('cache-control') || 'not set',
        content_type: response.headers.get('content-type') || 'unknown',
        redirect_chain: [],
        is_indexable: true,
        in_sitemap: sitemapAvailable, // Simplified check
        share_depth: i === 0 ? 0 : 1, // Simplified depth calculation
        is_orphan: false,
        issues: [],
      };

      // Check HTTP status
      if (response.status >= 400) {
        failedChecks++;
        pageData.issues.push(`HTTP ${response.status}`);
        issues.push({
          page_url: pageUrl,
          issue_type: 'headers',
          severity: 'critical',
          detected_value: `HTTP ${response.status}`,
          expected_value: 'HTTP 200',
          issue_description: `העמוד מחזיר שגיאה ${response.status}`,
          technical_fix_hint: 'תקן את הנתיב או הסר קישורים לעמוד',
        });
      } else if (response.status >= 300) {
        // Redirect
        const location = response.headers.get('location');
        pageData.redirect_chain.push(location);
        
        if (response.status === 301 || response.status === 302) {
          passedChecks++;
          issues.push({
            page_url: pageUrl,
            issue_type: 'redirect',
            severity: 'info',
            detected_value: `${response.status} -> ${location}`,
            expected_value: 'Direct access preferred',
            issue_description: 'העמוד מפנה לכתובת אחרת',
            technical_fix_hint: 'עדכן קישורים פנימיים לכתובת הסופית',
          });
        }
      } else {
        passedChecks++;
      }

      // Check meta robots if we got HTML
      if (response.status === 200) {
        const html = await response.text();
        
        // Check for noindex
        if (html.includes('noindex')) {
          pageData.is_indexable = false;
          issues.push({
            page_url: pageUrl,
            issue_type: 'crawl',
            severity: 'warning',
            detected_value: 'noindex',
            expected_value: 'index',
            issue_description: 'העמוד מסומן כ-noindex - לא יופיע בחיפוש',
            technical_fix_hint: 'הסר noindex אם רוצים שהעמוד יהיה גלוי',
          });
        }

        // Check for nofollow
        if (html.includes('nofollow') && i === 0) {
          issues.push({
            page_url: pageUrl,
            issue_type: 'crawl',
            severity: 'info',
            detected_value: 'nofollow',
            issue_description: 'nofollow בדף הבית עלול להגביל גילוי עמודים פנימיים',
            technical_fix_hint: 'שקול להסיר nofollow מדף הבית',
          });
        }
      }

      crawlData.push(pageData);

    } catch (err) {
      failedChecks++;
      crawlData.push({
        url: pageUrl,
        http_status: 0,
        issues: ['Connection failed'],
        is_orphan: true,
      });
      issues.push({
        page_url: pageUrl,
        issue_type: 'crawl',
        severity: 'critical',
        issue_description: `שגיאת חיבור: ${err.message}`,
        technical_fix_hint: 'ודא שהשרת פעיל ונגיש',
      });
    }
  }

  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;
  const status = criticalCount > 0 ? 'FAIL' : warningCount > 0 ? 'WARN' : 'PASS';
  const score = Math.round((passedChecks / (passedChecks + failedChecks)) * 100) || 0;

  return {
    reportId,
    scanId,
    reportType: 'social_crawlability_discovery',
    title: 'Social Crawlability & Fast Discovery Report',
    description: 'בדיקת יכולת סריקה, HTTP headers, redirects וזמינות sitemap',
    status,
    score,
    isSocialReady: status === 'PASS',
    summary: {
      totalPages: pages.length,
      pagesChecked: crawlData.length,
      totalIssues: issues.length,
      criticalIssues: criticalCount,
      warningIssues: warningCount,
      infoIssues: infoCount,
      passedChecks,
      failedChecks,
    },
    issues,
    crawlData,
    generatedBy: new ObjectId(admin.id),
    generatedByName: admin.fullName || admin.email,
    trigger: scanId ? 'full_scan' : 'manual',
    createdAt: now,
    updatedAt: now,
  };
}

// Helper: Analyze page metadata
async function analyzePageMetadata(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SocialBot/1.0)' },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();
  
  const getMetaContent = (property, name) => {
    // Try property first (for OG tags)
    let match = html.match(new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'));
    if (!match) {
      match = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'));
    }
    // Try name (for Twitter and standard meta)
    if (!match && name) {
      match = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'));
      if (!match) {
        match = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'));
      }
    }
    return match ? match[1] : null;
  };

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);

  return {
    url,
    title: titleMatch ? titleMatch[1].trim() : null,
    meta_description: getMetaContent('description', 'description'),
    og_title: getMetaContent('og:title'),
    og_description: getMetaContent('og:description'),
    og_image: getMetaContent('og:image'),
    og_url: getMetaContent('og:url'),
    og_type: getMetaContent('og:type'),
    twitter_card: getMetaContent('twitter:card', 'twitter:card'),
    twitter_title: getMetaContent('twitter:title', 'twitter:title'),
    twitter_description: getMetaContent('twitter:description', 'twitter:description'),
    twitter_image: getMetaContent('twitter:image', 'twitter:image'),
  };
}

// Helper: Validate OG image
async function validateImage(imageSrc) {
  try {
    const response = await fetch(imageSrc, { method: 'HEAD' });
    
    if (!response.ok) {
      return {
        valid: false,
        status: response.status,
        issue: `תמונה לא נגישה (HTTP ${response.status})`,
        fix: 'ודא שכתובת התמונה תקינה ונגישה',
      };
    }

    const contentType = response.headers.get('content-type') || '';
    const contentLength = parseInt(response.headers.get('content-length') || '0');
    const sizeKB = Math.round(contentLength / 1024);

    if (!contentType.includes('image')) {
      return {
        valid: false,
        status: 200,
        size: sizeKB,
        issue: `פורמט לא תקין: ${contentType}`,
        fix: 'השתמש בפורמט תמונה תקני (jpg, png, webp)',
      };
    }

    if (contentLength > 8 * 1024 * 1024) {
      return {
        valid: false,
        status: 200,
        size: sizeKB,
        issue: `תמונה גדולה מדי (${sizeKB}KB)`,
        fix: 'הקטן את התמונה ל-8MB מקסימום, מומלץ פחות מ-1MB',
      };
    }

    return {
      valid: true,
      status: 200,
      size: sizeKB,
      format: contentType,
      dimensions: '1200x630', // Would need actual image parsing to verify
    };

  } catch (err) {
    return {
      valid: false,
      status: 0,
      issue: `שגיאת חיבור לתמונה: ${err.message}`,
      fix: 'ודא שהתמונה נגישה מהאינטרנט',
    };
  }
}

// Helper: Simulate platform preview
function simulatePreview(metadata, platform, pageUrl) {
  const result = {
    preview_status: 'ok',
    preview_title: null,
    preview_description: null,
    preview_image: null,
    cache_status: 'fresh',
    issues: [],
  };

  // Get title
  if (platform === 'twitter' && metadata.twitter_title) {
    result.preview_title = metadata.twitter_title;
  } else if (metadata.og_title) {
    result.preview_title = metadata.og_title;
  } else if (metadata.title) {
    result.preview_title = metadata.title;
    result.issues.push('משתמש ב-title כי חסר og:title');
    result.preview_status = 'partial';
  } else {
    result.issues.push('חסר כותרת לתצוגה');
    result.preview_status = 'broken';
  }

  // Get description
  if (platform === 'twitter' && metadata.twitter_description) {
    result.preview_description = metadata.twitter_description;
  } else if (metadata.og_description) {
    result.preview_description = metadata.og_description;
  } else if (metadata.meta_description) {
    result.preview_description = metadata.meta_description;
    result.issues.push('משתמש ב-meta description כי חסר og:description');
    if (result.preview_status === 'ok') result.preview_status = 'partial';
  } else {
    result.issues.push('חסר תיאור לתצוגה');
    if (result.preview_status === 'ok') result.preview_status = 'partial';
  }

  // Get image
  if (platform === 'twitter' && metadata.twitter_image) {
    result.preview_image = metadata.twitter_image;
  } else if (metadata.og_image) {
    result.preview_image = metadata.og_image;
  } else {
    result.issues.push('חסרה תמונה לתצוגה');
    result.preview_status = 'broken';
  }

  // Check for generic/placeholder content
  if (result.preview_title && (
    result.preview_title.toLowerCase().includes('untitled') ||
    result.preview_title.toLowerCase().includes('home') ||
    result.preview_title.length < 10
  )) {
    result.issues.push('כותרת גנרית או קצרה מדי');
    if (result.preview_status === 'ok') result.preview_status = 'partial';
  }

  if (result.preview_description && result.preview_description.length < 50) {
    result.issues.push('תיאור קצר מדי (מומלץ 100-160 תווים)');
    if (result.preview_status === 'ok') result.preview_status = 'partial';
  }

  return result;
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
