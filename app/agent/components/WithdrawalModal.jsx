'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatCurrencyILS } from '@/app/utils/date';

const statusColors = {
  success: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-200',
  },
  error: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200',
  },
};

const PAYMENT_METHODS = [
  { id: 'bit', label: 'ביט', icon: 'B' },
  { id: 'paybox', label: 'פייבוקס', icon: 'P' },
  { id: 'paypal', label: 'פייפל', icon: 'PP' },
  { id: 'bank', label: 'העברה בנקאית', icon: 'BK' },
];

export default function WithdrawalModal({
  open,
  onClose,
  summary,
  onSuccess,
}) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState('');
  const [phone, setPhone] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [bankDetails, setBankDetails] = useState({
    accountName: '',
    bankNumber: '',
    branchNumber: '',
    accountNumber: '',
  });

  const availableBalance = useMemo(() => summary?.availableBalance ?? 0, [summary]);
  const onHold = useMemo(() => summary?.onHold ?? 0, [summary]);

  useEffect(() => {
    if (!open) {
      setAmount('');
      setNotes('');
      setError('');
      setSuccessMessage('');
      setLoading(false);
      setPaymentMethod('');
      setPhone('');
      setPaypalEmail('');
      setBankDetails({ accountName: '', bankNumber: '', branchNumber: '', accountNumber: '' });
    }
  }, [open]);
  
  // Check if payment details are valid
  const isPaymentDetailsValid = useMemo(() => {
    if (!paymentMethod) return false;
    
    if (paymentMethod === 'bit' || paymentMethod === 'paybox') {
      return phone.trim().length >= 9;
    }
    if (paymentMethod === 'paypal') {
      return paypalEmail.trim().includes('@');
    }
    if (paymentMethod === 'bank') {
      return (
        bankDetails.accountName.trim() &&
        bankDetails.bankNumber.trim() &&
        bankDetails.branchNumber.trim() &&
        bankDetails.accountNumber.trim()
      );
    }
    return false;
  }, [paymentMethod, phone, paypalEmail, bankDetails]);

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    if (loading) return;

    const numericAmount = Number(amount);
    if (!numericAmount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      setError('סכום משיכה לא תקין');
      return;
    }
    if (numericAmount > availableBalance) {
      setError('ניתן למשוך עד הסכום הזמין בלבד');
      return;
    }
    
    if (!isPaymentDetailsValid) {
      setError('יש לבחור אמצעי תשלום ולמלא את כל הפרטים הנדרשים');
      return;
    }

    // Build payment details object
    let paymentDetails = { method: paymentMethod };
    if (paymentMethod === 'bit' || paymentMethod === 'paybox') {
      paymentDetails.phone = phone.trim();
    } else if (paymentMethod === 'paypal') {
      paymentDetails.email = paypalEmail.trim();
    } else if (paymentMethod === 'bank') {
      paymentDetails.accountName = bankDetails.accountName.trim();
      paymentDetails.bankNumber = bankDetails.bankNumber.trim();
      paymentDetails.branchNumber = bankDetails.branchNumber.trim();
      paymentDetails.accountNumber = bankDetails.accountNumber.trim();
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: numericAmount, notes, paymentDetails }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload?.error || 'בקשה נכשלה');
      }

      setSuccessMessage('הבקשה נשלחה למנהל ותעבור לטיפול בקרוב.');
      setAmount('');
      setNotes('');
    } catch (err) {
      setError(err?.message || 'שליחת הבקשה נכשלה, נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  // Success screen after request is submitted
  if (successMessage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, rgba(30, 58, 138, 0.35), rgba(8, 145, 178, 0.35))', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.15), rgba(8, 145, 178, 0.15))' }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" style={{ color: '#1e3a8a' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#1e3a8a' }}>הבקשה נשלחה בהצלחה!</h2>
          <p className="text-gray-600 mb-6">בקשת המשיכה שלך נשלחה למנהל וממתינה לאישור. תקבל עדכון כשהבקשה תטופל.</p>
          <button
            type="button"
            onClick={() => {
              if (typeof onSuccess === 'function') {
                onSuccess();
              }
              handleClose();
            }}
            className="w-full rounded-lg px-6 py-3 text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
          >
            סגור
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 sm:p-7 shadow-xl" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, rgba(30, 58, 138, 0.35), rgba(8, 145, 178, 0.35))', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold" style={{ color: '#1e3a8a' }}>בקשת משיכה</h2>
            <p className="text-sm text-gray-500">שלח בקשה למנהל עבור העמלות הזמינות שלך</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="סגור"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl border bg-gray-50 p-3" style={{ borderColor: 'rgba(8, 145, 178, 0.3)' }}>
            <p className="text-xs text-gray-500">זמין למשיכה</p>
            <p className="text-base font-bold" style={{ color: '#1e3a8a' }}>{formatCurrencyILS(availableBalance)}</p>
          </div>
          <div className="rounded-xl border bg-gray-50 p-3" style={{ borderColor: 'rgba(8, 145, 178, 0.2)' }}>
            <p className="text-xs text-gray-500">נעול בבקשות</p>
            <p className="text-base font-bold text-slate-700">{formatCurrencyILS(onHold)}</p>
          </div>
        </div>

        <form onSubmit={submitRequest} className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="withdrawal-amount">
              סכום למשיכה (₪)
            </label>
            <input
              id="withdrawal-amount"
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-right focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <p className="mt-1 text-xs text-gray-500">מינימום: ₪1, מקסימום: {formatCurrencyILS(availableBalance)}</p>
          </div>

          {/* Payment Method Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              אמצעי קבלת התשלום <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentMethod(method.id)}
                  className={`flex flex-col items-center justify-center rounded-lg border p-3 text-sm transition-all ${
                    paymentMethod === method.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl mb-1">{method.icon}</span>
                  <span className="font-medium">{method.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Payment Details Fields */}
          {(paymentMethod === 'bit' || paymentMethod === 'paybox') && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="payment-phone">
                מספר טלפון <span className="text-red-500">*</span>
              </label>
              <input
                id="payment-phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="053-375-2633"
                className="w-full rounded-lg border px-3 py-2 text-right focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          )}

          {paymentMethod === 'paypal' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="payment-paypal">
                כתובת אימייל PayPal <span className="text-red-500">*</span>
              </label>
              <input
                id="payment-paypal"
                type="email"
                value={paypalEmail}
                onChange={(event) => setPaypalEmail(event.target.value)}
                placeholder="email@example.com"
                className="w-full rounded-lg border px-3 py-2 text-left focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                dir="ltr"
              />
            </div>
          )}

          {paymentMethod === 'bank' && (
            <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-sm font-medium text-gray-700">פרטי חשבון בנק</p>
              <div>
                <label className="mb-1 block text-xs text-gray-600" htmlFor="bank-account-name">
                  שם בעל החשבון <span className="text-red-500">*</span>
                </label>
                <input
                  id="bank-account-name"
                  type="text"
                  value={bankDetails.accountName}
                  onChange={(event) => setBankDetails({ ...bankDetails, accountName: event.target.value })}
                  placeholder="ישראל ישראלי"
                  className="w-full rounded-lg border px-3 py-2 text-right text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-gray-600" htmlFor="bank-number">
                    מספר בנק <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="bank-number"
                    type="text"
                    value={bankDetails.bankNumber}
                    onChange={(event) => setBankDetails({ ...bankDetails, bankNumber: event.target.value })}
                    placeholder="12"
                    className="w-full rounded-lg border px-3 py-2 text-center text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-600" htmlFor="bank-branch">
                    מספר סניף <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="bank-branch"
                    type="text"
                    value={bankDetails.branchNumber}
                    onChange={(event) => setBankDetails({ ...bankDetails, branchNumber: event.target.value })}
                    placeholder="123"
                    className="w-full rounded-lg border px-3 py-2 text-center text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-600" htmlFor="bank-account">
                    מספר חשבון <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="bank-account"
                    type="text"
                    value={bankDetails.accountNumber}
                    onChange={(event) => setBankDetails({ ...bankDetails, accountNumber: event.target.value })}
                    placeholder="123456"
                    className="w-full rounded-lg border px-3 py-2 text-center text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="withdrawal-notes">
              הערות למנהל (אופציונלי)
            </label>
            <textarea
              id="withdrawal-notes"
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-right focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="הערות נוספות..."
            />
          </div>

          {error && (
            <div className={`rounded-lg border px-3 py-2 text-sm ${statusColors.error.bg} ${statusColors.error.text} ${statusColors.error.border}`}>
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 sm:w-auto"
              disabled={loading}
            >
              ביטול
            </button>
            <button
              type="submit"
              className="w-full rounded-lg px-4 py-2 text-sm font-semibold text-white sm:w-auto disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
              disabled={loading || availableBalance <= 0 || !isPaymentDetailsValid}
            >
              {loading ? 'שולח בקשה…' : 'שלח בקשת משיכה'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
