const ContactMessage = require('../models/ContactMessage');
const { sendEmail } = require('../config/notifications');
const logger = require('../config/logger');

/**
 * @desc    Submit contact message / lead
 * @route   POST /api/contact
 * @access  Public
 */
exports.submitContact = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !phone || !subject || !message) {
      return res.status(400).json({ success: false, error: 'Please provide all required fields' });
    }

    const contact = await ContactMessage.create({
      name,
      email,
      phone,
      subject,
      message,
    });

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@nexora.com';

    // Email to Admin
    const emailHtml = `
      <div style="font-family: 'Outfit', 'Inter', Helvetica, Arial, sans-serif; color: #1e293b; background-color: #f8fafc; padding: 40px; margin: 0; max-width: 600px; border-radius: 12px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #0b192c; font-size: 28px; font-weight: 700; margin: 0;">NEXORA HEALTH</h1>
          <p style="color: #0d9488; font-size: 14px; font-weight: 600; text-transform: uppercase; margin: 4px 0 0 0;">New Lead Received</p>
        </div>
        <div style="background-color: #ffffff; padding: 32px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <h2 style="color: #0f172a; font-size: 18px; font-weight: 600; margin-top: 0; margin-bottom: 16px;">Lead Details</h2>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 500; width: 100px;">Name:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Email:</td>
              <td style="padding: 6px 0; color: #0f172a;"><a href="mailto:${email}" style="color: #0d9488; text-decoration: none;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Phone:</td>
              <td style="padding: 6px 0; color: #0f172a;">${phone}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Subject:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${subject}</td>
            </tr>
          </table>
          
          <div style="background-color: #f1f5f9; padding: 16px; border-radius: 6px;">
            <h3 style="margin-top: 0; margin-bottom: 8px; font-size: 12px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">Message</h3>
            <p style="font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap; color: #334155;">${message}</p>
          </div>
        </div>
      </div>
    `;

    await sendEmail({
      to: adminEmail,
      subject: `[New Lead] Nexora Contact: ${subject}`,
      html: emailHtml,
    });

    logger.info(`New contact inquiry received from ${name} (${email}).`);

    // Pre-filled WhatsApp click-to-chat link
    const waMeLink = `https://wa.me/15550100100?text=Hello%20Nexora%20Health,%20my%20name%20is%20${encodeURIComponent(name)}.%20I%20have%20an%20inquiry%20regarding%20${encodeURIComponent(subject)}`;

    res.status(201).json({
      success: true,
      data: contact,
      whatsappLink: waMeLink,
    });
  } catch (error) {
    logger.error('Error submitting contact details:', error);
    res.status(500).json({ success: false, error: 'Server error processing contact lead request' });
  }
};

/**
 * @desc    Get all contact messages (Admin only)
 * @route   GET /api/contact
 * @access  Private/Admin
 */
exports.getContacts = async (req, res) => {
  try {
    const contacts = await ContactMessage.find({}).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: contacts });
  } catch (error) {
    logger.error('Error fetching contact messages:', error);
    res.status(500).json({ success: false, error: 'Server error retrieving contact logs' });
  }
};
