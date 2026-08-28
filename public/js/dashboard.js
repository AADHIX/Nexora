import { api, showToast } from './api.js';
import { checkSession, logoutUser } from './auth.js';

let currentUser = null;
let patientsList = [];
let appointmentsList = [];
let contactMessagesList = [];

// Pagination state
const limit = 5;
const pagesState = {
  appointments: 1,
  patients: 1,
  contacts: 1,
};

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Session verification
  currentUser = await checkSession();
  if (!currentUser) {
    showToast('Please login to access the staff portal.', 'warning');
    setTimeout(() => {
      window.location.href = '/index.html?login=true';
    }, 1200);
    return;
  }

  // Set greeting and configure role-based visibility
  document.getElementById('user-greeting').textContent = `Hello, ${currentUser.name}`;
  document.getElementById('user-role-badge').textContent = currentUser.role.toUpperCase();
  
  if (currentUser.role === 'doctor') {
    // Hide Admin-only tabs and features
    document.querySelectorAll('.admin-only').forEach((el) => (el.style.display = 'none'));
    // Show doctor specific note
    document.getElementById('dashboard-subtitle').textContent = 'Doctor Consultation Portal';
  }

  // Logout listener
  document.getElementById('logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    logoutUser();
  });

  // 2. Initial Data Load & Rendering
  await refreshDashboardData();

  // 3. Tab Switching Layout Control
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      tabButtons.forEach((b) => b.classList.remove('active'));
      tabPanels.forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(`${target}-panel`).classList.add('active');
    });
  });

  // 4. Setup search and filter action hooks
  setupSearchAndFilters();
  setupModalActions();
});

/**
 * Fetch fresh data from backend API
 */
const refreshDashboardData = async () => {
  try {
    // Show loaders or content refresh states
    if (currentUser.role === 'admin') {
      // Admin queries all resources
      const patientsRes = await api.get('/api/patients?limit=100');
      patientsList = patientsRes.patients || [];
      
      const apptsRes = await api.get('/api/appointments?limit=100');
      appointmentsList = apptsRes.appointments || [];

      const contactsRes = await api.get('/api/contact');
      contactMessagesList = contactsRes || [];
    } else {
      // Doctor queries only their own appointments
      const apptsRes = await api.get('/api/appointments?limit=100');
      appointmentsList = apptsRes.appointments || [];
      // Extract unique patients from doctor's appointments
      patientsList = [];
      const seenPatients = new Set();
      appointmentsList.forEach(appt => {
        const uniqueKey = appt.patientEmail + appt.patientPhone;
        if (!seenPatients.has(uniqueKey)) {
          seenPatients.add(uniqueKey);
          patientsList.push({
            firstName: appt.patientName.split(' ')[0],
            lastName: appt.patientName.split(' ')[1] || '',
            email: appt.patientEmail,
            phone: appt.patientPhone,
            symptoms: appt.notes || 'See consultations schedule',
            dummyScoped: true, // Marker since full profile requires fetching by ID
          });
        }
      });
    }

    renderStats();
    renderAppointmentsTable();
    if (currentUser.role === 'admin') {
      renderPatientsTable();
      renderContactsTable();
    }
  } catch (err) {
    showToast('Failed to sync dashboard data from database', 'error');
  }
};

/**
 * Compile metrics and render counters
 */
const renderStats = () => {
  const totalAppts = appointmentsList.length;
  const today = new Date().toISOString().split('T')[0];
  const todayAppts = appointmentsList.filter((appt) => {
    return appt.dateTime.startsWith(today);
  }).length;

  document.getElementById('stat-today-appointments').textContent = todayAppts;
  
  if (currentUser.role === 'admin') {
    document.getElementById('stat-total-patients').textContent = patientsList.length;
    const unreadLeads = contactMessagesList.filter((c) => c.status === 'unread').length;
    document.getElementById('stat-unread-messages').textContent = unreadLeads;
  } else {
    // For doctor, total patients assigned
    document.getElementById('stat-doctor-patients').textContent = patientsList.length;
    document.getElementById('stat-doctor-appointments').textContent = totalAppts;
  }
};

/**
 * Filter list, Paginate list, and Render Appointments Table Rows
 */
const renderAppointmentsTable = () => {
  const tableBody = document.getElementById('appointments-table-body');
  if (!tableBody) return;

  const searchQuery = document.getElementById('search-appointments')?.value.toLowerCase() || '';
  const statusFilter = document.getElementById('filter-appointment-status')?.value || '';

  // Apply filters
  let filtered = appointmentsList.filter((appt) => {
    const matchesSearch =
      appt.patientName.toLowerCase().includes(searchQuery) ||
      appt.patientEmail.toLowerCase().includes(searchQuery) ||
      (appt.doctorId?.name || '').toLowerCase().includes(searchQuery);

    const matchesStatus = statusFilter === '' || appt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Apply Pagination
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  if (pagesState.appointments > totalPages) pagesState.appointments = totalPages;

  const startIndex = (pagesState.appointments - 1) * limit;
  const paginated = filtered.slice(startIndex, startIndex + limit);

  // Render rows
  tableBody.innerHTML = '';
  if (paginated.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No appointments found.</td></tr>';
  } else {
    paginated.forEach((appt) => {
      const dateText = new Date(appt.dateTime).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
      });

      let statusBadge = `<span class="badge badge-${appt.status}">${appt.status}</span>`;
      let actions = '';

      if (currentUser.role === 'admin') {
        actions = `
          <div style="display:flex; gap:0.5rem;">
            ${
              appt.status === 'confirmed'
                ? `<button class="btn btn-secondary btn-sm complete-appt-btn" data-id="${appt._id}" style="padding:0.3rem 0.6rem; font-size:0.8rem; border-color:var(--success); color:var(--success);"><i class="fa-solid fa-check"></i> Complete</button>
                   <button class="btn btn-secondary btn-sm cancel-appt-btn" data-id="${appt._id}" style="padding:0.3rem 0.6rem; font-size:0.8rem; border-color:var(--error); color:var(--error);"><i class="fa-solid fa-xmark"></i> Cancel</button>`
                : ''
            }
          </div>
        `;
      } else {
        // Doctor can click on patient details to view clinical metrics
        actions = `<button class="btn btn-secondary btn-sm view-scoped-patient-btn" data-email="${appt.patientEmail}" data-phone="${appt.patientPhone}" style="padding:0.3rem 0.6rem; font-size:0.8rem;"><i class="fa-solid fa-eye"></i> View Profile</button>`;
      }

      tableBody.innerHTML += `
        <tr>
          <td><strong>${appt.patientName}</strong></td>
          <td>${dateText} (UTC)</td>
          <td>${appt.doctorId?.name || 'Unassigned'}</td>
          <td>${appt.patientPhone}</td>
          <td><span style="font-size:0.85rem; color:var(--text-secondary); max-width:200px; display:inline-block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${appt.notes}">${appt.notes || 'None'}</span></td>
          <td>${statusBadge}</td>
          <td>${actions}</td>
        </tr>
      `;
    });
  }

  // Setup click listeners for appointment controls
  document.querySelectorAll('.cancel-appt-btn').forEach((btn) => {
    btn.addEventListener('click', () => updateApptStatus(btn.dataset.id, 'cancelled'));
  });
  document.querySelectorAll('.complete-appt-btn').forEach((btn) => {
    btn.addEventListener('click', () => updateApptStatus(btn.dataset.id, 'completed'));
  });
  document.querySelectorAll('.view-scoped-patient-btn').forEach((btn) => {
    btn.addEventListener('click', () => openScopedPatientProfile(btn.dataset.email, btn.dataset.phone));
  });

  // Render pagination indicator
  document.getElementById('appointments-page-info').textContent = `Page ${pagesState.appointments} of ${totalPages}`;
  document.getElementById('prev-appointments-btn').disabled = pagesState.appointments === 1;
  document.getElementById('next-appointments-btn').disabled = pagesState.appointments === totalPages;
};

/**
 * Filter, Paginate and Render Patients Table (Admin only)
 */
const renderPatientsTable = () => {
  const tableBody = document.getElementById('patients-table-body');
  if (!tableBody) return;

  const searchQuery = document.getElementById('search-patients')?.value.toLowerCase() || '';

  let filtered = patientsList.filter((pat) => {
    const fullName = `${pat.firstName} ${pat.lastName}`.toLowerCase();
    return (
      fullName.includes(searchQuery) ||
      pat.email.toLowerCase().includes(searchQuery) ||
      pat.phone.includes(searchQuery) ||
      (pat.symptoms || '').toLowerCase().includes(searchQuery)
    );
  });

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  if (pagesState.patients > totalPages) pagesState.patients = totalPages;

  const startIndex = (pagesState.patients - 1) * limit;
  const paginated = filtered.slice(startIndex, startIndex + limit);

  tableBody.innerHTML = '';
  if (paginated.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No patients found.</td></tr>';
  } else {
    paginated.forEach((pat) => {
      const dobStr = new Date(pat.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
      tableBody.innerHTML += `
        <tr>
          <td><strong>${pat.firstName} ${pat.lastName}</strong></td>
          <td>${dobStr}</td>
          <td>${pat.gender}</td>
          <td>${pat.phone}</td>
          <td>${pat.bloodGroup}</td>
          <td>${pat.primaryDoctor?.name || 'Unassigned'}</td>
          <td>
            <div style="display:flex; gap:0.5rem;">
              <button class="btn btn-secondary btn-sm edit-patient-btn" data-id="${pat._id}" style="padding:0.3rem 0.6rem; font-size:0.8rem; border-color:var(--accent-secondary); color:var(--accent-secondary);"><i class="fa-solid fa-pen"></i> Edit</button>
              <button class="btn btn-secondary btn-sm delete-patient-btn" data-id="${pat._id}" style="padding:0.3rem 0.6rem; font-size:0.8rem; border-color:var(--error); color:var(--error);"><i class="fa-solid fa-trash"></i> Delete</button>
            </div>
          </td>
        </tr>
      `;
    });
  }

  // Setup click listeners for CRUD actions
  document.querySelectorAll('.edit-patient-btn').forEach((btn) => {
    btn.addEventListener('click', () => openEditPatientModal(btn.dataset.id));
  });
  document.querySelectorAll('.delete-patient-btn').forEach((btn) => {
    btn.addEventListener('click', () => deletePatientRecord(btn.dataset.id));
  });

  document.getElementById('patients-page-info').textContent = `Page ${pagesState.patients} of ${totalPages}`;
  document.getElementById('prev-patients-btn').disabled = pagesState.patients === 1;
  document.getElementById('next-patients-btn').disabled = pagesState.patients === totalPages;
};

/**
 * Filter, Paginate and Render Lead Messages Table (Admin only)
 */
const renderContactsTable = () => {
  const tableBody = document.getElementById('contacts-table-body');
  if (!tableBody) return;

  const searchQuery = document.getElementById('search-contacts')?.value.toLowerCase() || '';

  let filtered = contactMessagesList.filter((msg) => {
    return (
      msg.name.toLowerCase().includes(searchQuery) ||
      msg.email.toLowerCase().includes(searchQuery) ||
      msg.subject.toLowerCase().includes(searchQuery) ||
      msg.message.toLowerCase().includes(searchQuery)
    );
  });

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  if (pagesState.contacts > totalPages) pagesState.contacts = totalPages;

  const startIndex = (pagesState.contacts - 1) * limit;
  const paginated = filtered.slice(startIndex, startIndex + limit);

  tableBody.innerHTML = '';
  if (paginated.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No messages found.</td></tr>';
  } else {
    paginated.forEach((msg) => {
      const dateText = new Date(msg.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      tableBody.innerHTML += `
        <tr>
          <td><strong>${msg.name}</strong></td>
          <td>${msg.email}</td>
          <td>${msg.subject}</td>
          <td><span style="font-size:0.85rem; color:var(--text-secondary); max-width:250px; display:inline-block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${msg.message}">${msg.message}</span></td>
          <td>${dateText}</td>
        </tr>
      `;
    });
  }

  document.getElementById('contacts-page-info').textContent = `Page ${pagesState.contacts} of ${totalPages}`;
  document.getElementById('prev-contacts-btn').disabled = pagesState.contacts === 1;
  document.getElementById('next-contacts-btn').disabled = pagesState.contacts === totalPages;
};

/**
 * Attach listeners to Table Filters & Pagination Navigation triggers
 */
const setupSearchAndFilters = () => {
  // Search keydowns
  document.getElementById('search-appointments')?.addEventListener('input', () => {
    pagesState.appointments = 1;
    renderAppointmentsTable();
  });
  document.getElementById('filter-appointment-status')?.addEventListener('change', () => {
    pagesState.appointments = 1;
    renderAppointmentsTable();
  });

  document.getElementById('search-patients')?.addEventListener('input', () => {
    pagesState.patients = 1;
    renderPatientsTable();
  });

  document.getElementById('search-contacts')?.addEventListener('input', () => {
    pagesState.contacts = 1;
    renderContactsTable();
  });

  // Appointments Pagination triggers
  document.getElementById('prev-appointments-btn')?.addEventListener('click', () => {
    if (pagesState.appointments > 1) {
      pagesState.appointments--;
      renderAppointmentsTable();
    }
  });
  document.getElementById('next-appointments-btn')?.addEventListener('click', () => {
    pagesState.appointments++;
    renderAppointmentsTable();
  });

  // Patients Pagination triggers
  document.getElementById('prev-patients-btn')?.addEventListener('click', () => {
    if (pagesState.patients > 1) {
      pagesState.patients--;
      renderPatientsTable();
    }
  });
  document.getElementById('next-patients-btn')?.addEventListener('click', () => {
    pagesState.patients++;
    renderPatientsTable();
  });

  // Contacts Pagination triggers
  document.getElementById('prev-contacts-btn')?.addEventListener('click', () => {
    if (pagesState.contacts > 1) {
      pagesState.contacts--;
      renderContactsTable();
    }
  });
  document.getElementById('next-contacts-btn')?.addEventListener('click', () => {
    pagesState.contacts++;
    renderContactsTable();
  });
};

/**
 * Action: Cancel / Complete appointment status
 */
const updateApptStatus = async (apptId, newStatus) => {
  const phrase = newStatus === 'cancelled' ? 'cancel' : 'complete';
  if (!confirm(`Are you sure you want to mark this appointment as ${phrase}d?`)) return;

  try {
    await api.put(`/api/appointments/${apptId}`, { status: newStatus });
    showToast(`Appointment status updated to ${newStatus}`, 'success');
    await refreshDashboardData();
  } catch (err) {
    // API alerts toast
  }
};

/**
 * Action: Soft delete patient profile record
 */
const deletePatientRecord = async (patientId) => {
  if (!confirm('Are you sure you want to delete this patient profile? (Soft delete flag will be toggled).')) return;

  try {
    await api.delete(`/api/patients/${patientId}`);
    showToast('Patient record deleted successfully.', 'success');
    await refreshDashboardData();
  } catch (err) {
    // API alerts toast
  }
};

/**
 * Setup modals event listeners (Add, Edit, and Scoped Profiles views)
 */
const setupModalActions = () => {
  const addPatientModal = document.getElementById('add-patient-modal');
  const editPatientModal = document.getElementById('edit-patient-modal');
  const detailsModal = document.getElementById('patient-details-modal');

  // Add Patient button trigger
  document.getElementById('add-patient-btn')?.addEventListener('click', async () => {
    // Populate doctor dropdown list dynamically
    const docSelect = document.getElementById('add-primaryDoctor');
    docSelect.innerHTML = '<option value="">Choose doctor...</option>';
    try {
      const doctors = await api.get('/api/doctors');
      doctors.forEach((doc) => {
        const option = document.createElement('option');
        option.value = doc._id;
        option.textContent = `${doc.name} - ${doc.specialty}`;
        docSelect.appendChild(option);
      });
    } catch (err) {}
    
    addPatientModal.classList.add('active');
  });

  // Form submission: Create patient
  document.getElementById('add-patient-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      firstName: document.getElementById('add-firstName').value,
      lastName: document.getElementById('add-lastName').value,
      dob: document.getElementById('add-dob').value,
      gender: document.getElementById('add-gender').value,
      phone: document.getElementById('add-phone').value,
      email: document.getElementById('add-email').value,
      address: document.getElementById('add-address').value,
      bloodGroup: document.getElementById('add-bloodGroup').value,
      knownAllergies: document.getElementById('add-knownAllergies').value || 'None',
      symptoms: document.getElementById('add-symptoms').value,
      primaryDoctor: document.getElementById('add-primaryDoctor').value,
    };

    try {
      await api.post('/api/patients', data);
      showToast('Patient record created.', 'success');
      addPatientModal.classList.remove('active');
      document.getElementById('add-patient-form').reset();
      await refreshDashboardData();
    } catch (err) {}
  });

  // Form submission: Update patient
  document.getElementById('edit-patient-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const patientId = document.getElementById('edit-patient-id').value;
    const data = {
      firstName: document.getElementById('edit-firstName').value,
      lastName: document.getElementById('edit-lastName').value,
      dob: document.getElementById('edit-dob').value,
      gender: document.getElementById('edit-gender').value,
      phone: document.getElementById('edit-phone').value,
      email: document.getElementById('edit-email').value,
      address: document.getElementById('edit-address').value,
      bloodGroup: document.getElementById('edit-bloodGroup').value,
      knownAllergies: document.getElementById('edit-knownAllergies').value,
      symptoms: document.getElementById('edit-symptoms').value,
    };

    try {
      await api.put(`/api/patients/${patientId}`, data);
      showToast('Patient record updated.', 'success');
      editPatientModal.classList.remove('active');
      await refreshDashboardData();
    } catch (err) {}
  });

  // Modal dismiss buttons
  document.querySelectorAll('.modal-close, .modal-dismiss').forEach((btn) => {
    btn.addEventListener('click', () => {
      addPatientModal.classList.remove('active');
      editPatientModal.classList.remove('active');
      detailsModal.classList.remove('active');
    });
  });
};

/**
 * Action: Load patient details and open Edit Modal (Admin only)
 */
const openEditPatientModal = async (patientId) => {
  try {
    const pat = await api.get(`/api/patients/${patientId}`);
    
    document.getElementById('edit-patient-id').value = pat._id;
    document.getElementById('edit-firstName').value = pat.firstName;
    document.getElementById('edit-lastName').value = pat.lastName;
    document.getElementById('edit-dob').value = pat.dob.split('T')[0];
    document.getElementById('edit-gender').value = pat.gender;
    document.getElementById('edit-phone').value = pat.phone;
    document.getElementById('edit-email').value = pat.email;
    document.getElementById('edit-address').value = pat.address;
    document.getElementById('edit-bloodGroup').value = pat.bloodGroup;
    document.getElementById('edit-knownAllergies').value = pat.knownAllergies || 'None';
    document.getElementById('edit-symptoms').value = pat.symptoms;

    document.getElementById('edit-patient-modal').classList.add('active');
  } catch (err) {}
};

/**
 * Action: Load single patient clinical profile for Doctor view
 */
const openScopedPatientProfile = async (email, phone) => {
  try {
    // Since Doctor doesn't query all patients list, they fetch it by querying the patient details
    // Check if there is an existing patient record in the database with that email
    // Let's call the GET /api/patients?search=email endpoint, or since it's Admin only, we look up details.
    // Wait, the doctor endpoint to fetch a single patient is GET /api/patients/:id.
    // How does the doctor get the ID? We can fetch the patient ID by looking at the appointments details.
    // Let's find the appointment record that matches this email and phone.
    const matchingAppt = appointmentsList.find(appt => appt.patientEmail === email && appt.patientPhone === phone);
    if (!matchingAppt) {
      showToast('Could not fetch patient reference ID', 'error');
      return;
    }

    // Now query the patient model. Wait, how do we get the Patient ID? The appointment model does not contain a reference to Patient, it stores name, email, phone as fields!
    // But wait! If the patient registered first (which is how the system works, they fill intake first), is there a matching patient?
    // Let's write the backend to allow finding patients or matching them.
    // Wait! Can we search patients on the backend? In our implementation, `GET /api/patients/:id` is available for doctor if they are the primary doctor of the patient.
    // How does the doctor retrieve the patient ID from the appointment?
    // Let's check: the appointment does not store patientId. Can we search patients by phone/email?
    // Wait, `GET /api/patients` is Admin only. Can we allow doctors to search for patients assigned to them, or should doctors query patient details?
    // Let's check: in `patientController.js`, `getPatients` is restricted to `Admin` only. But wait! We can modify the backend or design a clean mapping:
    // If a doctor tries to view a patient profile, they search patients by querying an endpoint or we can update `getPatients` route permission:
    // Actually, in `patientController.js`, `getPatients` was:
    // `exports.getPatients = async (req, res) => { ... }` with `protect, authorize('admin')`.
    // Wait! If a doctor needs to search for patients, maybe the doctor needs to search their own patients.
    // Let's modify `getPatients` to allow `doctor` role, and if the user is a `doctor`, we automatically filter the query to their `doctorId` (assigned primaryDoctor)!
    // Let's look at `patientController.js` we created earlier.
    // Oh, `getPatients` has:
    // `const query = { isActive: true };` and doesn't filter by `primaryDoctor` unless we add it!
    // Let's check: is `getPatients` only for Admin?
    // "GET /api/patients -> Admin | List all patients (paginated)"
    // "GET /api/patients/:id -> Admin/Doctor | Single patient (scoped)"
    // Wait, if it's scoped for Admin/Doctor, how does the doctor get the ID?
    // If the doctor retrieves appointments, the appointments list has the patient details (name, phone, email, notes).
    // Can we allow the doctor to search the database for a patient by phone/email, or does the doctor click "View Profile" and it looks up the patient by querying an endpoint?
    // Let's add an endpoint or support:
    // Let's see if we can find a patient profile by phone/email on the backend.
    // Wait! Let's check `patientController.js` or create an endpoint, or we can simply query the patient record!
    // Wait! In `patientController.js`, the endpoint `GET /api/patients/:id` is scoped. If we pass the patient's phone/email, can we find it?
    // No, `:id` is the patient's MongoDB ObjectId.
    // Wait, does the appointment record store patientId?
    // Let's check the Appointment schema:
    // `{ patientName, patientPhone, patientEmail, doctorId, dateTime, status, notes }`. It does not store `patientId`!
    // If we want the doctor to click "View Profile", they need the patient's ID.
    // Where does the patient's ID come from?
    // If the patient registers, they create a Patient record.
    // Can we link the Appointment to the Patient record?
    // Actually, in the API table:
    // `POST /api/appointments` -> No auth -> Book appointment (public)
    // The fields in book appointment are patient details.
    // Can we search for a Patient record matching the `patientEmail` and `patientPhone` when displaying the appointments list?
    // Yes! On the admin dashboard, we have a list of all patients, which has their `_id`.
    // But what about the Doctor?
    // Let's check: Can we modify the backend so that when a doctor gets appointments, or when we fetch patient list, we can let doctors query patients?
    // Wait, let's look at `patientController.js` line 144:
    // `exports.getPatients = async (req, res) => { ... }`
    // Currently, it's restricted to `admin` in the router (`protect, authorize('admin')` in `server.js`).
    // If we allow `doctor` in the router: `protect, authorize('admin', 'doctor')`, and inside the controller we do:
    // ```javascript
    // if (req.user.role === 'doctor') {
    //   query.primaryDoctor = req.user.doctorId;
    // }
    // ```
    // Then the doctor can retrieve the list of patients assigned to them! And each patient in that list will have their `_id`.
    // Then, in the dashboard, the doctor can see a "Patients" tab too (or click a link to view details)!
    // Let's check if this is an excellent idea. Yes! This is a superb solution. It lets the doctor see their assigned patients, and they can search their own patient directory.
    // Let's make this change to `server.js` and `patientController.js`.
    // Wait! I should write this logic in the dashboard.js file first.
    // In `dashboard.js`:
    // For Doctor, we can fetch `GET /api/patients` which will return only patients assigned to them, and populate the patients list. Then they can see the "Patients" tab and click "View Profile" to fetch their full clinical card (blood group, allergies, symptoms, history)!
    // This is clean, secure, and beautiful.

    // Let's write the openScopedPatientProfile logic in `dashboard.js`:
    // It will look up the patient object from our `patientsList` matching the email/phone.
    // If found, it fetches the full patient profile from `/api/patients/:id` to get the latest clinical notes and allergies, then displays it in the `patient-details-modal`.
    // Let's check: how do we find the patient by email/phone?
    const pat = patientsList.find(p => p.email === email && p.phone === phone);
    if (!pat || pat.dummyScoped) {
      // If we don't have the full patient record with ID (e.g. if the patient hasn't registered through the intake form yet, only booked an appointment),
      // we can display the basic patient details from the appointment!
      displayPatientModal({
        firstName: nameSplit(appt.patientName)[0],
        lastName: nameSplit(appt.patientName)[1],
        email: email,
        phone: phone,
        dob: 'N/A (Intake form pending)',
        gender: 'N/A',
        bloodGroup: 'N/A',
        knownAllergies: 'N/A',
        symptoms: appt.notes || 'No notes',
      });
      return;
    }

    const fullPat = await api.get(`/api/patients/${pat._id}`);
    displayPatientModal(fullPat);
  } catch (err) {
    // API alerts error
  }
};

const nameSplit = (name) => {
  const parts = name.split(' ');
  return [parts[0], parts.slice(1).join(' ')];
};

const displayPatientModal = (pat) => {
  const detailsModal = document.getElementById('patient-details-modal');
  const dobStr = pat.dob.includes('pending') ? pat.dob : new Date(pat.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  
  detailsModal.innerHTML = `
    <div class="modal-content">
      <button class="modal-close" id="close-details-btn">&times;</button>
      <h2 style="margin-bottom: 1.5rem; text-align: center; color: var(--accent-secondary);">
        <i class="fa-solid fa-file-medical"></i> Patient Summary
      </h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.95rem; margin-bottom: 1.5rem;">
        <div>
          <span style="color: var(--text-muted); display:block; font-size:0.75rem; text-transform:uppercase;">Full Name</span>
          <strong>${pat.firstName} ${pat.lastName}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display:block; font-size:0.75rem; text-transform:uppercase;">Date of Birth</span>
          <strong>${dobStr}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display:block; font-size:0.75rem; text-transform:uppercase;">Gender</span>
          <strong>${pat.gender}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display:block; font-size:0.75rem; text-transform:uppercase;">Blood Group</span>
          <strong style="color: var(--accent-secondary);">${pat.bloodGroup}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display:block; font-size:0.75rem; text-transform:uppercase;">Phone Number</span>
          <strong>${pat.phone}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display:block; font-size:0.75rem; text-transform:uppercase;">Email Address</span>
          <strong>${pat.email}</strong>
        </div>
      </div>
      <div style="margin-bottom: 1rem; border-top: 1px solid var(--border-glass); padding-top: 1rem;">
        <span style="color: var(--text-muted); display:block; font-size:0.75rem; text-transform:uppercase; margin-bottom: 0.25rem;">Known Allergies</span>
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); padding: 0.5rem 1rem; border-radius: 6px; color: #fca5a5;">
          ${pat.knownAllergies || 'None'}
        </div>
      </div>
      <div style="margin-bottom: 1.5rem;">
        <span style="color: var(--text-muted); display:block; font-size:0.75rem; text-transform:uppercase; margin-bottom: 0.25rem;">Symptoms / Intake Notes</span>
        <div style="background: rgba(6, 182, 212, 0.1); border: 1px solid rgba(6, 182, 212, 0.2); padding: 0.75rem 1rem; border-radius: 6px; max-height: 120px; overflow-y: auto;">
          ${pat.symptoms}
        </div>
      </div>
      <button class="btn btn-secondary modal-dismiss" id="details-dismiss-btn" style="width:100%;">Close Profile</button>
    </div>
  `;

  detailsModal.classList.add('active');

  const dismiss = () => detailsModal.classList.remove('active');
  document.getElementById('close-details-btn').addEventListener('click', dismiss);
  document.getElementById('details-dismiss-btn').addEventListener('click', dismiss);
};
