const { body, validationResult } = require('express-validator');

// Helper to handle validation errors
const checkValidationResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Return the message of the first validation error
    return res.status(400).json({
      success: false,
      error: errors.array()[0].msg,
    });
  }
  next();
};

// Patient intake validation rules
exports.patientRules = [
  body('firstName').trim().notEmpty().withMessage('First name is required').isString().withMessage('First name must be a string'),
  body('lastName').trim().notEmpty().withMessage('Last name is required').isString().withMessage('Last name must be a string'),
  body('dob')
    .notEmpty()
    .withMessage('Date of birth is required')
    .isISO8601()
    .withMessage('Date of birth must be a valid date')
    .custom((val) => {
      if (new Date(val) > new Date()) {
        throw new Error('Date of birth cannot be in the future');
      }
      return true;
    }),
  body('gender').notEmpty().withMessage('Gender is required').isIn(['male', 'female', 'other']).withMessage('Gender must be male, female, or other'),
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid E.164 formatted phone number (e.g. +15551234567)'),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Please enter a valid email address'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('bloodGroup')
    .notEmpty()
    .withMessage('Blood group is required')
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .withMessage('Invalid blood group'),
  body('symptoms').trim().notEmpty().withMessage('Symptoms description is required'),
  body('primaryDoctor').notEmpty().withMessage('Primary doctor ID is required').isMongoId().withMessage('Invalid doctor ID format'),
  checkValidationResult,
];

// Appointment booking validation rules
exports.appointmentRules = [
  body('patientName').trim().notEmpty().withMessage('Patient name is required'),
  body('patientPhone')
    .notEmpty()
    .withMessage('Patient phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please enter a valid E.164 phone number'),
  body('patientEmail').trim().notEmpty().withMessage('Patient email is required').isEmail().withMessage('Please enter a valid email address'),
  body('doctorId').notEmpty().withMessage('Doctor ID is required').isMongoId().withMessage('Invalid doctor ID format'),
  body('date')
    .notEmpty()
    .withMessage('Date is required')
    .isISO8601()
    .withMessage('Date must be in YYYY-MM-DD format')
    .custom((val) => {
      // Allow booking for today or in the future
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(val) < today) {
        throw new Error('Appointment date cannot be in the past');
      }
      return true;
    }),
  body('timeSlot')
    .notEmpty()
    .withMessage('Time slot is required')
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage('Time slot must be in HH:MM 24-hour format'),
  body('notes').optional().trim(),
  checkValidationResult,
];

// Contact form message validation rules
exports.contactRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Please enter a valid email address'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('message').trim().notEmpty().withMessage('Message body is required'),
  checkValidationResult,
];

// Login authentication validation rules
exports.loginRules = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Please enter a valid email address'),
  body('password').notEmpty().withMessage('Password is required'),
  checkValidationResult,
];
