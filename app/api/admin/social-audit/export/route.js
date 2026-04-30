import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';
import { ObjectId } from 'mongodb';

/**
 * GET /api/admin/social-audit/export
 * Export a social audit report in various formats
 */
async function GETHandler(req) {
  try {
    const admin = await requireAdminApi(req);
    const { searchParams } = new URL(req.url);
    
    const reportId = searchParams.get('reportId');
    const format = searchParams.get('format') || 'json';

    if (!reportId) {
      return NextResponse.json({ error: 'reportId is required' }, { status: 400 });
    }

    const db = await getDb();
    const reportsCol = db.collection('social_reports');

    let report = await reportsCol.findOne({ reportId });
    if (!report && ObjectId.isValid(reportId)) {
      report = await reportsCol.findOne({ _id: new ObjectId(reportId) });
    }

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Track export
    await reportsCol.updateOne(
      { _id: report._id },
      {
        $push: {
          exports: {
            format,
            exportedAt: new Date(),
            exportedBy: new ObjectId(admin.id),
          },
        },
      }
    );

    const filename = `VIPO_Social_${report.reportType}_${new Date(report.createdAt).toISOString().split('T')[0]}`;

    switch (format) {
      case 'json':
        return new NextResponse(JSON.stringify(report, null, 2), {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}.json"`,
          },
        });

      case 'html':
        const html = generateHtmlReport(report);
        return new NextResponse(html, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}.html"`,
          },
        });

      case 'md':
        const md = generateMarkdownReport(report);
        return new NextResponse(md, {
          headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}.md"`,
          },
        });

      default:
        return NextResponse.json({ error: 'Invalid format. Use: json, html, md' }, { status: 400 });
    }

  } catch (err) {
    console.error('EXPORT_SOCIAL_REPORT_ERROR:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Generate HTML report
function generateHtmlReport(report) {
  const statusColor = report.status === 'PASS' ? '#22c55e' : report.status === 'WARN' ? '#eab308' : '#ef4444';
  const statusIcon = report.status === 'PASS' ? '[OK]' : report.status === 'WARN' ? '[WARN]' : '[X]';

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; padding: 20px; line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%); color: white; padding: 30px; }
    .header h1 { font-size: 24px; margin-bottom: 10px; }
    .header p { opacity: 0.9; font-size: 14px; }
    .status-badge { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 20px; font-weight: bold; background: rgba(255,255,255,0.2); margin-top: 15px; }
    .content { padding: 30px; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px; }
    .summary-card { background: #f8fafc; border-radius: 8px; padding: 20px; text-align: center; }
    .summary-card .value { font-size: 28px; font-weight: bold; color: #1e3a8a; }
    .summary-card .label { font-size: 12px; color: #64748b; margin-top: 5px; }
    .section { margin-bottom: 30px; }
    .section h2 { font-size: 18px; color: #1e3a8a; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0; }
    .issues-list { list-style: none; }
    .issue-item { padding: 15px; margin-bottom: 10px; border-radius: 8px; border-right: 4px solid; }
    .issue-critical { background: #fef2f2; border-color: #ef4444; }
    .issue-warning { background: #fffbeb; border-color: #f59e0b; }
    .issue-info { background: #eff6ff; border-color: #3b82f6; }
    .issue-page { font-family: monospace; font-size: 12px; color: #64748b; margin-bottom: 5px; word-break: break-all; }
    .issue-desc { font-weight: 500; color: #1f2937; }
    .issue-fix { font-size: 13px; color: #059669; margin-top: 8px; padding: 8px; background: rgba(5, 150, 105, 0.1); border-radius: 4px; }
    .platform-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
    .platform-card { background: #f8fafc; border-radius: 8px; padding: 15px; text-align: center; }
    .platform-card.pass { border: 2px solid #22c55e; }
    .platform-card.warn { border: 2px solid #f59e0b; }
    .platform-card.fail { border: 2px solid #ef4444; }
    .footer { padding: 20px 30px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0; }
    th { background: #f8fafc; font-weight: 600; color: #475569; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }
    .badge-critical { background: #fef2f2; color: #dc2626; }
    .badge-warning { background: #fffbeb; color: #d97706; }
    .badge-info { background: #eff6ff; color: #2563eb; }
    .score-circle { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: white; margin: 0 auto; }
    @media print { body { background: white; } .container { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${report.title}</h1>
      <p>${report.description}</p>
      <div class="status-badge">
        <span>${statusIcon}</span>
        <span>Status: ${report.status}</span>
        <span>|</span>
        <span>Score: ${report.score}%</span>
        <span>|</span>
        <span>${report.isSocialReady ? '[OK] Social Ready' : '[X] Not Social Ready'}</span>
      </div>
    </div>

    <div class="content">
      <!-- Summary -->
      <div class="summary-grid">
        <div class="summary-card">
          <div class="value">${report.summary?.totalPages || 0}</div>
          <div class="label">עמודים נבדקו</div>
        </div>
        <div class="summary-card">
          <div class="value" style="color: #ef4444">${report.summary?.criticalIssues || 0}</div>
          <div class="label">בעיות קריטיות</div>
        </div>
        <div class="summary-card">
          <div class="value" style="color: #f59e0b">${report.summary?.warningIssues || 0}</div>
          <div class="label">אזהרות</div>
        </div>
        <div class="summary-card">
          <div class="value" style="color: #22c55e">${report.summary?.passedChecks || 0}</div>
          <div class="label">בדיקות עברו</div>
        </div>
        <div class="summary-card">
          <div class="score-circle" style="background: ${statusColor}">${report.score}%</div>
          <div class="label">ציון כללי</div>
        </div>
      </div>

      ${report.platformSummary ? `
      <!-- Platform Summary -->
      <div class="section">
        <h2>סיכום לפי פלטפורמה</h2>
        <div class="platform-grid">
          ${Object.entries(report.platformSummary).map(([platform, data]) => `
            <div class="platform-card ${data.status?.toLowerCase() || 'pass'}">
              <div style="font-size: 24px; margin-bottom: 8px;">${getPlatformIcon(platform)}</div>
              <div style="font-weight: 600; text-transform: capitalize;">${platform}</div>
              <div style="font-size: 12px; color: #64748b;">${data.issues || 0} בעיות</div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <!-- Issues -->
      ${report.issues && report.issues.length > 0 ? `
      <div class="section">
        <h2>לוג שגיאות (${report.issues.length})</h2>
        <ul class="issues-list">
          ${report.issues.map(issue => `
            <li class="issue-item issue-${issue.severity}">
              <div class="issue-page">${issue.page_url}</div>
              <div class="issue-desc">
                <span class="badge badge-${issue.severity}">${issue.severity}</span>
                ${issue.tag_type ? `<span class="badge" style="background:#e2e8f0;color:#475569">${issue.tag_type}</span>` : ''}
                ${issue.platform ? `<span class="badge" style="background:#e2e8f0;color:#475569">${issue.platform}</span>` : ''}
                ${issue.issue_description || issue.issue_type || 'Unknown issue'}
              </div>
              ${issue.recommended_fix ? `<div class="issue-fix">[TIP] ${issue.recommended_fix}</div>` : ''}
              ${issue.technical_fix_hint ? `<div class="issue-fix">[FIX] ${issue.technical_fix_hint}</div>` : ''}
            </li>
          `).join('')}
        </ul>
      </div>
      ` : '<div class="section"><h2>[OK] לא נמצאו בעיות</h2><p>כל הבדיקות עברו בהצלחה!</p></div>'}
    </div>

    <div class="footer">
      <p>דוח נוצר ב-${new Date(report.createdAt).toLocaleString('he-IL')} | VIPO System Reports</p>
      <p>Report ID: ${report.reportId}</p>
    </div>
  </div>
</body>
</html>`;
}

function getPlatformIcon(platform) {
  const icons = {
    facebook: '📘',
    whatsapp: '[CHAT]',
    linkedin: '[WORK]',
    twitter: '🐦',
  };
  return icons[platform] || '[WEB]';
}

// Generate Markdown report
function generateMarkdownReport(report) {
  const statusEmoji = report.status === 'PASS' ? '[OK]' : report.status === 'WARN' ? '[WARN]' : '[X]';
  
  let md = `# ${report.title}

${statusEmoji} **Status:** ${report.status} | **Score:** ${report.score}% | ${report.isSocialReady ? '[OK] Social Ready' : '[X] Not Social Ready'}

${report.description}

---

## [STATS] Summary

| Metric | Value |
|--------|-------|
| Total Pages | ${report.summary?.totalPages || 0} |
| Pages Checked | ${report.summary?.pagesChecked || 0} |
| Critical Issues | ${report.summary?.criticalIssues || 0} |
| Warnings | ${report.summary?.warningIssues || 0} |
| Info | ${report.summary?.infoIssues || 0} |
| Passed Checks | ${report.summary?.passedChecks || 0} |
| Failed Checks | ${report.summary?.failedChecks || 0} |

`;

  // Platform Summary
  if (report.platformSummary) {
    md += `## [WEB] Platform Summary

| Platform | Status | Issues |
|----------|--------|--------|
`;
    for (const [platform, data] of Object.entries(report.platformSummary)) {
      md += `| ${platform} | ${data.status || 'PASS'} | ${data.issues || 0} |\n`;
    }
    md += '\n';
  }

  // Issues
  if (report.issues && report.issues.length > 0) {
    md += `## 🔴 Issues Log (${report.issues.length})

`;
    for (const issue of report.issues) {
      const severityEmoji = issue.severity === 'critical' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵';
      md += `### ${severityEmoji} ${issue.issue_description || issue.issue_type}

- **Page:** \`${issue.page_url}\`
- **Severity:** ${issue.severity}
`;
      if (issue.tag_type) md += `- **Tag Type:** ${issue.tag_type}\n`;
      if (issue.platform) md += `- **Platform:** ${issue.platform}\n`;
      if (issue.detected_value) md += `- **Detected:** ${issue.detected_value}\n`;
      if (issue.expected_value) md += `- **Expected:** ${issue.expected_value}\n`;
      if (issue.recommended_fix) md += `- **[TIP] Fix:** ${issue.recommended_fix}\n`;
      if (issue.technical_fix_hint) md += `- **[FIX] Technical:** ${issue.technical_fix_hint}\n`;
      md += '\n';
    }
  } else {
    md += `## [OK] No Issues Found

All checks passed successfully!

`;
  }

  md += `---

*Report generated at ${new Date(report.createdAt).toISOString()}*
*Report ID: ${report.reportId}*
*VIPO System Reports*
`;

  return md;
}

export const GET = withErrorLogging(GETHandler);
