'use client';

import { useState } from 'react';
import Link from 'next/link';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Number(value) || 0));
};

export default function OrdersAccordions({ recentOrders = [], myOrders = [] }) {
  const [recentOpen, setRecentOpen] = useState(false);
  const [myOrdersOpen, setMyOrdersOpen] = useState(false);

  const getStatusStyle = (status) => ({
    background:
      status === 'paid' ? 'rgba(16, 185, 129, 0.1)' :
      status === 'pending' ? 'rgba(245, 158, 11, 0.1)' :
      'rgba(107, 114, 128, 0.1)',
    color:
      status === 'paid' ? '#059669' :
      status === 'pending' ? '#d97706' :
      '#6b7280',
    border: `1px solid ${
      status === 'paid' ? 'rgba(16, 185, 129, 0.3)' :
      status === 'pending' ? 'rgba(245, 158, 11, 0.3)' :
      'rgba(107, 114, 128, 0.3)'
    }`,
  });

  const getStatusText = (status) => 
    status === 'paid' ? 'שולם' : status === 'pending' ? 'ממתין' : status;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: '2px solid transparent',
        backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
        boxShadow: '0 4px 15px rgba(8, 145, 178, 0.12)',
      }}
    >
      {/* Recent Orders Accordion */}
      <div className="border-b border-gray-100">
        <button
          type="button"
          onClick={() => setRecentOpen(!recentOpen)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900">הזמנות מהקופון שלך</span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {recentOrders?.length || 0}
            </span>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${recentOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {recentOpen && (
          <div className="px-4 pb-4">
            {recentOrders && recentOrders.length > 0 ? (
              <div className="space-y-2">
                {recentOrders.slice(0, 5).map((order) => (
                  <div key={order._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{order.customerName}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                    <div className="text-left mx-3">
                      <p className="text-sm font-bold" style={{ color: '#0891b2' }}>
                        {formatCurrency(order.commissionAmount)}
                      </p>
                      <p className="text-xs text-gray-500">{formatCurrency(order.totalAmount)}</p>
                    </div>
                    <span
                      className="px-2 py-1 text-xs font-medium rounded-full flex-shrink-0"
                      style={getStatusStyle(order.status)}
                    >
                      {getStatusText(order.status)}
                    </span>
                  </div>
                ))}
                {recentOrders.length > 5 && (
                  <p className="text-center text-xs text-gray-500 pt-2">
                    +{recentOrders.length - 5} הזמנות נוספות
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <p className="text-sm">אין הזמנות עדיין</p>
                <p className="text-xs mt-1">שתף את קוד הקופון שלך כדי להתחיל להרוויח!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* My Orders Accordion */}
      <div>
        <button
          type="button"
          onClick={() => setMyOrdersOpen(!myOrdersOpen)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900">ההזמנות שלי</span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {myOrders?.length || 0}
            </span>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${myOrdersOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {myOrdersOpen && (
          <div className="px-4 pb-4">
            {myOrders && myOrders.length > 0 ? (
              <div className="space-y-2">
                {myOrders.slice(0, 5).map((order) => (
                  <div key={order._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{order.itemsCount} פריטים</p>
                      <p className="text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                    <div className="text-left mx-3">
                      <p className="text-sm font-bold text-gray-900">
                        {formatCurrency(order.totalAmount)}
                      </p>
                    </div>
                    <span
                      className="px-2 py-1 text-xs font-medium rounded-full flex-shrink-0"
                      style={getStatusStyle(order.status)}
                    >
                      {getStatusText(order.status)}
                    </span>
                  </div>
                ))}
                {myOrders.length > 5 && (
                  <p className="text-center text-xs text-gray-500 pt-2">
                    +{myOrders.length - 5} הזמנות נוספות
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <p className="text-sm">עדיין לא ביצעת הזמנות</p>
                <Link
                  href="/shop"
                  className="inline-block mt-2 px-4 py-2 rounded-lg text-white font-medium text-xs"
                  style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                >
                  לצפייה במוצרים
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
