'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, User, Mail, Phone, Lock, MapPin, AlertCircle, CheckCircle } from 'lucide-react';

export default function RegisterBusinessPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    // Business info
    businessName: '',
    slug: '',
    // Owner info
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    // Contact info
    address: '',
    whatsapp: '',
  });

  const generateSlug = (name) => {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleBusinessNameChange = (value) => {
    setFormData({
      ...formData,
      businessName: value,
      slug: generateSlug(value),
    });
  };

  const validateStep1 = () => {
    if (!formData.businessName.trim()) {
      setError('יש להזין שם עסק');
      return false;
    }
    if (!formData.slug.trim() || formData.slug.length < 3) {
      setError('מזהה העסק חייב להכיל לפחות 3 תווים');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.fullName.trim()) {
      setError('יש להזין שם מלא');
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('יש להזין כתובת אימייל תקינה');
      return false;
    }
    if (!formData.phone.trim()) {
      setError('יש להזין מספר טלפון');
      return false;
    }
    if (!formData.password || formData.password.length < 8) {
      setError('הסיסמה חייבת להכיל לפחות 8 תווים, מספר אחד ואות אחת');
      return false;
    }
    if (!/\d/.test(formData.password)) {
      setError('הסיסמה חייבת להכיל לפחות מספר אחד');
      return false;
    }
    if (!/[a-zA-Zא-ת]/.test(formData.password)) {
      setError('הסיסמה חייבת להכיל לפחות אות אחת');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/register-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: formData.businessName,
          slug: formData.slug,
          owner: {
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            password: formData.password,
          },
          contact: {
            email: formData.email,
            phone: formData.phone,
            whatsapp: formData.whatsapp || formData.phone,
            address: formData.address,
          },
        }),
      });

      // Try to parse JSON response
      let data;
      try {
        data = await res.json();
      } catch {
        // If JSON parsing fails, it's a server error
        throw new Error('שגיאת שרת - נסה שוב מאוחר יותר');
      }
      
      if (!res.ok) {
        // Show the specific error from API
        throw new Error(data.error || 'שגיאה ברישום העסק');
      }

      setSuccess(true);
      
      // Redirect after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
      
    } catch (err) {
      // Display the error message to user
      setError(err.message || 'שגיאה לא צפויה - נסה שוב');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-3 sm:px-4" dir="rtl">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">הבקשה נשלחה בהצלחה!</h1>
            <p className="text-gray-600 mb-4">
              העסק שלך נרשם וממתין לאישור. נודיע לך באימייל כשהעסק יאושר.
            </p>
            <p className="text-sm text-gray-500">מעביר לדף ההתחברות...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-3 sm:px-4 py-6 sm:py-8" dir="rtl">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
            <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">פתיחת עסק חדש</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">הצטרף לפלטפורמת VIPO ומכור ללקוחות שלך</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-4 sm:mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                  step >= s ? 'text-white' : 'bg-gray-200 text-gray-600'
                }`}
                style={step >= s ? { background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' } : {}}
              >
                {s}
              </div>
              {s < 3 && (
                <div className={`w-8 sm:w-12 h-1 mx-1 rounded ${step > s ? 'bg-cyan-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div
          className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8"
          style={{
            border: '2px solid transparent',
            backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
          }}
        >
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 text-red-700 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Step 1: Business Info */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">פרטי העסק</h2>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">שם העסק *</label>
                  <div className="relative">
                    <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.businessName}
                      onChange={(e) => handleBusinessNameChange(e.target.value)}
                      className="w-full pr-10 pl-3 sm:pl-4 py-2.5 sm:py-3 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm sm:text-base"
                      placeholder="שם העסק שלך"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">מזהה עסק (Slug) *</label>
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">vipo.co.il/t/</span>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: generateSlug(e.target.value) })}
                      className="w-full pr-24 pl-4 py-3 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 font-mono text-sm"
                      placeholder="my-business"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    הכתובת של החנות שלך: vipo.co.il/t/{formData.slug || 'my-business'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full py-3 text-white font-medium rounded-lg mt-4"
                  style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                >
                  המשך
                </button>
              </div>
            )}

            {/* Step 2: Owner Info */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">פרטי בעל העסק</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא *</label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full pr-10 pl-4 py-3 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      placeholder="ישראל ישראלי"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">אימייל *</label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pr-10 pl-4 py-3 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      placeholder="email@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">טלפון *</label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pr-10 pl-4 py-3 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      placeholder="053-375-2633"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה *</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pr-10 pl-4 py-3 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      placeholder="לפחות 8 תווים, מספר ואות"
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">אימות סיסמה *</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full pr-10 pl-4 py-3 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      placeholder="הזן שוב את הסיסמה"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 border rounded-lg font-medium hover:bg-gray-50"
                  >
                    חזור
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex-1 py-3 text-white font-medium rounded-lg"
                    style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                  >
                    המשך
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Contact Info */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">פרטי קשר (אופציונלי)</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">כתובת העסק</label>
                  <div className="relative">
                    <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full pr-10 pl-4 py-3 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      placeholder="רחוב, עיר"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">מספר וואטסאפ</label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      className="w-full pr-10 pl-4 py-3 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      placeholder="השאר ריק להשתמש במספר הטלפון"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 p-3 sm:p-4 rounded-lg text-xs sm:text-sm text-blue-800 mt-4">
                  <strong>שים לב:</strong> לאחר שליחת הבקשה, העסק יהיה בסטטוס &quot;ממתין לאישור&quot;. 
                  נבדוק את הפרטים ונאשר את העסק בהקדם.
                </div>

                <div className="flex gap-2 sm:gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 py-2.5 sm:py-3 border rounded-lg font-medium hover:bg-gray-50 text-sm sm:text-base"
                  >
                    חזור
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 sm:py-3 text-white font-medium rounded-lg disabled:opacity-50 text-sm sm:text-base"
                    style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                  >
                    {loading ? 'שולח...' : 'שלח בקשה'}
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Footer */}
          <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-600">
            כבר יש לך עסק?{' '}
            <Link href="/login" className="text-cyan-600 hover:underline font-medium">
              התחבר כאן
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
