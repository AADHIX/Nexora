const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const { sendEmail, sendWhatsApp } = require('../config/notifications');
const logger = require('../config/logger');

/**
 * @desc    Register a new patient
 * @route   POST /api/patients
 * @access  Public
 */
exports.registerPatient = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      dob,
      gender,
      phone,
      email,
      address,
      bloodGroup,
      knownAllergies,
      symptoms,
      primaryDoctor,
    } = req.body;

    // Check doctor existence
    const doctor = await Doctor.findById(primaryDoctor);
    if (!doctor) {
      return res.status(404).json({ success: false, error: 'Assigned doctor not found' });
    }

    // Save record
    const patient = await Patient.create({
      firstName,
      lastName,
      dob,
      gender,
      phone,
      email,
      address,
      bloodGroup,
      knownAllergies: knownAllergies || 'None',
      symptoms,
      primaryDoctor,
    });

    const patientName = `${firstName} ${lastName}`;

    // 1. Send Welcome Email to Patient
    const welcomeHtml = `
      <div style="font-family: 'Outfit', 'Inter', Helvetica, Arial, sans-serif; color: #1e293b; background-color: #f8fafc; padding: 40px; margin: 0; max-width: 600px; border-radius: 12px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #0b192c; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.025em;">NEXORA HEALTH</h1>
          <p style="color: #0d9488; font-size: 14px; font-weight: 600; text-transform: uppercase; margin: 4px 0 0 0; letter-spacing: 0.05em;">Care Coordination Services</p>
        </div>
        <div style="background-color: #ffffff; padding: 32px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <h2 style="color: #0f172a; font-size: 20px; font-weight: 600; margin-top: 0; margin-bottom: 16px;">Welcome, ${patientName}!</h2>
          <p style="line-height: 1.6; margin-bottom: 16px;">Thank you for registering with Nexora Health. We have successfully recorded your intake information and matched you with your coordinating medical doctor.</p>
          
          <div style="background-color: #f1f5f9; padding: 20px; border-radius: 6px; margin: 24px 0;">
            <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 14px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">Your Registration Details</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 500; width: 140px;">Primary Doctor:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${doctor.name}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Specialty Area:</td>
                <td style="padding: 6px 0; color: #0f172a;">${doctor.specialty}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Contact Phone:</td>
                <td style="padding: 6px 0; color: #0f172a;">${phone}</td>
              </tr>
            </table>
          </div>
          
          <p style="line-height: 1.6; margin-bottom: 24px;">Our patient support team will contact you shortly to complete your scheduling consultation and guide you through admission arrangements.</p>
          <div style="text-align: center;">
            <a href="https://wa.me/${doctor.phone.replace(/[^\d]/g, '')}" style="display: inline-block; background-color: #0d9488; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(13, 148, 136, 0.25);">Chat with Doctor on WhatsApp</a>
          </div>
        </div>
        <div style="text-align: center; margin-top: 24px; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">Nexora Health Operations • 12/A Hospital Ave, Medical District</p>
          <p style="margin: 4px 0 0 0;">This is an automated operational notification. Please do not reply directly.</p>
        </div>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: 'Welcome to Nexora Health - Registration Confirmed',
      html: welcomeHtml,
    });

    // 2. Send WhatsApp Notification to assigned Doctor
    const docMessage = `Nexora Health Alert: A new patient has been assigned to you.\nName: ${patientName}\nPhone: ${phone}\nSymptoms: ${symptoms.substring(0, 100)}${symptoms.length > 100 ? '...' : ''}\nLogin to your doctor dashboard to review.`;
    
    await sendWhatsApp({
      to: doctor.phone,
      message: docMessage,
    });

    logger.info(`Registered patient ${patientName} successfully.`);
    res.status(201).json({ success: true, data: patient });
  } catch (error) {
    logger.error('Error registering patient:', error);
    res.status(500).json({ success: false, error: 'Server error registering patient intake profile' });
  }
};

/**
 * @desc    Get all patients (Admin only, paginated + searched)
 * @route   GET /api/patients
 * @access  Private/Admin
 */
exports.getPatients = async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '10');
    const skip = (page - 1) * limit;
    const { search } = req.query;

    const query = { isActive: true };

    // Limit doctors to only view patients assigned to them
    if (req.user.role === 'doctor') {
      query.primaryDoctor = req.user.doctorId;
    }

    if (search) {
      // If full text index is used, we can query by $text search
      // Fallback: simple case-insensitive regex search
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { symptoms: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Patient.countDocuments(query);
    const patients = await Patient.find(query)
      .populate('primaryDoctor', 'name specialty')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        patients,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching patients:', error);
    res.status(500).json({ success: false, error: 'Server error retrieving patients list' });
  }
};

/**
 * @desc    Get single patient (Admin/Doctor, scoped)
 * @route   GET /api/patients/:id
 * @access  Private
 */
exports.getPatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).populate('primaryDoctor', 'name specialty email phone');

    if (!patient || !patient.isActive) {
      return res.status(404).json({ success: false, error: 'Patient profile not found' });
    }

    // Role scope restriction: Doctor can only view patients assigned to them
    if (req.user.role === 'doctor') {
      // Find doctor profile mapped to the logged-in doctor user
      if (patient.primaryDoctor._id.toString() !== req.user.doctorId.toString()) {
        return res.status(403).json({ success: false, error: 'Access denied: You are not the assigned doctor for this patient' });
      }
    }

    res.status(200).json({ success: true, data: patient });
  } catch (error) {
    logger.error(`Error fetching patient ${req.params.id}:`, error);
    res.status(500).json({ success: false, error: 'Server error retrieving patient profile' });
  }
};

/**
 * @desc    Update patient record
 * @route   PUT /api/patients/:id
 * @access  Private/Admin
 */
exports.updatePatient = async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!patient || !patient.isActive) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    logger.info(`Patient updated: ${patient.firstName} ${patient.lastName}`);
    res.status(200).json({ success: true, data: patient });
  } catch (error) {
    logger.error(`Error updating patient ${req.params.id}:`, error);
    res.status(500).json({ success: false, error: 'Server error updating patient details' });
  }
};

/**
 * @desc    Soft delete patient (Admin only)
 * @route   DELETE /api/patients/:id
 * @access  Private/Admin
 */
exports.deletePatient = async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });

    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    logger.info(`Soft-deleted patient: ${patient.firstName} ${patient.lastName}`);
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    logger.error(`Error soft deleting patient ${req.params.id}:`, error);
    res.status(500).json({ success: false, error: 'Server error deleting patient record' });
  }
};
