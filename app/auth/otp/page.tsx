'use client';

import { ChangeEvent, FormEvent, useState } from 'react';

type OtpStep = 'phone' | 'code';

type OtpState = {
  step: OtpStep;
  phone: string;
  code: string;
  loading: boolean;
  error: string;
  info: string;
};

const initialState: OtpState = {
  step: 'phone',
  phone: '',
  code: '',
  loading: false,
  error: '',
  info: '',
};

export default function OtpPage() {
  const [state, setState] = useState<OtpState>(initialState);
  const isPhoneStep = state.step === 'phone';

  const handlePhoneChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setState((prev) => ({
      ...prev,
      phone: value,
      error: '',
      info: '',
    }));
  };

  const handleCodeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (/^\d*$/.test(value)) {
      setState((prev) => ({
        ...prev,
        code: value,
        error: '',
        info: '',
      }));
    }
  };

  const handlePhoneSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedPhone = state.phone.trim();

    if (!trimmedPhone) {
      setState((prev) => ({
        ...prev,
        error: 'אנא הזן מספר טלפון תקין',
        info: '',
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      loading: true,
      error: '',
      info: '',
    }));

    setTimeout(() => {
      setState((prev) => ({
        ...prev,
        step: 'code',
        code: '',
        loading: false,
        info: 'קוד חד-פעמי נשלח אל המספר שהוזן',
      }));
    }, 600);
  };

  const handleCodeSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedCode = state.code.trim();

    if (!trimmedCode) {
      setState((prev) => ({
        ...prev,
        error: 'אנא הזן קוד אימות',
        info: '',
      }));
      return;
    }

    if (!/^\d+$/.test(trimmedCode)) {
      setState((prev) => ({
        ...prev,
        error: 'הקוד חייב להכיל ספרות בלבד',
        info: '',
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      loading: true,
      error: '',
      info: '',
    }));

    setTimeout(() => {
      setState((prev) => ({
        ...prev,
        loading: false,
        info: 'הקוד אומת בהצלחה!',
      }));
    }, 600);
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-cyan-50 via-slate-50 to-blue-50 flex items-center justify-center px-4 py-16"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <header className="space-y-2 text-right">
          <p className="text-sm font-semibold text-cyan-600 uppercase tracking-widest">
            אימות דו-שלבי
          </p>
          <h1 className="text-3xl font-bold text-slate-900">התחברות באמצעות קוד חד-פעמי</h1>
          <p className="text-sm text-slate-500">
            הזן את מספר הטלפון שלך כדי לקבל קוד אימות ולהשלים את תהליך ההתחברות.
          </p>
        </header>

        <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
          <div
            className={`flex-1 rounded-full border px-3 py-2 text-center transition-colors ${
              isPhoneStep ? 'border-cyan-500 text-cyan-600 bg-cyan-50' : 'border-slate-200'
            }`}
          >
            מספר טלפון
          </div>
          <div
            className={`flex-1 rounded-full border px-3 py-2 text-center transition-colors ${
              !isPhoneStep ? 'border-cyan-500 text-cyan-600 bg-cyan-50' : 'border-slate-200'
            }`}
          >
            קוד אימות
          </div>
        </div>

        {state.error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        )}

        {state.info && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {state.info}
          </div>
        )}

        {isPhoneStep ? (
          <form className="space-y-5" onSubmit={handlePhoneSubmit}>
            <div className="space-y-2 text-right">
              <label htmlFor="phone" className="text-sm font-medium text-slate-700">
                מספר טלפון
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="לדוגמה: 053-375-2633"
                value={state.phone}
                onChange={handlePhoneChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                autoComplete="tel"
                disabled={state.loading}
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-full bg-gradient-to-r from-cyan-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.01] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              disabled={state.loading}
            >
              {state.loading ? 'שולח...' : 'שלח קוד'}
            </button>
          </form>
        ) : (
          <form className="space-y-5" onSubmit={handleCodeSubmit}>
            <div className="space-y-2 text-right">
              <label htmlFor="otp" className="text-sm font-medium text-slate-700">
                הזן את הקוד שנשלח אליך
              </label>
              <input
                id="otp"
                name="otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="לדוגמה: 123456"
                value={state.code}
                onChange={handleCodeChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                autoComplete="one-time-code"
                disabled={state.loading}
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-full bg-gradient-to-r from-cyan-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.01] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              disabled={state.loading}
            >
              {state.loading ? 'מאמת...' : 'אמת קוד'}
            </button>
            <button
              type="button"
              onClick={() =>
                setState((prev) => ({
                  ...initialState,
                  info: 'שלחנו קוד נוסף למספר שלך',
                  phone: prev.phone,
                }))
              }
              className="w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-cyan-300 hover:text-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={state.loading}
            >
              שלח קוד מחדש
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
