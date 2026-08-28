const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const { sendEmail, sendWhatsApp } = require('../config/notifications');
const logger = require('../config/logger');

/**
 * @desc    Book a new appointment
 * @route   POST /api/appointments
 * @access  Public
 */
exports.bookAppointment = async (req, res) => {
  try {
    const {
      patientName,
      patientPhone,
      patientEmail,
      doctorId,
      date, // Expects YYYY-MM-DD
      timeSlot, // Expects HH:MM (24h)
      notes,
    } = req.body;

    if (!patientName || !patientPhone || !patientEmail || !doctorId || !date || !timeSlot) {
      return res.status(400).json({ success: false, error: 'Please provide all required fields' });
    }

    // 1. Verify doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, error: 'Doctor not found' });
    }

    // 2. Determine day of the week and verify if doctor is scheduled for this day/time
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const bookingDate = new Date(date);
    if (isNaN(bookingDate.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid date format' });
    }
    const dayName = daysOfWeek[bookingDate.getUTCDay()];

    const scheduledBlocks = doctor.schedule.filter((s) => s.day === dayName);
    if (scheduledBlocks.length === 0) {
      return res.status(400).json({ success: false, error: 'Doctor does not consult on this day of the week' });
    }

    // Helper: HH:MM to minutes
    const parseTime = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const targetMin = parseTime(timeSlot);
    let isWithinSchedule = false;

    scheduledBlocks.forEach((block) => {
      const startMin = parseTime(block.start);
      const endMin = parseTime(block.end);
      if (targetMin >= startMin && targetMin + 30 <= endMin) {
        isWithinSchedule = true;
      }
    });

    if (!isWithinSchedule) {
      return res.status(400).json({ success: false, error: 'Requested time is outside the doctor\'s working schedule' });
    }

    // 3. Formulate date-time in UTC
    const appointmentDateTime = new Date(`${date}T${timeSlot}:00.000Z`);

    // 4. Double booking validation: check database
    const alreadyBooked = await Appointment.findOne({
      doctorId,
      dateTime: appointmentDateTime,
      status: 'confirmed',
    });

    if (alreadyBooked) {
      return res.status(400).json({ success: false, error: 'This time slot is already booked for this doctor' });
    }

    // 5. Atomic save (Mongoose unique compound index handles potential concurrent race condition)
    let appointment;
    try {
      appointment = await Appointment.create({
        patientName,
        patientPhone,
        patientEmail,
        doctorId,
        dateTime: appointmentDateTime,
        notes: notes || '',
        status: 'confirmed',
      });
    } catch (dbErr) {
      // Mongo unique index error code is 11000
      if (dbErr.code === 11000) {
        logger.warn(`Concurrently blocked booking at ${appointmentDateTime.toISOString()} for Doctor ${doctorId}`);
        return res.status(400).json({ success: false, error: 'Double-booking conflict: This time slot was booked by another patient' });
      }
      throw dbErr;
    }

    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });

    const clinicAddress = 'Nexora Health, 12/A Hospital Ave, Medical District';

    // 6. Welcome / Booking Confirmation Email to Patient
    const emailHtml = `
      <div style="font-family: 'Outfit', 'Inter', Helvetica, Arial, sans-serif; color: #1e293b; background-color: #f8fafc; padding: 40px; margin: 0; max-width: 600px; border-radius: 12px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #0b192c; font-size: 28px; font-weight: 700; margin: 0;">NEXORA HEALTH</h1>
          <p style="color: #0d9488; font-size: 14px; font-weight: 600; text-transform: uppercase; margin: 4px 0 0 0;">Appointment Confirmed</p>
        </div>
        <div style="background-color: #ffffff; padding: 32px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <h2 style="color: #0f172a; font-size: 20px; font-weight: 600; margin-top: 0; margin-bottom: 16px;">Hello ${patientName},</h2>
          <p style="line-height: 1.6; margin-bottom: 16px;">Your appointment has been successfully scheduled. Below are the consultation details:</p>
          
          <div style="background-color: #f1f5f9; padding: 20px; border-radius: 6px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 500; width: 120px;">Doctor:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${doctor.name}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Specialty:</td>
                <td style="padding: 6px 0; color: #0f172a;">${doctor.specialty}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Date:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Time:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${timeSlot} (UTC)</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Clinic Address:</td>
                <td style="padding: 6px 0; color: #0f172a;">${clinicAddress}</td>
              </tr>
            </table>
          </div>
          
          <p style="line-height: 1.6; margin-bottom: 24px;">Please arrive 15 minutes early with a valid ID and any relevant medical history records.</p>
        </div>
        <div style="text-align: center; margin-top: 24px; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">Nexora Health Operations • 12/A Hospital Ave, Medical District</p>
          <p style="margin: 4px 0 0 0;">Need support? Reply to our coordination staff via WhatsApp.</p>
        </div>
      </div>
    `;

    await sendEmail({
      to: patientEmail,
      subject: `Confirmed: Appointment with ${doctor.name}`,
      html: emailHtml,
    });

    // 7. Send WhatsApp message to Patient (via Twilio)
    const whatsAppMessage = `Hi ${patientName},\n\nYour appointment with ${doctor.name} is confirmed for ${formattedDate} at ${timeSlot} (UTC).\nLocation: ${clinicAddress}.\n\nTo cancel or reschedule, please click here:\nhttps://wa.me/${doctor.phone.replace(/[^\d]/g, '')}?text=I%20wish%20to%20reschedule%20my%20appointment%20on%20${date}`;

    await sendWhatsApp({
      to: patientPhone,
      message: whatsAppMessage,
    });

    logger.info(`Booked appointment for ${patientName} with ${doctor.name} on ${date} ${timeSlot}`);
    res.status(201).json({ success: true, data: appointment });
  } catch (error) {
    logger.error('Error booking appointment:', error);
    res.status(500).json({ success: false, error: 'Server error booking appointment session' });
  }
};

/**
 * @desc    Get all appointments (Admin/Doctor, paginated, filtered)
 * @route   GET /api/appointments
 * @access  Private
 */
exports.getAppointments = async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '10');
    const skip = (page - 1) * limit;
    const { status, date } = req.query;

    const query = {};

    // Role-based scope limiting: Doctor only sees their own appointments
    if (req.user.role === 'doctor') {
      query.doctorId = req.user.doctorId;
    }

    if (status) {
      query.status = status;
    }

    if (date) {
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);
      query.dateTime = { $gte: startOfDay, $lte: endOfDay };
    }

    const total = await Appointment.countDocuments(query);
    const appointments = await Appointment.find(query)
      .populate('doctorId', 'name specialty')
      .sort({ dateTime: 1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        appointments,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching appointments:', error);
    res.status(500).json({ success: false, error: 'Server error retrieving appointments history' });
  }
};

/**
 * @desc    Update appointment status (Admin only)
 * @route   PUT /api/appointments/:id
 * @access  Private/Admin
 */
exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status update option' });
    }

    const appointment = await Appointment.findById(req.params.id).populate('doctorId', 'name');
    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    appointment.status = status;
    await appointment.save();

    logger.info(`Appointment status updated to ${status} for ${appointment.patientName}`);

    // If cancelled, notify the patient via email
    if (status === 'cancelled') {
      const cancellationHtml = `
        <div style="font-family: 'Outfit', 'Inter', Helvetica, Arial, sans-serif; color: #1e293b; background-color: #f8fafc; padding: 40px; margin: 0; max-width: 600px; border-radius: 12px; border: 1px solid #e2e8f0;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #ef4444; font-size: 28px; font-weight: 700; margin: 0;">NEXORA HEALTH</h1>
            <p style="color: #64748b; font-size: 14px; font-weight: 600; text-transform: uppercase; margin: 4px 0 0 0;">Cancellation Notice</p>
          </div>
          <div style="background-color: #ffffff; padding: 32px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <h2 style="color: #0f172a; font-size: 20px; font-weight: 600; margin-top: 0; margin-bottom: 16px;">Hello ${appointment.patientName},</h2>
            <p style="line-height: 1.6; margin-bottom: 16px;">Your scheduled consultation with <strong>${appointment.doctorId.name}</strong> has been cancelled.</p>
            
            <div style="background-color: #fef2f2; border: 1px solid #fee2e2; padding: 16px; border-radius: 6px; margin: 24px 0; color: #991b1b; font-size: 14px;">
              If this cancellation was unexpected, please book a new session or reach out to our primary patient care line.
            </div>
            
            <div style="text-align: center;">
              <a href="mailto:support@nexorahealth.com" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px;">Email Patient Care Support</a>
            </div>
          </div>
          <div style="text-align: center; margin-top: 24px; font-size: 12px; color: #94a3b8;">
            <p style="margin: 0;">Nexora Health Operations • 12/A Hospital Ave, Medical District</p>
          </div>
        </div>
      `;

      await sendEmail({
        to: appointment.patientEmail,
        subject: `Cancelled: Appointment with ${appointment.doctorId.name}`,
        html: cancellationHtml,
      });
    }

    res.status(200).json({ success: true, data: appointment });
  } catch (error) {
    logger.error(`Error updating appointment ${req.params.id}:`, error);
    res.status(500).json({ success: false, error: 'Server error updating appointment record' });
  }
};
