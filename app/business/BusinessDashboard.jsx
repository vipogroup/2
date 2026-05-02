'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Building2, Package, ShoppingCart, Users, DollarSign,
  Sliders, TrendingUp, RefreshCw, Plus, Eye, Edit,
  BarChart3, Palette, Globe, Phone, Mail, MapPin,
  ChevronLeft, AlertCircle, CheckCircle, Clock, Store
} from 'lucide-react';

export default function BusinessDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      // Load user info
      const userRes = await fetch('/api/auth/me', { credentials: 'include' });
      if (!userRes.ok) {
        router.push('/login');
        return;
      }
      const userData = await userRes.json();
      
      // Check if user is business admin
      if (!userData.user?.tenantId) {
        setError('אין לך הרשאה לצפות בדף זה');
        return;
      }
      
      setUser(userData.user);
      
      // Load tenant info
      const tenantRes = await fetch(`/api/tenants/${userData.user.tenantId}`, { credentials: 'include' });
      if (tenantRes.ok) {
        const tenantData = await tenantRes.json();
        setTenant(tenantData.tenant);
      }
      
      // Load stats
      const statsRes = await fetch('/api/business/stats', { credentials: 'include' });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      
      // Load recent orders
      const ordersRes = await fetch('/api/orders?limit=5', { credentials: 'include' });
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setRecentOrders(ordersData.items || []);
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (num) => {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(num || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-cyan-100 text-cyan-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    const labels = {
      pending: 'ממתין',
      processing: 'בטיפול',
      shipped: 'נשלח',
      delivered: 'נמסר',
      cancelled: 'בוטל',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">שגיאה</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/" className="px-6 py-3 text-white rounded-lg" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
            חזרה לדף הבית
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {tenant?.branding?.logo ? (
                <Image
                  src={tenant.branding.logo}
                  alt="לוגו"
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-lg object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
                  <Building2 className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900">{tenant?.name || 'העסק שלי'}</h1>
                <p className="text-sm text-gray-500">דשבורד ניהול</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/t/${tenant?.slug}`}
                target="_blank"
                className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm"
              >
                <Eye className="w-4 h-4" />
                צפה בחנות
              </Link>
              <button
                onClick={loadData}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'overview', label: 'סקירה כללית', icon: BarChart3 },
            { id: 'products', label: 'מוצרים', icon: Package },
            { id: 'orders', label: 'הזמנות', icon: ShoppingCart },
            { id: 'settings', label: 'הגדרות עסק', icon: Sliders },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
              style={activeTab === tab.id ? { background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' } : {}}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">מכירות החודש</div>
                    <div className="text-xl font-bold">{formatCurrency(stats?.monthlySales || 0)}</div>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <ShoppingCart className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">הזמנות החודש</div>
                    <div className="text-xl font-bold">{stats?.monthlyOrders || 0}</div>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-100 rounded-lg">
                    <Package className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">מוצרים פעילים</div>
                    <div className="text-xl font-bold">{stats?.totalProducts || 0}</div>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Users className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">לקוחות</div>
                    <div className="text-xl font-bold">{stats?.totalCustomers || 0}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">הזמנות אחרונות</h2>
                <Link href="/business/orders" className="text-blue-600 text-sm hover:underline">
                  צפה בהכל
                </Link>
              </div>
              <div className="divide-y">
                {recentOrders.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    אין הזמנות עדיין
                  </div>
                ) : (
                  recentOrders.map((order) => (
                    <div key={order._id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      <div>
                        <div className="font-medium">{order.customer?.fullName || 'לקוח'}</div>
                        <div className="text-sm text-gray-500">{formatDate(order.createdAt)}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-medium">{formatCurrency(order.totalAmount)}</span>
                        {getStatusBadge(order.status)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                href="/business/products/new"
                className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow"
              >
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Plus className="w-5 h-5 text-blue-600" />
                </div>
                <span className="font-medium">הוסף מוצר</span>
              </Link>
              <Link
                href="/business/orders"
                className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow"
              >
                <div className="p-2 bg-green-100 rounded-lg">
                  <ShoppingCart className="w-5 h-5 text-green-600" />
                </div>
                <span className="font-medium">ניהול הזמנות</span>
              </Link>
              <Link
                href="/business/settings"
                className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow"
              >
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <Palette className="w-5 h-5 text-cyan-600" />
                </div>
                <span className="font-medium">מיתוג החנות</span>
              </Link>
              <Link
                href={`/t/${tenant?.slug}`}
                target="_blank"
                className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow"
              >
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Globe className="w-5 h-5 text-orange-600" />
                </div>
                <span className="font-medium">צפה בחנות</span>
              </Link>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <ProductsManager tenantId={tenant?._id} />
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <OrdersManager />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <SettingsManager tenant={tenant} onUpdate={loadData} />
        )}
      </div>
    </div>
  );
}

// Products Manager Component
function ProductsManager({ tenantId }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        if (!tenantId) {
          setProducts([]);
          return;
        }
        const tid = encodeURIComponent(String(tenantId));
        const res = await fetch(
          `/api/products?tenantId=${tid}&includeInactive=true`,
          { credentials: 'include' },
        );
        const data = await res.json();
        const list = Array.isArray(data?.products) ? data.products : Array.isArray(data) ? data : [];
        setProducts(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tenantId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">המוצרים שלי</h2>
        <Link
          href="/business/products/new"
          className="flex items-center gap-2 px-4 py-2 text-white rounded-lg"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
        >
          <Plus className="w-4 h-4" />
          מוצר חדש
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">מוצר</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">מחיר</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">מלאי</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">סטטוס</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-8 text-gray-500">
                  אין מוצרים עדיין
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const primaryImage = product.media?.images?.[0]?.url || '';
                return (
                  <tr key={product._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {primaryImage ? (
                          <Image
                            src={primaryImage}
                            alt={product.name || 'תמונת מוצר'}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <span className="font-medium">{product.name}</span>
                      </div>
                    </td>
                  <td className="px-4 py-3">₪{product.price}</td>
                  <td className="px-4 py-3">{product.stockCount || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${product.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {product.active ? 'פעיל' : 'לא פעיל'}
                    </span>
                  </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/business/products/${product._id}`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg inline-flex"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Orders Manager Component
function OrdersManager() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/orders', { credentials: 'include' });
        const data = await res.json();
        setOrders(data.items || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const formatCurrency = (num) => {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(num || 0);
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-cyan-100 text-cyan-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    const labels = {
      pending: 'ממתין',
      processing: 'בטיפול',
      shipped: 'נשלח',
      delivered: 'נמסר',
      cancelled: 'בוטל',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">הזמנות</h2>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">מספר הזמנה</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">לקוח</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">סכום</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">תאריך</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">סטטוס</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-8 text-gray-500">
                  אין הזמנות עדיין
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm">{order._id?.slice(-8)}</td>
                  <td className="px-4 py-3">{order.customer?.fullName || 'לקוח'}</td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(order.totalAmount)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString('he-IL')}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Settings Manager Component
function SettingsManager({ tenant, onUpdate }) {
  const [formData, setFormData] = useState({
    name: tenant?.name || '',
    contact: {
      email: tenant?.contact?.email || '',
      phone: tenant?.contact?.phone || '',
      whatsapp: tenant?.contact?.whatsapp || '',
      address: tenant?.contact?.address || '',
    },
    branding: {
      logo: tenant?.branding?.logo || '',
      primaryColor: tenant?.branding?.primaryColor || '#1e3a8a',
      secondaryColor: tenant?.branding?.secondaryColor || '#0891b2',
    },
    social: {
      facebook: tenant?.social?.facebook || '',
      instagram: tenant?.social?.instagram || '',
    },
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    
    try {
      const res = await fetch(`/api/tenants/${tenant._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setMessage('ההגדרות נשמרו בהצלחה');
      onUpdate?.();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">הגדרות העסק</h2>

      {message && (
        <div className={`p-4 rounded-lg ${message.includes('שגיאה') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Business Info */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            פרטי העסק
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שם העסק</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Phone className="w-5 h-5 text-blue-600" />
            פרטי קשר
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
              <input
                type="email"
                value={formData.contact.email}
                onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, email: e.target.value } })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">טלפון</label>
              <input
                type="tel"
                value={formData.contact.phone}
                onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, phone: e.target.value } })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">וואטסאפ</label>
              <input
                type="tel"
                value={formData.contact.whatsapp}
                onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, whatsapp: e.target.value } })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">כתובת</label>
              <input
                type="text"
                value={formData.contact.address}
                onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, address: e.target.value } })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5 text-blue-600" />
            מיתוג
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL לוגו</label>
              <input
                type="url"
                value={formData.branding.logo}
                onChange={(e) => setFormData({ ...formData, branding: { ...formData.branding, logo: e.target.value } })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="https://..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">צבע ראשי</label>
                <input
                  type="color"
                  value={formData.branding.primaryColor}
                  onChange={(e) => setFormData({ ...formData, branding: { ...formData.branding, primaryColor: e.target.value } })}
                  className="w-full h-10 rounded-lg cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">צבע משני</label>
                <input
                  type="color"
                  value={formData.branding.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, branding: { ...formData.branding, secondaryColor: e.target.value } })}
                  className="w-full h-10 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Social */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            רשתות חברתיות
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">פייסבוק</label>
              <input
                type="url"
                value={formData.social.facebook}
                onChange={(e) => setFormData({ ...formData, social: { ...formData.social, facebook: e.target.value } })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="https://facebook.com/..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">אינסטגרם</label>
              <input
                type="url"
                value={formData.social.instagram}
                onChange={(e) => setFormData({ ...formData, social: { ...formData.social, instagram: e.target.value } })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="https://instagram.com/..."
              />
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-3 text-white font-medium rounded-lg disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
      >
        {saving ? 'שומר...' : 'שמור שינויים'}
      </button>
    </div>
  );
}
