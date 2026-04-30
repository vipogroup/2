'use client';

import { useState, useEffect, useCallback } from 'react';
import CommissionsSection from './CommissionsSection';
import WithdrawalModal from './WithdrawalModal';
import { useTenant } from './AgentDashboardClient';

export default function AgentCommissionsClient() {
  const { currentBusiness, businesses, loading: tenantLoading, hasBusinesses, hasMultipleBusinesses } = useTenant() || {};
  const [commissionSummary, setCommissionSummary] = useState(null);
  const [commissions, setCommissions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isWithdrawalModalOpen, setWithdrawalModalOpen] = useState(false);
  // פילטר עסקים: 'current' = עסק נוכחי, 'all' = כל העסקים
  const [businessFilter, setBusinessFilter] = useState('current');

  const loadCommissionsData = useCallback(async () => {
    // Don't load if no business is selected
    if (!hasBusinesses || !currentBusiness) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      // בחירת tenantId לפי הפילטר
      const tenantId = businessFilter === 'all' ? 'all' : currentBusiness?.tenantId;
      const tenantParam = tenantId ? `?tenantId=${tenantId}` : '';
      const [commissionsRes, withdrawalsRes] = await Promise.all([
        fetch(`/api/agent/commissions${tenantParam}`, { cache: 'no-store' }),
        fetch('/api/withdrawals', { cache: 'no-store' }),
      ]);

      if (commissionsRes.ok) {
        const data = await commissionsRes.json();
        setCommissionSummary(data.summary || null);
        setCommissions(data.commissions || []);
      } else {
        setError('שגיאה בטעינת נתוני העמלות');
      }

      if (withdrawalsRes.ok) {
        const data = await withdrawalsRes.json();
        setWithdrawals(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to load commissions:', err);
      setError('שגיאה בטעינת נתוני העמלות');
    } finally {
      setLoading(false);
    }
  }, [hasBusinesses, currentBusiness, businessFilter]);

  useEffect(() => {
    if (!tenantLoading) {
      loadCommissionsData();
    }
  }, [loadCommissionsData, tenantLoading, currentBusiness, businessFilter]);

  const openWithdrawalModal = () => {
    setWithdrawalModalOpen(true);
  };

  const closeWithdrawalModal = () => {
    setWithdrawalModalOpen(false);
  };

  const handleWithdrawalSuccess = () => {
    loadCommissionsData();
  };

  // Don't show anything if no business is selected
  if (!hasBusinesses || !currentBusiness) {
    return null;
  }

  if (loading || tenantLoading) {
    return (
      <div className="flex justify-center py-10">
        <div
          className="h-12 w-12 animate-spin rounded-full"
          style={{
            border: '4px solid rgba(8, 145, 178, 0.2)',
            borderTopColor: '#0891b2',
          }}
        ></div>
      </div>
    );
  }

  return (
    <>
      {/* פילטר עסקים - מוצג רק אם יש יותר מעסק אחד */}
      {hasMultipleBusinesses && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-gray-600">הצג עמלות:</span>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setBusinessFilter('current')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                businessFilter === 'current'
                  ? 'bg-gradient-to-l from-[#1e3a8a] to-[#0891b2] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {currentBusiness?.tenantName || 'עסק נוכחי'}
            </button>
            <button
              type="button"
              onClick={() => setBusinessFilter('all')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors border-r border-gray-200 ${
                businessFilter === 'all'
                  ? 'bg-gradient-to-l from-[#1e3a8a] to-[#0891b2] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              כל העסקים ({businesses?.length || 0})
            </button>
          </div>
        </div>
      )}

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {commissionSummary ? (
        <CommissionsSection
          summary={commissionSummary}
          commissions={commissions}
          withdrawals={withdrawals}
          onRequestWithdraw={openWithdrawalModal}
          onRefresh={loadCommissionsData}
        />
      ) : null}

      <WithdrawalModal
        open={isWithdrawalModalOpen}
        onClose={closeWithdrawalModal}
        summary={commissionSummary}
        onSuccess={handleWithdrawalSuccess}
      />
    </>
  );
}
