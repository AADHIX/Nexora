const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
  day: {
    type: String,
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  },
  start: {
    type: String,
    required: true,
    match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Please provide a valid start time in HH:MM format'],
  },
  end: {
    type: String,
    required: true,
    match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Please provide a valid end time in HH:MM format'],
  },
});

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide doctor name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide doctor email'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Please provide doctor phone number'],
    },
    specialty: {
      type: String,
      required: [true, 'Please provide doctor specialty'],
      enum: {
        values: [
          'Cosmetic & Aesthetic Treatments',
          'General Surgical Assistance',
          'Orthopedic & Spine Care',
          'Dental & Smile Care',
          'Patient Coordination Services',
        ],
        message: 'Invalid specialty category selected',
      },
    },
    degrees: {
      type: String,
      required: [true, 'Please provide doctor degrees (e.g. MBBS, MD, DDS)'],
      trim: true,
    },
    schedule: {
      type: [timeSlotSchema],
      default: [],
    },
    profilePhoto: {
      type: String,
      default: '/assets/placeholder-doctor.png',
    },
  },
  {
    timestamps: true,
  }
);

const Doctor = mongoose.model('Doctor', doctorSchema);
module.exports = Doctor;
