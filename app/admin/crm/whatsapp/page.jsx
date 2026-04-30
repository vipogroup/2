'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function WhatsAppPage() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [myPhone, setMyPhone] = useState('');
  const [incomingMessages, setIncomingMessages] = useState([]);

  // חיבור אוטומטי בטעינה + עדכון הודעות כל 3 שניות
  useEffect(() => {
    connectToWhatsApp();
    fetchTemplates();
    fetchIncomingMessages();
    
    const interval = setInterval(() => {
      fetchIncomingMessages();
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchIncomingMessages = async () => {
    try {
      const res = await fetch('/api/crm/whatsapp/messages');
      const data = await res.json();
      if (data.messages) {
        // Filter only incoming messages
        const incoming = data.messages.filter(m => m.type === 'incoming');
        setIncomingMessages(incoming);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const connectToWhatsApp = async () => {
    setConnecting(true);
    try {
      // בדוק סטטוס מהשרת
      const res = await fetch('/api/crm/whatsapp/status');
      const data = await res.json();
      if (data.ready) {
        setConnected(true);
        setMyPhone(data.info?.phone || '');
      }
    } catch (error) {
      console.error('Connection error:', error);
    }
    setConnecting(false);
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/crm/templates?channel=whatsapp');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const simulateIncoming = async () => {
    try {
      const res = await fetch('/api/crm/whatsapp/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: '0533752633',
          message: 'שלום! קיבלתי את ההודעה שלכם. מעוניין לשמוע עוד על המערכת'
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIncomingMessages(prev => [data.message, ...prev]);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSend = async () => {
    if (!phone || !message) {
      alert('נא למלא טלפון והודעה');
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const res = await fetch('/api/crm/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone, message }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setResult({ success: true, ...data });
        setMessage('');
      } else {
        setResult({ success: false, error: data.error });
      }
    } catch (error) {
      setResult({ success: false, error: error.message });
    } finally {
      setSending(false);
    }
  };

  const applyTemplate = (template) => {
    setMessage(template.content);
  };

  return (
    <main className="min-h-screen bg-white p-3 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/admin/crm" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <h1
            className="text-xl sm:text-2xl md:text-3xl font-bold"
            style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            שליחת וואטסאפ
          </h1>
        </div>

        {/* Status Banner */}
        <div className={`rounded-lg p-4 flex items-center gap-3 ${
          connected ? 'bg-green-50 border border-green-200' : 
          connecting ? 'bg-yellow-50 border border-yellow-200' :
          'bg-gray-50 border border-gray-200'
        }`}>
          <svg className={`w-6 h-6 ${
            connected ? 'text-green-600' : 
            connecting ? 'text-yellow-600' :
            'text-gray-600'
          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {connected ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
          </svg>
          <div className="flex-1">
            <p className={`font-medium ${
              connected ? 'text-green-800' : 
              connecting ? 'text-yellow-800' :
              'text-gray-800'
            }`}>
              {connected 
                ? `מחובר ל-VIPO WhatsApp (${myPhone})` 
                : connecting
                  ? 'מתחבר...'
                  : 'לא מחובר'}
            </p>
            {connected && (
              <p className="text-sm text-green-700 mt-1">
                מוכן לשליחת הודעות למשקיעים
              </p>
            )}
          </div>
          {connected && (
            <span className="flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          )}
        </div>


        {/* Send Message Form */}
        <div
          className="rounded-xl p-6 shadow-md"
          style={{
            border: '2px solid transparent',
            backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
          }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#1e3a8a' }}>
            שלח הודעה
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                מספר טלפון *
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05X-XXXXXXX"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                הודעה *
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="הקלד את ההודעה..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            {result && (
              <div className={`p-4 rounded-lg ${
                result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                {result.success ? (
                  <p>ההודעה נשלחה בהצלחה! (ID: {result.messageId})</p>
                ) : (
                  <p>שגיאה: {result.error}</p>
                )}
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full px-4 py-3 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' }}
            >
              {sending ? (
                'שולח...'
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  שלח בוואטסאפ
                </>
              )}
            </button>
          </div>
        </div>

        {/* Incoming Messages Demo */}
        <div
          className="rounded-xl p-6 shadow-md"
          style={{
            border: '2px solid transparent',
            backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: '#1e3a8a' }}>
              הודעות נכנסות (להדגמה)
            </h2>
            <button
              onClick={simulateIncoming}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              סמלץ הודעה נכנסת
            </button>
          </div>
          
          {incomingMessages.length === 0 ? (
            <p className="text-gray-500 text-sm">אין הודעות נכנסות עדיין</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {incomingMessages.filter(msg => msg).map((msg, idx) => (
                <div key={msg.id || idx} className="p-3 bg-green-50 rounded-lg border-r-4 border-green-500">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-green-800">{msg.from || 'לא ידוע'}</span>
                    <span className="text-xs text-gray-500">
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('he-IL') : ''}
                    </span>
                  </div>
                  <p className="text-gray-700">{msg.message || ''}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Templates */}
        {templates.length > 0 && (
          <div
            className="rounded-xl p-6 shadow-md"
            style={{
              border: '2px solid transparent',
              backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
            }}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#1e3a8a' }}>
              תבניות מהירות
            </h2>
            <div className="grid gap-3">
              {templates.map((template) => (
                <button
                  key={template._id}
                  onClick={() => applyTemplate(template)}
                  className="text-right p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">{template.name}</div>
                  <div className="text-sm text-gray-500 line-clamp-1">{template.content}</div>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
