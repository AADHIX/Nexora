require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const mongoose = require('mongoose');

// Configurations & Database
const connectDB = require('./src/config/db');
const logger = require('./src/config/logger');

// Middlewares
const errorHandler = require('./src/middleware/errorMiddleware');
const { protect, authorize } = require('./src/middleware/authMiddleware');
const {
  apiLimiter,
  authLimiter,
  mongoSanitize,
  xssClean,
} = require('./src/middleware/securityMiddleware');

// Validation Rules
const {
  loginRules,
  patientRules,
  appointmentRules,
  contactRules,
} = require('./src/middleware/validationRules');

// Controllers
const authController = require('./src/controllers/authController');
const doctorController = require('./src/controllers/doctorController');
const patientController = require('./src/controllers/patientController');
const appointmentController = require('./src/controllers/appointmentController');
const contactController = require('./src/controllers/contactController');

// Initialize Express App
const app = express();

// Connect to Database
connectDB();

// Security Headers Setup
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://*.unsplash.com"],
        connectSrc: ["'self'"],
      },
    },
  })
);

// Enable CORS
app.use(
  cors({
    origin: true, // Allow all for local, update to strict frontend domain in prod
    credentials: true,
  })
);

// Body Parsers & Cookie Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Anti-injection & XSS Sanitization Middlewares
app.use(mongoSanitize);
app.use(xssClean);

// Request Logger
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  next();
});

// Serve Static Frontend Assets from /public
app.use(express.static(path.join(__dirname, 'public')));

// Rate Limiting on API endpoints
app.use('/api', apiLimiter);

// ----------------- API Endpoints Mappings -----------------

// Health Check (uptime, database state)
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.status(200).json({
    success: true,
    data: {
      uptime: process.uptime(),
      database: states[dbState] || 'unknown',
      timestamp: new Date(),
    },
  });
});

// Authentication Endpoints
app.post('/api/auth/login', authLimiter, loginRules, authController.login);
app.post('/api/auth/logout', authController.logout);
app.get('/api/auth/me', protect, authController.getMe);

// Doctors Directory Endpoints
app.get('/api/doctors', doctorController.getDoctors);
app.get('/api/doctors/:id', doctorController.getDoctor);
app.get('/api/doctors/:id/slots', doctorController.getAvailableSlots);

// Patients Registration & CRUD (Admin/Doctor restricted)
app.post('/api/patients', patientRules, patientController.registerPatient);
app.get('/api/patients', protect, authorize('admin', 'doctor'), patientController.getPatients);
app.get('/api/patients/:id', protect, authorize('admin', 'doctor'), patientController.getPatient);
app.put('/api/patients/:id', protect, authorize('admin'), patientController.updatePatient);
app.delete('/api/patients/:id', protect, authorize('admin'), patientController.deletePatient);

// Appointment Booking & Tracking Endpoints
app.post('/api/appointments', appointmentRules, appointmentController.bookAppointment);
app.get('/api/appointments', protect, authorize('admin', 'doctor'), appointmentController.getAppointments);
app.put('/api/appointments/:id', protect, authorize('admin'), appointmentController.updateAppointmentStatus);

// Contact Leads Endpoints
app.post('/api/contact', contactRules, contactController.submitContact);
app.get('/api/contact', protect, authorize('admin'), contactController.getContacts);

// Fallback to index.html for undefined frontend routes (SPA feel)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global Error Handler Middleware
app.use(errorHandler);

// Listen to Requests
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Unhandled Promise Rejections Safety Net
process.on('unhandledRejection', (err) => {
  logger.error(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});
