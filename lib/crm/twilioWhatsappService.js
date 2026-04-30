/**
 * Twilio WhatsApp Service - שירות אמיתי
 */

const TWILIO_CONFIG = {
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886', // Twilio Sandbox
};

export async function sendViaTwilio(to, message) {
  const { accountSid, authToken, whatsappNumber } = TWILIO_CONFIG;
  
  if (!accountSid || !authToken) {
    throw new Error('נדרשים פרטי Twilio - עקבי אחר ההוראות');
  }

  // נרמל מספר ישראלי
  let phoneNumber = to.replace(/\D/g, '');
  if (phoneNumber.startsWith('0')) {
    phoneNumber = '972' + phoneNumber.substring(1);
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: whatsappNumber,
        To: `whatsapp:+${phoneNumber}`,
        Body: message,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'שגיאה בשליחת הודעה');
    }

    return {
      success: true,
      messageId: data.sid,
      status: data.status,
      provider: 'twilio',
    };
  } catch (error) {
    console.error('Twilio error:', error);
    throw error;
  }
}
