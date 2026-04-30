import { Resend } from 'resend';

let resendClient = null;

function getResendClient() {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

// Log error to database for admin monitoring
async function logEmailError(message, metadata = {}) {
  try {
    const { getDb } = await import('@/lib/db');
    const db = await getDb();
    await db.collection('error_logs').insertOne({
      level: 'error',
      message,
      source: 'email',
      metadata,
      resolved: false,
      createdAt: new Date()
    });
  } catch (e) {
    console.error('[EMAIL] Failed to log error to DB:', e);
  }
}

export async function sendEmail({ to, subject, html, text }) {
  if (!to) {
    throw new Error('EMAIL_MISSING_RECIPIENT');
  }

  const resend = getResendClient();
  const from = process.env.EMAIL_FROM || 'VIPO <vipogroup1@gmail.com>';

  try {
    const result = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
    });
    console.log('[EMAIL] Sent successfully via Resend to:', to);
    return result;
  } catch (error) {
    const errorMsg = error?.message || 'Failed to send email';
    console.error('[EMAIL] Resend error:', errorMsg);
    
    // Log to database for admin monitoring
    await logEmailError(`שגיאת שליחת מייל: ${errorMsg}`, {
      to,
      subject,
      from,
      errorDetails: error?.response?.body || error?.statusCode || null
    });
    
    throw new Error(errorMsg);
  }
}
