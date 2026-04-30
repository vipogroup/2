'use client';

import { useMemo, useState } from 'react';
import { formatCurrencyILS } from '@/app/utils/date';

const commissionStatusConfig = {
  pending: {
    label: 'ממתין לשחרור',
    className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
  available: {
    label: 'זמין למשיכה',
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  claimed: {
    label: 'נמשך',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  cancelled: {
    label: 'בוטל',
    className: 'bg-red-100 text-red-700 border-red-200',
  },
};

const withdrawalStatusConfig = {
  pending: { label: 'ממתין לאישור', className: 'text-amber-600 bg-amber-100 border-amber-200' },
  approved: { label: 'אושר', className: 'text-blue-600 bg-blue-100 border-blue-200' },
  rejected: { label: 'נדחה', className: 'text-red-600 bg-red-100 border-red-200' },
  completed: { label: 'הושלם', className: 'text-green-600 bg-green-100 border-green-200' },
};

function formatDate(date) {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch (error) {
    return '—';
  }
}

function CommissionRow({ commission }) {
  const status = commissionStatusConfig[commission.status] || commissionStatusConfig.pending;
  const orderTypeLabel =
    commission.orderTypeLabel ||
    (commission.orderType === 'group' ? 'רכישה קבוצתית' : 'רכישה רגילה');
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-3 px-4 text-sm font-semibold text-gray-900">
        {commission.customerName || 'לקוח'}
      </td>
      <td className="py-3 px-4 text-sm text-gray-600 max-w-[200px] truncate" title={commission.productName || '—'}>
        {commission.productName || '—'}
      </td>
      <td className="py-3 px-4 text-sm text-gray-600">
        {orderTypeLabel}
      </td>
      <td className="py-3 px-4 text-sm font-semibold" style={{ color: '#1e3a8a' }}>
        {formatCurrencyILS(commission.amount)}
      </td>
      <td className="py-3 px-4 text-sm">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${status.className}`}>
          {status.label}
        </span>
      </td>
      <td className="py-3 px-4 text-sm text-gray-600">{formatDate(commission.availableAt)}</td>
    </tr>
  );
}

function CommissionCard({ commission }) {
  const status = commissionStatusConfig[commission.status] || commissionStatusConfig.pending;
  const orderTypeLabel =
    commission.orderTypeLabel ||
    (commission.orderType === 'group' ? 'רכישה קבוצתית' : 'רכישה רגילה');
  const isGroup =
    commission.orderTypeKind ? commission.orderTypeKind !== 'regular' : commission.orderType === 'group';
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-900">{commission.customerName || 'לקוח'}</span>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${status.className}`}>
          {status.label}
        </span>
      </div>
      <div className="space-y-2 text-sm">
        {commission.productName && (
          <div className="flex items-center justify-between text-gray-600">
            <span>מוצר</span>
            <span className="text-right max-w-[180px] truncate" title={commission.productName}>{commission.productName}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-gray-600">
          <span>סוג הזמנה</span>
          <span>{orderTypeLabel}</span>
        </div>
        <div className="flex items-center justify-between font-semibold" style={{ color: '#1e3a8a' }}>
          <span>סכום עמלה</span>
          <span>{formatCurrencyILS(commission.amount)}</span>
        </div>
        <div className="flex items-center justify-between text-gray-600">
          <span>זמין בתאריך</span>
          <span>{formatDate(commission.availableAt)}</span>
        </div>
        {isGroup && commission.groupPurchase ? (
          <div className="flex items-center justify-between text-gray-600">
            <span>{orderTypeLabel}</span>
            <span>{commission.groupPurchase.name || '—'}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function WithdrawalRow({ request }) {
  const status = withdrawalStatusConfig[request.status] || withdrawalStatusConfig.pending;
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-3 px-4 text-sm">{formatDate(request.createdAt)}</td>
      <td className="py-3 px-4 text-sm font-semibold" style={{ color: '#1e3a8a' }}>
        {formatCurrencyILS(request.amount)}
      </td>
      <td className="py-3 px-4 text-sm">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${status.className}`}>
          {status.label}
        </span>
      </td>
      <td className="py-3 px-4 text-sm text-gray-600">{request.adminNotes || '—'}</td>
    </tr>
  );
}

export default function CommissionsSection({ summary, commissions, withdrawals, onRequestWithdraw, onRefresh }) {
  const [commissionsOpen, setCommissionsOpen] = useState(false);
  const [withdrawalsOpen, setWithdrawalsOpen] = useState(false);

  const hasCommissions = Array.isArray(commissions) && commissions.length > 0;
  const hasWithdrawals = Array.isArray(withdrawals) && withdrawals.length > 0;

  const availableBalance = useMemo(() => summary?.availableBalance ?? 0, [summary]);
  const onHold = useMemo(() => summary?.onHold ?? 0, [summary]);
  const totalEarned = useMemo(() => summary?.totalEarned ?? 0, [summary]);

  return (
    <section
      className="rounded-xl overflow-hidden"
      style={{
        border: '2px solid transparent',
        backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
        boxShadow: '0 4px 15px rgba(8, 145, 178, 0.12)',
      }}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#1e3a8a' }}>ניהול עמלות</h2>
              <p className="text-xs text-gray-500">זמין למשיכה: {formatCurrencyILS(availableBalance)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRequestWithdraw}
            disabled={availableBalance <= 0}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
          >
            ממש עמלות
          </button>
        </div>
      </div>

      {/* Summary Cards - Compact */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 rtl:divide-x-reverse border-b border-gray-100">
        <div className="p-3 text-center">
          <p className="text-[10px] text-gray-500 mb-1">זמין למשיכה</p>
          <p className="text-sm font-bold" style={{ color: '#1e3a8a' }}>{formatCurrencyILS(availableBalance)}</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-[10px] text-gray-500 mb-1">נעול</p>
          <p className="text-sm font-bold text-slate-600">{formatCurrencyILS(onHold)}</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-[10px] text-gray-500 mb-1">סה״כ הרווחת</p>
          <p className="text-sm font-bold" style={{ color: '#0891b2' }}>{formatCurrencyILS(totalEarned)}</p>
        </div>
      </div>

      {/* Accordion: פירוט עמלות */}
      <div className="border-b border-gray-100">
        <button
          type="button"
          onClick={() => setCommissionsOpen(!commissionsOpen)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900">פירוט עמלות</span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{commissions?.length ?? 0}</span>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${commissionsOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {commissionsOpen && (
          <div className="px-4 pb-4">
            {hasCommissions ? (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="border-b border-gray-200 text-sm text-gray-600">
                        <th className="py-2 px-4 font-medium">לקוח</th>
                        <th className="py-2 px-4 font-medium">מוצר</th>
                        <th className="py-2 px-4 font-medium">סוג רכישה</th>
                        <th className="py-2 px-4 font-medium">עמלה (₪)</th>
                        <th className="py-2 px-4 font-medium">סטטוס עמלה</th>
                        <th className="py-2 px-4 font-medium">תאריך זמינות</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commissions.map((commission) => (
                        <CommissionRow key={commission.orderId || commission.createdAt} commission={commission} />
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-3 md:hidden">
                  {commissions.map((commission) => (
                    <CommissionCard key={commission.orderId || commission.createdAt} commission={commission} />
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-6 text-center text-sm text-gray-500">
                אין עמלות להצגה כרגע
              </div>
            )}
          </div>
        )}
      </div>

      {/* Accordion: היסטוריית משיכות */}
      <div>
        <button
          type="button"
          onClick={() => setWithdrawalsOpen(!withdrawalsOpen)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900">היסטוריית משיכות</span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{withdrawals?.length ?? 0}</span>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${withdrawalsOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {withdrawalsOpen && (
          <div className="px-4 pb-4">
            {hasWithdrawals ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-right text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-600">
                      <th className="py-2 px-4 font-medium">תאריך</th>
                      <th className="py-2 px-4 font-medium">סכום</th>
                      <th className="py-2 px-4 font-medium">סטטוס</th>
                      <th className="py-2 px-4 font-medium">הערות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((request) => (
                      <WithdrawalRow key={request._id} request={request} />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-6 text-center text-sm text-gray-500">
                עדיין לא ביקשת משיכה
              </div>
            )}
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <div className="p-3 border-t border-gray-100 bg-gray-50">
        <button
          type="button"
          onClick={onRefresh}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          רענן נתונים
        </button>
      </div>
    </section>
  );
}
