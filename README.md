# Nexora Health - Hospital Management System

Nexora is a full-stack, secure hospital management and patient care coordination platform. It allows patients to learn about coordinating specialties, register through intake forms, and book consultation slots directly. Administrators can manage registrations, reschedule appointments, and view contact leads, while Doctors can log in to view their specific patient panels.

## Features

- **High-Fidelity UI/UX**: Premium, responsive dark-navy theme using glassmorphism components, custom CSS variables, and Outfit/Inter typography.
- **Dynamic Slot Booking**: Slots are dynamically calculated based on the doctor's weekly calendar rules, and validated against existing database records.
- **Double-Booking Protection**: Enforced atomically via a Mongoose compound index on `{ doctorId: 1, dateTime: 1 }` with a database uniqueness constraint.
- **Automated Notifications**: Welcome and confirmation alerts are sent using Nodemailer (HTML emails) and the Twilio WhatsApp API (with fallback click-to-chat links in demo mode).
- **Hardened Security**: Includes Helm HTTP headers, express-rate-limit protection, MongoDB operator sanitization, HTML character XSS sanitization, and secure `httpOnly` sessions.
- **Role-Based Routing**: Restricts administrative controls (soft-deleting patients, completing appointments) to `admin` accounts, and patient panels to mapped `doctor` accounts.

---

## Technical Stack

- **Frontend**: HTML5, Vanilla CSS3 (flexbox/grid layout), Vanilla JS (ES6 modular imports). No build compiling required.
- **Backend**: Node.js (v18 LTS) with Express.js (v4).
- **Database**: MongoDB Atlas using Mongoose ODM.
- **Logging**: Winston logger configured with `winston-daily-rotate-file` for production.

---

## File Structure

```
/
├── package.json             # Backend dependencies & scripts
├── server.js                # App entrypoint and routing mappings
├── seed.js                  # Database seeder (creates admin & 11 doctors)
├── render.yaml              # Render blueprint infrastructure-as-code
├── .env                     # Configuration variables (gitignored)
├── .env.example             # Configuration variables blueprint
├── src/
│   ├── config/              # Winston, DB, and Twilio/SMTP transporters
│   ├── models/              # Mongoose schemas (User, Patient, Doctor, Appointment, Message)
│   ├── controllers/         # Endpoint operations (Auth, Directory, Book, Leads, Intake)
│   └── middleware/          # Rate-limiting, sanitizers, validation, and JWT auth
└── public/                  # Static frontend files
    ├── index.html           # Treatments, about us, features
    ├── doctors.html         # Directory listing & WhatsApp click links
    ├── appointments.html    # Tabbed scheduling and intake form
    ├── contact.html         # Contact lead entry form
    ├── dashboard.html       # Dynamic admin/doctor portal
    ├── css/                 # Global UI variables and breakpoints
    └── js/                  # Form validators and API wrappers
```

---

## Getting Started

### 1. Installation
Install the project dependencies locally:
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to a new `.env` file and customize the variables:
```bash
cp .env.example .env
```
Ensure you provide a running MongoDB URI (either local `mongodb://127.0.0.1:27017/nexora` or a MongoDB Atlas cloud URI).

### 3. Database Seeding
Run the seeder script to populate your database with the default system Admin user and 11 doctor scheduling profiles:
```bash
npm run seed
```
- **Seeded Admin Login**:
  - Email: `admin@nexora.com`
  - Password: `NexoraSecure2026!` (configured in `.env`)
- **Seeded Doctor Logins**:
  - Emails: e.g. `sarah.jenkins@nexora.com`, `marcus.vance@nexora.com`
  - Password: `DoctorSecure2026!`

### 4. Running the Server
Start the development server with hot-reload support using `nodemon`:
```bash
npm run dev
```
The server will boot on `http://localhost:5000`. Navigate to this link in your browser to view the system.

---

## Deployment on Render

1. Create a **Web Service** on Render linked to your repository.
2. Select Node.js as the environment and specify `npm install` as the build command and `npm start` as the start command.
3. Add the following variables to Render's **Environment Group**:
   - `NODE_ENV` = `production`
   - `MONGODB_URI` = *(Your MongoDB Atlas Cluster URI)*
   - `JWT_SECRET` = *(Generate a cryptographically secure random string)*
   - `ADMIN_PASSWORD` = *(Your custom admin password)*
4. Alternatively, deploy using the `render.yaml` Blueprint file for automatic infrastructure provisioning.
