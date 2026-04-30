'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useControlCenterTenant } from '../ControlCenterContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n) {
  if (n == null || isNaN(n)) return '-';
  return n.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function fmtILS(n) {
  if (n == null || isNaN(n) || n === 0) return '₪0';
  return '₪' + fmt(n);
}
function fmtPct(n) {
  if (n == null || isNaN(n)) return '-';
  return fmt(n) + '%';
}
function roasColor(v) {
  if (!v || v === 0) return '#6b7280';
  if (v >= 3) return '#16a34a';
  if (v >= 1.5) return '#d97706';
  return '#dc2626';
}
function statusLabel(s) {
  return { active: 'פעיל', paused: 'מושהה', ended: 'הסתיים', budget_exceeded: 'חרג מתקציב' }[s] || s;
}
function statusStyle(s) {
  if (s === 'active') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (s === 'paused') return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
}

const GOALS = [
  { id: 'purchases', label: 'מכירות / רכישות' },
  { id: 'clicks', label: 'קליקים לדף המוצר' },
  { id: 'impressions', label: 'חשיפות (brand awareness)' },
];
const PLACEMENTS = [
  { id: 'homepage', label: 'דף בית' },
  { id: 'category', label: 'ראש קטגוריה' },
  { id: 'search', label: 'תוצאות חיפוש' },
];

const EMPTY_FORM = {
  name: '',
  productId: '',
  productName: '',
  productImage: '',
  goal: 'purchases',
  placement: ['homepage'],
  dailyBudget: '',
  totalBudget: '',
  cpaStopThreshold: '',
  endDate: '',
};

export default function PaidPromotionTab({ user }) {
  const tenantCtx = useControlCenterTenant();
  const selectedTenantId = tenantCtx?.selectedTenantId || '';
  const isSuperAdmin = Boolean(tenantCtx?.isSuperAdmin);
  const selectedTenantLabel = tenantCtx?.selectedTenantLabel || '';

  const [kpi, setKpi] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('campaigns');
  const [dailyCap, setDailyCap] = useState('');
  const [monthlyCap, setMonthlyCap] = useState('');
  const [capsSaving, setCapsSaving] = useState(false);
  const [capsSuccess, setCapsSuccess] = useState(false);
  const formRef = useRef(null);

  const loadCampaigns = useCallback(async () => {
    try {
      let url = '/api/admin/paid-campaigns?status=all';
      if (isSuperAdmin && selectedTenantId) {
        url += `&tenantId=${encodeURIComponent(selectedTenantId)}`;
      }
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
        setKpi(data.kpi);
      }
    } catch (e) {
      console.error('Failed to load campaigns', e);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, selectedTenantId]);

  // Load current global caps on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/campaign-settings', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.dailyCap) setDailyCap(String(data.dailyCap));
          if (data.monthlyCap) setMonthlyCap(String(data.monthlyCap));
        }
      } catch (_) {}
    })();
  }, []);

  const saveBudgetCaps = async () => {
    setCapsSaving(true);
    setCapsSuccess(false);
    try {
      const res = await fetch('/api/admin/campaign-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          dailyCap: dailyCap ? Number(dailyCap) : null,
          monthlyCap: monthlyCap ? Number(monthlyCap) : null,
        }),
      });
      if (res.ok) {
        setCapsSuccess(true);
        setTimeout(() => setCapsSuccess(false), 3000);
      } else {
        alert('שגיאה בשמירת ההגדרות');
      }
    } catch { alert('שגיאת רשת'); }
    finally { setCapsSaving(false); }
  };

  const loadProducts = useCallback(async () => {
    try {
      let url = '/api/products?limit=200&includeInactive=true';
      if (isSuperAdmin) {
        if (selectedTenantId) {
          url += `&tenantId=${encodeURIComponent(selectedTenantId)}`;
        } else {
          url += '&marketplace=true';
        }
      } else if (user?.tenantId) {
        url += `&tenantId=${encodeURIComponent(user.tenantId)}`;
      }
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const raw = data.products || data.items || [];
        setProducts(
          raw.map((p) => ({
            ...p,
            images: Array.isArray(p.images)
              ? p.images.map((img) => (typeof img === 'string' ? img : img?.url)).filter(Boolean)
              : [],
          })),
        );
      }
    } catch (e) {
      console.error('Failed to load products', e);
    }
  }, [isSuperAdmin, selectedTenantId, user?.tenantId]);

  useEffect(() => {
    loadCampaigns();
    loadProducts();
  }, [loadCampaigns, loadProducts]);

  const campaignAction = async (campaignId, action) => {
    setSavingId(campaignId);
    try {
      const res = await fetch('/api/admin/paid-campaigns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ campaignId, action }),
      });
      if (res.ok) await loadCampaigns();
      else alert('שגיאה בעדכון הקמפיין');
    } catch { alert('שגיאת רשת'); }
    finally { setSavingId(null); }
  };

  const handleProductChange = (e) => {
    const productId = e.target.value;
    const product = products.find((p) => String(p._id) === productId);
    setForm((prev) => ({
      ...prev,
      productId,
      productName: product?.name || '',
      productImage: product?.images?.[0] || '',
    }));
  };

  const togglePlacement = (id) => {
    setForm((prev) => ({
      ...prev,
      placement: prev.placement.includes(id)
        ? prev.placement.filter((p) => p !== id)
        : [...prev.placement, id],
    }));
  };

  const submitCampaign = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.productId) return setFormError('יש לבחור מוצר');
    if (!form.name.trim()) return setFormError('יש להזין שם קמפיין');
    if (!form.dailyBudget || Number(form.dailyBudget) < 10) return setFormError('תקציב יומי מינימלי הוא ₪10');
    if (form.placement.length === 0) return setFormError('יש לבחור לפחות מיקום אחד');
    setFormSaving(true);
    try {
      const res = await fetch('/api/admin/paid-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...form,
          dailyBudget: Number(form.dailyBudget),
          totalBudget: form.totalBudget ? Number(form.totalBudget) : null,
          cpaStopThreshold: form.cpaStopThreshold ? Number(form.cpaStopThreshold) : null,
          ...(isSuperAdmin && selectedTenantId ? { tenantId: selectedTenantId } : {}),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowForm(false);
        setForm(EMPTY_FORM);
        await loadCampaigns();
      } else {
        setFormError(data.error || 'שגיאה ביצירת הקמפיין');
      }
    } catch { setFormError('שגיאת רשת'); }
    finally { setFormSaving(false); }
  };

  const kpiCards = [
    { label: 'קמפיינים פעילים', value: kpi?.activeCampaigns ?? 0, hint: 'מתוך ' + (kpi?.totalCampaigns ?? 0) + ' סה"כ', color: '#0891b2' },
    { label: 'Spend', value: fmtILS(kpi?.totalSpend), hint: 'סה"כ הוצאה', color: '#1e3a8a' },
    { label: 'Revenue', value: fmtILS(kpi?.totalRevenue), hint: 'הכנסה מיוחסת', color: '#16a34a' },
    { label: 'ROAS', value: kpi?.roas ? kpi.roas + 'x' : '-', hint: 'יחס החזר פרסום', color: roasColor(kpi?.roas) },
    { label: 'CPA', value: fmtILS(kpi?.cpa), hint: 'עלות לרכישה', color: '#7c3aed' },
    { label: 'CTR', value: fmtPct(kpi?.ctr), hint: 'אחוז הקלקה', color: '#d97706' },
  ];

  return (
    <div className="space-y-4" dir="rtl">
      <div className="rounded-xl overflow-hidden text-white" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0e7490 55%, #14b8a6 100%)' }}>
        <div className="px-5 py-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-extrabold">קידום ממומן למוצרים</h2>
            <p className="text-cyan-100 text-xs mt-1">ניהול קמפיינים לשוק ישראל • ILS • he-IL</p>
            {tenantCtx && (isSuperAdmin || user?.tenantId) && (
              <p className="text-cyan-200/90 text-[10px] mt-1.5 font-semibold">
                הקשר חנות: {isSuperAdmin ? selectedTenantLabel : `מזהה ${String(user?.tenantId || '').slice(-8)}`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: 'rgba(255,255,255,0.14)' }}>Geo: ישראל</span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: 'rgba(255,255,255,0.14)' }}>Currency: ILS</span>
            <button
              onClick={() => { setShowForm(true); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-90"
              style={{ background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.3)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              קמפיין חדש
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {kpiCards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-3 text-center">
            <div className="text-[10px] text-gray-500 font-semibold">{c.label}</div>
            <div className="text-base font-extrabold mt-0.5" style={{ color: c.color }}>{String(c.value)}</div>
            <div className="text-[10px] text-gray-400">{c.hint}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'campaigns', label: 'קמפיינים', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
          { id: 'settings', label: 'בקרת תקציב', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
          { id: 'guide', label: '📖 מדריך השימוש', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeSection === s.id ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
            style={activeSection === s.id ? { background: 'linear-gradient(135deg, #0f172a 0%, #0891b2 100%)' } : {}}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} />
            </svg>
            {s.label}
          </button>
        ))}
      </div>

      {activeSection === 'campaigns' && (
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-10 text-gray-400 text-xs">טוען קמפיינים...</div>
          ) : campaigns.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center">
              <div className="text-3xl mb-3">📣</div>
              <div className="text-sm font-bold text-gray-700">אין קמפיינים עדיין</div>
              <div className="text-xs text-gray-400 mt-1 mb-4">לחץ על &quot;קמפיין חדש&quot; כדי להתחיל לקדם מוצרים</div>
            </div>
          ) : (
            campaigns.map((c) => {
              const roas = c.spend > 0 ? Math.round((c.revenue / c.spend) * 10) / 10 : 0;
              const spendPct = c.totalBudget ? Math.min(100, Math.round((c.spend / c.totalBudget) * 100)) : null;
              return (
                <div key={c._id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-4 flex items-center gap-4">
                    {c.productImage && (
                      <Image
                        src={c.productImage}
                        alt={c.productName}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-lg object-cover border border-gray-100 flex-shrink-0"
                        unoptimized
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-800 truncate">{c.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusStyle(c.status)}`}>{statusLabel(c.status)}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">{GOALS.find((g) => g.id === c.goal)?.label || c.goal}</span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5 truncate">{c.productName}</div>
                      {spendPct !== null && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: `${spendPct}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-400">{spendPct}%</span>
                        </div>
                      )}
                    </div>
                    <div className="hidden md:grid grid-cols-4 gap-3 text-center flex-shrink-0">
                      {[
                        { l: 'Spend', v: fmtILS(c.spend) },
                        { l: 'Revenue', v: fmtILS(c.revenue) },
                        { l: 'ROAS', v: roas ? roas + 'x' : '-', color: roasColor(roas) },
                        { l: 'תקציב יומי', v: fmtILS(c.dailyBudget) },
                      ].map((m) => (
                        <div key={m.l}>
                          <div className="text-[10px] text-gray-400">{m.l}</div>
                          <div className="text-xs font-bold" style={{ color: m.color || '#1e3a8a' }}>{m.v}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {c.status === 'active' && (
                        <button onClick={() => campaignAction(c._id, 'pause')} disabled={savingId === c._id}
                          className="p-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all disabled:opacity-50" title="השהה">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
                        </button>
                      )}
                      {c.status === 'paused' && (
                        <button onClick={() => campaignAction(c._id, 'resume')} disabled={savingId === c._id}
                          className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all disabled:opacity-50" title="המשך">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        </button>
                      )}
                      {c.status !== 'ended' && (
                        <button onClick={() => { if (confirm('לסיים את הקמפיין?')) campaignAction(c._id, 'stop'); }} disabled={savingId === c._id}
                          className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all disabled:opacity-50" title="עצור">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeSection === 'settings' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3" style={{ borderBottom: '1px solid #f0f2f5' }}>
            <h3 className="text-sm font-bold text-gray-700">בקרת תקציב חכמה</h3>
            <p className="text-[11px] text-gray-400">הגנה אוטומטית על תקציב הפרסום</p>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">תקרת הוצאה יומית (₪)</label>
                <input type="number" min="0" value={dailyCap} onChange={(e) => setDailyCap(e.target.value)} placeholder="לדוגמה: 500"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-300" />
                <p className="text-[11px] text-gray-400 mt-1">כל הקמפיינים ייעצרו כשמגיעים לסכום זה</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">תקרת הוצאה חודשית (₪)</label>
                <input type="number" min="0" value={monthlyCap} onChange={(e) => setMonthlyCap(e.target.value)} placeholder="לדוגמה: 10000"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-300" />
              </div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
              הגדרת CPA stop לכל קמפיין נעשית בעת יצירת הקמפיין. קמפיין שחורג יעצר אוטומטית.
            </div>
            {capsSuccess && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 font-semibold">
                ✓ הגדרות נשמרו בהצלחה
              </div>
            )}
            <button onClick={saveBudgetCaps} disabled={capsSaving}
              className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0891b2 100%)' }}>
              {capsSaving ? 'שומר...' : 'שמור הגדרות'}
            </button>
          </div>
        </div>
      )}

      {activeSection === 'guide' && (
        <div className="space-y-4" dir="rtl">

          {/* כרטיס – איך עובד קידום ממומן */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0891b2 100%)', color: 'white' }}>
              <span className="text-base">📣</span>
              <h3 className="text-sm font-bold">איך עובד קידום ממומן ב-VIPO?</h3>
            </div>
            <div className="p-4 text-xs text-gray-700 leading-relaxed space-y-2">
              <p>קידום ממומן מאפשר לך לבחור מוצר ספציפי ולהציג אותו בראש תוצאות הדף הבית, החיפוש, או ראש קטגוריה — עם תג <span className="font-bold text-cyan-700">ממומן</span> בצבע כחול.</p>
              <p>המערכת עוקבת אוטומטית אחרי <span className="font-semibold">חשיפות → קליקים → רכישות</span> ומחשבת את ה-ROAS בזמן אמת.</p>
              <p>קמפיין נעצר אוטומטית כשמגיע לתקציב, לתקציב יומי, או לסף CPA שהגדרת — אין צורך בהשגחה ידנית.</p>
            </div>
          </div>

          {/* שלב 1 */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 bg-cyan-50 border-b border-cyan-100 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyan-600 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">1</span>
              <span className="text-xs font-bold text-cyan-800">בחר מוצר לקידום</span>
            </div>
            <div className="p-4 text-xs text-gray-600 leading-relaxed space-y-1.5">
              <p>לחץ על <span className="font-semibold text-gray-800">קמפיין חדש</span> בפינה הימנית העליונה.</p>
              <p>בחר מהרשימה את המוצר שברצונך לקדם. המוצר חייב להיות פעיל עם תמונה וסטטוס <span className="font-semibold">published</span>.</p>
              <p className="text-gray-400">💡 עצה: קדם מוצרים עם מרווח רווח גבוה או מוצרים עונתיים שדורשים בוסט.</p>
            </div>
          </div>

          {/* שלב 2 – יעדים */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 bg-cyan-50 border-b border-cyan-100 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyan-600 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">2</span>
              <span className="text-xs font-bold text-cyan-800">בחר יעד קמפיין</span>
            </div>
            <div className="p-4 space-y-3">
              {[
                { icon: '🛒', title: 'מכירות / רכישות', desc: 'המוצר יוצג בעדיפות גבוהה. המערכת תמדוד כמה רכישות נוצרו ישירות מהקמפיין ותחשב CPA ו-ROAS. מומלץ למוצרים שכבר מוכרים טוב.', tag: 'הכי נפוץ' },
                { icon: '👆', title: 'קליקים לדף המוצר', desc: 'מטרית הצלחה = קליקים. מתאים כשרוצים להביא תנועה לדף מוצר חדש שעדיין לא צבר ביקורות. המערכת מודדת CTR (אחוז הקלקה).', tag: '' },
                { icon: '👁', title: 'חשיפות (brand awareness)', desc: 'המוצר יוצג כמה שיותר פעמים. מתאים להשקת מוצר חדש שרוצים שכמה שיותר אנשים יראו. מדד ההצלחה הוא Impressions.', tag: '' },
              ].map((g) => (
                <div key={g.title} className="flex gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                  <span className="text-xl flex-shrink-0 mt-0.5">{g.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-800">{g.title}</span>
                      {g.tag && <span className="px-1.5 py-0.5 bg-cyan-100 text-cyan-700 text-[9px] font-bold rounded-full">{g.tag}</span>}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{g.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* שלב 3 – מיקומים */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 bg-cyan-50 border-b border-cyan-100 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyan-600 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">3</span>
              <span className="text-xs font-bold text-cyan-800">בחר מיקומי הצגה</span>
            </div>
            <div className="p-4 space-y-3">
              {[
                { icon: '🏠', title: 'דף בית', desc: 'המוצר יופיע ראשון ברשימת המוצרים בדף הבית עם תג \"ממומן\" בכחול. הכי חשוף — מומלץ תמיד לסמן.', highlight: true },
                { icon: '📂', title: 'ראש קטגוריה', desc: 'המוצר יופיע ראשון בתוצאות הקטגוריה הרלוונטית. מתאים כשיש קטגוריה ספציפית שהמוצר שייך אליה (לדוגמה: שולחנות נירוסטה).', highlight: false },
                { icon: '🔍', title: 'תוצאות חיפוש', desc: 'כשמשתמש מחפש מוצר, המוצר הממומן יופיע ראשון לפני תוצאות אורגניות. מתאים לקידום לפי מילות מפתח.', highlight: false },
              ].map((pl) => (
                <div key={pl.title} className={`flex gap-3 p-3 rounded-lg border ${pl.highlight ? 'border-cyan-200 bg-cyan-50' : 'border-gray-100 bg-gray-50'}`}>
                  <span className="text-xl flex-shrink-0 mt-0.5">{pl.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-800">{pl.title}</span>
                      {pl.highlight && <span className="px-1.5 py-0.5 bg-cyan-100 text-cyan-700 text-[9px] font-bold rounded-full">מומלץ</span>}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{pl.desc}</p>
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-gray-400 pr-1">💡 ניתן לסמן מספר מיקומים בו-זמנית לכסות יותר חשיפה.</p>
            </div>
          </div>

          {/* שלב 4 – תקציב */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 bg-cyan-50 border-b border-cyan-100 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyan-600 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">4</span>
              <span className="text-xs font-bold text-cyan-800">הגדר תקציב</span>
            </div>
            <div className="p-4 space-y-3">
              {[
                { field: 'תקציב יומי (חובה)', min: '₪10 לפחות', desc: 'המקסימום שהמערכת תוציא ביום עבור קמפיין זה. כשמגיעים לסכום — הקמפיין מושהה אוטומטית עד למחרת.', example: 'לדוגמה: ₪50/יום' },
                { field: 'תקציב כולל (אופציונלי)', min: 'ריק = ללא הגבלה', desc: 'התקציב הכולל לכל חיי הקמפיין. כשמגיעים לסכום — הקמפיין עוצר לחלוטין ומסומן budget_exceeded.', example: 'לדוגמה: ₪500 סה"כ' },
                { field: 'עצירה אוטומטית אם CPA גבוה מ-X ₪', min: 'אופציונלי', desc: 'אם עלות הרכישה חורגת מהסף שהגדרת — הקמפיין מושהה. מגן על כדאיות ההשקעה.', example: 'לדוגמה: עצור אם CPA > ₪200' },
              ].map((b) => (
                <div key={b.field} className="flex gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                  <span className="text-xl flex-shrink-0 mt-0.5">💰</span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-800">{b.field}</span>
                      <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 text-[9px] font-semibold rounded-full">{b.min}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{b.desc}</p>
                    <p className="text-[10px] text-cyan-600 font-semibold mt-1">{b.example}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* מעקב ומדדים */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
              <span className="text-base">📊</span>
              <h3 className="text-xs font-bold text-emerald-800">מה המערכת מודדת אוטומטית?</h3>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: '👁', metric: 'Impressions (חשיפות)', desc: 'נרשם כל פעם שהמוצר הממומן נטען בדף.' },
                { icon: '👆', metric: 'Clicks (קליקים)', desc: 'נרשם כל לחיצה על כרטיס המוצר הממומן.' },
                { icon: '🛒', metric: 'Conversions (המרות)', desc: 'נרשם כשהזמנה שמכילה את המוצר שולמה בפועל.' },
                { icon: '💸', metric: 'Revenue (הכנסה)', desc: 'סכום ההכנסה שיוחס לקמפיין מהרכישות.' },
                { icon: '📈', metric: 'ROAS', desc: 'הכנסה ÷ Spend. ROAS מעל 3x = מצוין.' },
                { icon: '🎯', metric: 'CPA', desc: 'עלות לרכישה = Spend ÷ המרות. ככל שנמוך יותר — טוב יותר.' },
              ].map((m) => (
                <div key={m.metric} className="flex gap-2 p-2.5 rounded-lg border border-gray-100">
                  <span className="text-base flex-shrink-0">{m.icon}</span>
                  <div>
                    <div className="text-[11px] font-bold text-gray-800">{m.metric}</div>
                    <div className="text-[10px] text-gray-500">{m.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* בקרת תקציב גלובלית */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
              <span className="text-base">🛡️</span>
              <h3 className="text-xs font-bold text-amber-800">בקרת תקציב גלובלית (לכל הקמפיינים)</h3>
            </div>
            <div className="p-4 text-xs text-gray-600 leading-relaxed space-y-2">
              <p>בלשונית <span className="font-semibold">בקרת תקציב</span> ניתן להגדיר תקרת הוצאה יומית/חודשית עבור <span className="font-semibold">כל</span> הקמפיינים ביחד.</p>
              <p>כשסך כל ה-Spend של כל הקמפיינים הפעילים מגיע לתקרה — כולם מושהים אוטומטית.</p>
              <p className="text-amber-700 font-semibold">⚠️ הגדרות גלובליות גוברות על הגדרות קמפיין בודד.</p>
            </div>
          </div>

          {/* ניהול קמפיין פעיל */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <span className="text-base">⚙️</span>
              <h3 className="text-xs font-bold text-gray-700">ניהול קמפיין פעיל</h3>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: '⏸️', color: 'bg-amber-50 border-amber-200 text-amber-800', action: 'השהה', desc: 'עוצר זמנית את הקמפיין. ניתן לחדש בכל עת. השהייה לא פוגעת בנתונים.' },
                { icon: '▶️', color: 'bg-emerald-50 border-emerald-200 text-emerald-800', action: 'המשך', desc: 'מחדש קמפיין מושהה. הקמפיין יחזור להציג מוצרים בדקות הקרובות.' },
                { icon: '⏹️', color: 'bg-red-50 border-red-200 text-red-800', action: 'עצור', desc: 'סיום סופי. לא ניתן לחדש. הנתונים ההיסטוריים נשמרים לצפייה.' },
              ].map((a) => (
                <div key={a.action} className={`p-3 rounded-lg border ${a.color}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span>{a.icon}</span>
                    <span className="text-xs font-bold">{a.action}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-80">{a.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="rounded-xl p-4 text-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0891b2 100%)' }}>
            <p className="text-white text-xs font-semibold mb-3">מוכן להתחיל? צור את הקמפיין הראשון שלך</p>
            <button
              onClick={() => { setActiveSection('campaigns'); setShowForm(true); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100); }}
              className="px-5 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-90"
              style={{ background: 'rgba(255,255,255,0.22)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
            >
              + קמפיין חדש
            </button>
          </div>

        </div>
      )}

      {showForm && (
        <div ref={formRef} className="bg-white rounded-xl border border-cyan-200 shadow-lg overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0891b2 100%)', color: 'white' }}>
            <h3 className="text-sm font-bold">יצירת קמפיין חדש</h3>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormError(''); }} className="text-white/70 hover:text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form onSubmit={submitCampaign} className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">מוצר לקידום *</label>
                <select value={form.productId} onChange={handleProductChange}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-300">
                  <option value="">בחר מוצר...</option>
                  {products.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">שם הקמפיין *</label>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="לדוגמה: בוסט שולחן נירוסטה Q2"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-300" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">יעד הקמפיין *</label>
                <select value={form.goal} onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-300">
                  {GOALS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">תאריך סיום</label>
                <input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-300" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">תקציב יומי (₪) *</label>
                <input type="number" min="10" value={form.dailyBudget} onChange={(e) => setForm((f) => ({ ...f, dailyBudget: e.target.value }))}
                  placeholder="מינימום ₪10"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-300" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">תקציב כולל (₪) — אופציונלי</label>
                <input type="number" min="0" value={form.totalBudget} onChange={(e) => setForm((f) => ({ ...f, totalBudget: e.target.value }))}
                  placeholder="ריק = ללא הגבלה"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-300" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">עצירה אוטומטית אם CPA גבוה מ (₪)</label>
                <input type="number" min="0" value={form.cpaStopThreshold} onChange={(e) => setForm((f) => ({ ...f, cpaStopThreshold: e.target.value }))}
                  placeholder="לדוגמה: 200"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-300" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-2">מיקומי הצגה *</label>
              <div className="flex gap-2 flex-wrap">
                {PLACEMENTS.map((pl) => (
                  <button key={pl.id} type="button" onClick={() => togglePlacement(pl.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      form.placement.includes(pl.id) ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}>
                    {pl.label}
                  </button>
                ))}
              </div>
            </div>
            {formError && (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</div>
            )}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormError(''); }}
                className="px-4 py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">
                ביטול
              </button>
              <button type="submit" disabled={formSaving}
                className="px-5 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0891b2 100%)' }}>
                {formSaving ? 'שומר...' : 'הפעל קמפיין'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
