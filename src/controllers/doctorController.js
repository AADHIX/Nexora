const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const logger = require('../config/logger');

// Helper: Parse 'HH:MM' string to total minutes from start of day
const parseTimeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper: Format minutes back to 'HH:MM' string
const formatMinutesToTime = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * @desc    Get all doctors (public with filters)
 * @route   GET /api/doctors
 * @access  Public
 */
exports.getDoctors = async (req, res) => {
  try {
    const { specialty, search } = req.query;
    const query = {};

    if (specialty) {
      query.specialty = specialty;
    }

    if (search) {
      // Case-insensitive search on doctor name
      query.name = { $regex: search, $options: 'i' };
    }

    const doctors = await Doctor.find(query);
    res.status(200).json({ success: true, data: doctors });
  } catch (error) {
    logger.error('Error fetching doctors:', error);
    res.status(500).json({ success: false, error: 'Server error retrieving doctor profiles' });
  }
};

/**
 * @desc    Get single doctor
 * @route   GET /api/doctors/:id
 * @access  Public
 */
exports.getDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, error: 'Doctor not found' });
    }
    res.status(200).json({ success: true, data: doctor });
  } catch (error) {
    logger.error(`Error fetching doctor ${req.params.id}:`, error);
    res.status(500).json({ success: false, error: 'Server error retrieving doctor details' });
  }
};

/**
 * @desc    Get available slots for a doctor on a specific date
 * @route   GET /api/doctors/:id/slots
 * @access  Public
 */
exports.getAvailableSlots = async (req, res) => {
  try {
    const { date } = req.query; // Expecting YYYY-MM-DD
    const doctorId = req.params.id;

    if (!date) {
      return res.status(400).json({ success: false, error: 'Please provide a date parameter (YYYY-MM-DD)' });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, error: 'Doctor not found' });
    }

    // Determine the day of the week in UTC to avoid offset shifts
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const queryDate = new Date(date);
    if (isNaN(queryDate.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid date format' });
    }
    const dayName = daysOfWeek[queryDate.getUTCDay()];

    // Find the doctor's scheduled time blocks for this specific day
    const schedulesForDay = doctor.schedule.filter((s) => s.day === dayName);

    if (schedulesForDay.length === 0) {
      return res.status(200).json({ success: true, data: [] }); // Doctor doesn't work this day
    }

    // Generate potential 30-minute slots
    let rawSlots = [];
    schedulesForDay.forEach((sched) => {
      let currentMin = parseTimeToMinutes(sched.start);
      const endMin = parseTimeToMinutes(sched.end);

      while (currentMin + 30 <= endMin) {
        rawSlots.push(formatMinutesToTime(currentMin));
        currentMin += 30;
      }
    });

    // Query existing CONFIRMED appointments for this doctor on that day
    // We fetch bookings between 00:00:00 and 23:59:59 of the target date in UTC
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const appointments = await Appointment.find({
      doctorId,
      dateTime: { $gte: startOfDay, $lte: endOfDay },
      status: 'confirmed',
    });

    // Extract booked slots. We format the booking hours and minutes to match HH:MM
    const bookedSlots = appointments.map((appt) => {
      const apptDate = new Date(appt.dateTime);
      const hours = apptDate.getUTCHours().toString().padStart(2, '0');
      const minutes = apptDate.getUTCMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    });

    // Filter out the booked slots
    const availableSlots = rawSlots.filter((slot) => !bookedSlots.includes(slot));

    res.status(200).json({ success: true, data: availableSlots });
  } catch (error) {
    logger.error('Error fetching doctor slots:', error);
    res.status(500).json({ success: false, error: 'Server error calculating available time slots' });
  }
};
