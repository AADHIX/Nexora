const nodemailer = require('nodemailer');
const twilio = require('twilio');
const logger = require('./logger');

// Setup Nodemailer transporter
let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for others
      auth: { user, pass },
    });
    logger.info('Nodemailer SMTP transporter initialized.');
  } else {
    logger.warn('Nodemailer SMTP credentials missing. Emails will be logged to console instead.');
  }
  return transporter;
};

/**
 * Sends an email notification.
 * @param {Object} options - { to, subject, html }
 */
const sendEmail = async ({ to, subject, html }) => {
  const mailTransporter = getTransporter();
  const mailOptions = {
    from: process.env.SMTP_FROM || '"Nexora Health" <noreply@nexorahealth.com>',
    to,
    subject,
    html,
  };

  if (mailTransporter) {
    try {
      const info = await mailTransporter.sendMail(mailOptions);
      logger.info(`Email successfully sent to ${to}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error(`Failed to send email to ${to}:`, error);
      return { success: false, error: error.message };
    }
  } else {
    logger.info(`[EMAIL DEMO MODE] Send to: ${to}\nSubject: ${subject}\nHTML: ${html.substring(0, 500)}...`);
    return { success: true, demoMode: true };
  }
};

/**
 * Helper to normalize phone numbers for Twilio and wa.me fallback
 * Ensures no non-digit characters remain except for '+' if present
 */
const cleanPhoneNumber = (phone) => {
  return phone.replace(/[^\d+]/g, '');
};

/**
 * Sends a WhatsApp notification using Twilio or falls back to logger.
 * @param {Object} options - { to, message }
 */
const sendWhatsApp = async ({ to, message }) => {
  const cleanPhone = cleanPhoneNumber(to);
  const formattedTo = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
  
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

  const waMeLink = `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(message)}`;

  if (accountSid && authToken) {
    try {
      const client = twilio(accountSid, authToken);
      const msg = await client.messages.create({
        body: message,
        from: fromWhatsAppNumber.startsWith('whatsapp:') ? fromWhatsAppNumber : `whatsapp:${fromWhatsAppNumber}`,
        to: `whatsapp:${formattedTo}`,
      });
      logger.info(`WhatsApp message successfully sent via Twilio to ${formattedTo}. SID: ${msg.sid}`);
      return { success: true, sid: msg.sid, fallbackUrl: waMeLink };
    } catch (error) {
      logger.error(`Failed to send WhatsApp via Twilio to ${formattedTo}:`, error);
      return { success: false, error: error.message, fallbackUrl: waMeLink };
    }
  } else {
    logger.info(`[WHATSAPP DEMO MODE] Send to: ${formattedTo}\nMessage: ${message}\nFallback Click-to-Chat Link: ${waMeLink}`);
    return { success: true, demoMode: true, fallbackUrl: waMeLink };
  }
};

module.exports = {
  sendEmail,
  sendWhatsApp,
  cleanPhoneNumber,
};
