require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Doctor = require('./src/models/Doctor');
const Patient = require('./src/models/Patient');
const Appointment = require('./src/models/Appointment');
const ContactMessage = require('./src/models/ContactMessage');
const connectDB = require('./src/config/db');
const logger = require('./src/config/logger');

const doctorsData = [
  {
    name: 'Dr. Sarah Jenkins',
    email: 'sarah.jenkins@nexora.com',
    phone: '+15550100101',
    specialty: 'Cosmetic & Aesthetic Treatments',
    degrees: 'MD - Dermatology, Board Certified Plastic Surgeon',
    profilePhoto: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300',
    schedule: [
      { day: 'Monday', start: '09:00', end: '13:00' },
      { day: 'Wednesday', start: '09:00', end: '13:00' },
      { day: 'Friday', start: '13:00', end: '17:00' },
    ],
  },
  {
    name: 'Dr. Marcus Vance',
    email: 'marcus.vance@nexora.com',
    phone: '+15550100102',
    specialty: 'Cosmetic & Aesthetic Treatments',
    degrees: 'MBBS, MS - Plastic & Reconstructive Surgery',
    profilePhoto: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300',
    schedule: [
      { day: 'Tuesday', start: '10:00', end: '14:00' },
      { day: 'Thursday', start: '14:00', end: '18:00' },
    ],
  },
  {
    name: 'Dr. Elena Rostova',
    email: 'elena.rostova@nexora.com',
    phone: '+15550100103',
    specialty: 'General Surgical Assistance',
    degrees: 'MD, FACS - Laparoscopic & Bariatric Specialist',
    profilePhoto: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=300',
    schedule: [
      { day: 'Monday', start: '10:00', end: '16:00' },
      { day: 'Wednesday', start: '10:00', end: '16:00' },
    ],
  },
  {
    name: 'Dr. David Kim',
    email: 'david.kim@nexora.com',
    phone: '+15550100104',
    specialty: 'General Surgical Assistance',
    degrees: 'MD, FRCS - General Surgery & Gastrointestinal Care',
    profilePhoto: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=300',
    schedule: [
      { day: 'Tuesday', start: '09:00', end: '15:00' },
      { day: 'Friday', start: '09:00', end: '15:00' },
    ],
  },
  {
    name: 'Dr. Aditi Sharma',
    email: 'aditi.sharma@nexora.com',
    phone: '+15550100105',
    specialty: 'Orthopedic & Spine Care',
    degrees: 'MS - Orthopedics, Joint Replacement Fellow',
    profilePhoto: 'https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?auto=format&fit=crop&q=80&w=300',
    schedule: [
      { day: 'Monday', start: '09:00', end: '12:00' },
      { day: 'Thursday', start: '13:00', end: '17:00' },
    ],
  },
  {
    name: 'Dr. Liam O\'Connor',
    email: 'liam.oconnor@nexora.com',
    phone: '+15550100106',
    specialty: 'Orthopedic & Spine Care',
    degrees: 'MD - Spine Surgery Specialist',
    profilePhoto: 'https://images.unsplash.com/photo-1607990283143-e81e7a2c93ab?auto=format&fit=crop&q=80&w=300',
    schedule: [
      { day: 'Wednesday', start: '10:00', end: '16:00' },
      { day: 'Friday', start: '10:00', end: '14:00' },
    ],
  },
  {
    name: 'Dr. Chloe Bennett',
    email: 'chloe.bennett@nexora.com',
    phone: '+15550100107',
    specialty: 'Dental & Smile Care',
    degrees: 'DDS - Cosmetic Dentistry & Implantology',
    profilePhoto: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=300',
    schedule: [
      { day: 'Tuesday', start: '09:00', end: '17:00' },
      { day: 'Thursday', start: '09:00', end: '17:00' },
    ],
  },
  {
    name: 'Dr. Michael Chang',
    email: 'michael.chang@nexora.com',
    phone: '+15550100108',
    specialty: 'Dental & Smile Care',
    degrees: 'BDS, MDS - Prosthodontics & Full Mouth Rehabilitation',
    profilePhoto: 'https://images.unsplash.com/photo-1582750433449-64c6ec6f6a06?auto=format&fit=crop&q=80&w=300',
    schedule: [
      { day: 'Monday', start: '13:00', end: '17:00' },
      { day: 'Wednesday', start: '09:00', end: '13:00' },
    ],
  },
  {
    name: 'Dr. Sophia Martinez',
    email: 'sophia.martinez@nexora.com',
    phone: '+15550100109',
    specialty: 'Patient Coordination Services',
    degrees: 'MD - Family Medicine & Patient Advocacy Liaison',
    profilePhoto: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&q=80&w=300',
    schedule: [
      { day: 'Monday', start: '09:00', end: '17:00' },
      { day: 'Tuesday', start: '09:00', end: '17:00' },
      { day: 'Wednesday', start: '09:00', end: '17:00' },
      { day: 'Thursday', start: '09:00', end: '17:00' },
      { day: 'Friday', start: '09:00', end: '17:00' },
    ],
  },
  {
    name: 'Dr. Ryan Patel',
    email: 'ryan.patel@nexora.com',
    phone: '+15550100110',
    specialty: 'Patient Coordination Services',
    degrees: 'MBBS - Healthcare Coordination & Clinical Transitions Specialist',
    profilePhoto: 'https://images.unsplash.com/photo-1550831107-1553da8c8464?auto=format&fit=crop&q=80&w=300',
    schedule: [
      { day: 'Tuesday', start: '08:00', end: '12:00' },
      { day: 'Thursday', start: '12:00', end: '16:00' },
    ],
  },
  {
    name: 'Dr. Emily Watson',
    email: 'emily.watson@nexora.com',
    phone: '+15550100111',
    specialty: 'Cosmetic & Aesthetic Treatments',
    degrees: 'MD - Aesthetic Medicine & Anti-Aging Treatments',
    profilePhoto: 'https://images.unsplash.com/photo-1591604021695-0c69b7c05981?auto=format&fit=crop&q=80&w=300',
    schedule: [
      { day: 'Wednesday', start: '13:00', end: '18:00' },
      { day: 'Friday', start: '09:00', end: '14:00' },
    ],
  },
];

const seedDatabase = async () => {
  try {
    await connectDB();

    logger.info('Clearing old database records...');
    await User.deleteMany({});
    await Doctor.deleteMany({});
    await Patient.deleteMany({});
    await Appointment.deleteMany({});
    await ContactMessage.deleteMany({});

    logger.info('Creating system Administrator user account...');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@nexora.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'NexoraSecure2026!';
    
    await User.create({
      name: 'System Admin',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
    });
    logger.info(`Admin user created: ${adminEmail}`);

    logger.info('Inserting doctor profiles & accounts...');
    for (const docInfo of doctorsData) {
      // 1. Create doctor profile
      const doctor = await Doctor.create(docInfo);
      
      // 2. Create matching doctor portal login user
      const docPassword = 'DoctorSecure2026!';
      await User.create({
        name: doctor.name,
        email: doctor.email,
        password: docPassword,
        role: 'doctor',
        doctorId: doctor._id,
      });
      logger.info(`Doctor created: ${doctor.name} (${doctor.email})`);
    }

    logger.info('Database seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding database: ', error);
    process.exit(1);
  }
};

seedDatabase();
