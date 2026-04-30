'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Building2, DollarSign, TrendingUp, ShoppingCart, 
  CreditCard, RefreshCw, Download, Calendar,
  CheckCircle, Clock, AlertCircle
} from 'lucide-react';

export default function TenantDashboardClient() {
  const [stats, setStats] = useState(null);
  const [payments, setPayments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('month');
  const [processingPayment, setProcessingPayment] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, paymentsRes] = await Promise.all([
        fetch(`/api/admin/tenant-stats?period=${period}`, { credentials: 'include' }),
        fetch('/api/admin/tenant-payments', { credentials: 'include' }),
      ]);
      
      const statsData = await statsRes.json();
      const paymentsData = await paymentsRes.json();
      
      if (!statsRes.ok) throw new Error(statsData.error);
      if (!paymentsRes.ok) throw new Error(paymentsData.error);
      
      setStats(statsData);
      setPayments(paymentsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRecordPayment = async (tenantId, tenantName, amount) => {
    if (!confirm(`לתעד תשלום של ${amount.toLocaleString()} ש"ח לעסק ${tenantName}?`)) return;
    
    setProcessingPayment(tenantId);
    try {
      const res = await fetch('/api/admin/tenant-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tenantId, amount, paymentMethod: 'bank_transfer' }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      alert(data.message);
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessingPayment(null);
    }
  };

  const formatCurrency = (num) => {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(num || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">דשבורד עסקים</h1>
            <p className="text-gray-500 text-sm">סקירת מכירות ותשלומים</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="day">היום</option>
            <option value="week">שבוע אחרון</option>
            <option value="month">חודש נוכחי</option>
            <option value="year">שנה נוכחית</option>
            <option value="all">הכל</option>
          </select>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            רענון
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">{error}</div>
      )}

      {/* Summary Cards */}
      {stats?.totals && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">סהכ מכירות</div>
                <div className="text-xl font-bold">{formatCurrency(stats.totals.totalSales)}</div>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">עמלת פלטפורמה</div>
                <div className="text-xl font-bold text-green-600">{formatCurrency(stats.totals.totalPlatformCommission)}</div>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-100 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">סהכ הזמנות</div>
                <div className="text-xl font-bold">{stats.totals.totalOrders}</div>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Building2 className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">עסקים פעילים</div>
                <div className="text-xl font-bold">{stats.totals.activeTenants}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Payments Alert */}
      {payments?.totalPending > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600" />
            <div>
              <div className="font-medium text-yellow-800">תשלומים ממתינים</div>
              <div className="text-sm text-yellow-700">
                יש {formatCurrency(payments.totalPending)} לתשלום ל-{payments.payments.length} עסקים
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tenants Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-900">מכירות לפי עסק</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">עסק</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">מכירות</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">הזמנות</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">עמלה</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">לעסק</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">שולם</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stats?.tenants?.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-500">
                    אין נתונים לתקופה זו
                  </td>
                </tr>
              ) : (
                stats?.tenants?.map((tenant) => (
                  <tr key={tenant.tenantId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{tenant.tenantName}</div>
                      <div className="text-sm text-gray-500">{tenant.tenantSlug}</div>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatCurrency(tenant.totalSales)}
                    </td>
                    <td className="px-4 py-3">{tenant.orderCount}</td>
                    <td className="px-4 py-3 text-green-600">
                      {formatCurrency(tenant.platformCommission)}
                      <span className="text-xs text-gray-400 mr-1">({tenant.platformCommissionRate}%)</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-blue-600">
                      {formatCurrency(tenant.tenantEarnings)}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatCurrency(tenant.totalPaid)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Payments Table */}
      {payments?.payments?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">תשלומים ממתינים</h2>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
              {formatCurrency(payments.totalPending)}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">עסק</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">מכירות</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">עמלה</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">לתשלום</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">תשלום אחרון</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.payments.map((payment) => (
                  <tr key={payment.tenantId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{payment.tenantName}</div>
                      <div className="text-sm text-gray-500">{payment.orderCount} הזמנות</div>
                    </td>
                    <td className="px-4 py-3">{formatCurrency(payment.totalSales)}</td>
                    <td className="px-4 py-3 text-green-600">
                      {formatCurrency(payment.platformCommission)}
                    </td>
                    <td className="px-4 py-3 font-bold text-blue-600">
                      {formatCurrency(payment.amountDue)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {payment.lastPaymentAt 
                        ? new Date(payment.lastPaymentAt).toLocaleDateString('he-IL')
                        : 'לא היה'
                      }
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleRecordPayment(payment.tenantId, payment.tenantName, payment.amountDue)}
                        disabled={processingPayment === payment.tenantId}
                        className="flex items-center gap-2 px-3 py-1.5 text-white rounded-lg disabled:opacity-50 text-sm"
                        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                      >
                        {processingPayment === payment.tenantId ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        תעד תשלום
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
