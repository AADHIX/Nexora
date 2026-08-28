import { api, showToast } from './api.js';

// Debounce helper
const debounce = (func, delay = 300) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('appointment-booking-form');
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  const doctorSelect = document.getElementById('doctorId');
  const dateInput = document.getElementById('date');
  const slotSelect = document.getElementById('timeSlot');
  const slotsLoadingEl = document.getElementById('slots-loading');

  // Disable date select until a doctor is chosen
  dateInput.disabled = true;
  slotSelect.disabled = true;

  // Check URL parameters for pre-selected doctor
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedDocId = urlParams.get('doctor');

  // Set minimum date to today in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  dateInput.min = today;

  // 1. Fetch doctors directory
  try {
    const doctors = await api.get('/api/doctors');
    doctors.forEach((doc) => {
      const option = document.createElement('option');
      option.value = doc._id;
      option.textContent = `${doc.name} - ${doc.specialty}`;
      doctorSelect.appendChild(option);
    });

    if (preselectedDocId) {
      doctorSelect.value = preselectedDocId;
      dateInput.disabled = false;
    }
  } catch (err) {
    showToast('Failed to load doctors schedule rules', 'error');
  }

  // 2. Fetch slots when doctor and date change
  const loadAvailableSlots = async () => {
    const doctorId = doctorSelect.value;
    const date = dateInput.value;

    if (!doctorId || !date) {
      slotSelect.innerHTML = '<option value="">Select doctor & date first</option>';
      slotSelect.disabled = true;
      return;
    }

    try {
      slotsLoadingEl.style.display = 'block';
      slotSelect.disabled = true;
      slotSelect.innerHTML = '<option value="">Loading slots...</option>';

      const slots = await api.get(`/api/doctors/${doctorId}/slots?date=${date}`);
      
      slotSelect.innerHTML = '';
      slotsLoadingEl.style.display = 'none';

      if (slots.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No slots available';
        slotSelect.appendChild(option);
        slotSelect.disabled = true;
        errorsState.timeSlot = true;
      } else {
        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = 'Choose an available slot';
        slotSelect.appendChild(defaultOpt);

        slots.forEach((slot) => {
          const option = document.createElement('option');
          option.value = slot;
          option.textContent = `${slot} (UTC)`;
          slotSelect.appendChild(option);
        });
        slotSelect.disabled = false;
        errorsState.timeSlot = true; // resets to invalid till selected
      }
      checkFormValidity();
    } catch (err) {
      slotsLoadingEl.style.display = 'none';
      slotSelect.innerHTML = '<option value="">Error loading slots</option>';
      slotSelect.disabled = true;
    }
  };

  doctorSelect.addEventListener('change', () => {
    if (doctorSelect.value) {
      dateInput.disabled = false;
      loadAvailableSlots();
    } else {
      dateInput.disabled = true;
      dateInput.value = '';
      slotSelect.innerHTML = '<option value="">Select doctor & date first</option>';
      slotSelect.disabled = true;
    }
  });

  dateInput.addEventListener('change', loadAvailableSlots);

  // 3. Client Validations
  const validators = {
    patientName: (val) => (val.trim().length > 0 ? '' : 'Name is required'),
    patientPhone: (val) => {
      if (!val) return 'Phone number is required';
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      return phoneRegex.test(val) ? '' : 'Enter valid phone number (e.g. +15551234567)';
    },
    patientEmail: (val) => {
      if (!val) return 'Email is required';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(val) ? '' : 'Enter a valid email address';
    },
    doctorId: (val) => (val ? '' : 'Please select a doctor'),
    date: (val) => {
      if (!val) return 'Date is required';
      if (new Date(val) < new Date(today)) return 'Booking date cannot be in the past';
      return '';
    },
    timeSlot: (val) => (val ? '' : 'Please select a time slot'),
  };

  const formFields = Object.keys(validators);
  const errorsState = {};
  
  formFields.forEach(field => {
    errorsState[field] = true;
  });

  const checkFormValidity = () => {
    const isFormValid = !Object.values(errorsState).includes(true);
    submitBtn.disabled = !isFormValid;
  };

  const validateField = (field, inputEl) => {
    const errorEl = document.getElementById(`${field}-error`);
    const validator = validators[field];
    
    if (validator && errorEl) {
      const errorMsg = validator(inputEl.value);
      if (errorMsg) {
        errorEl.textContent = errorMsg;
        errorEl.style.display = 'block';
        inputEl.style.borderColor = 'var(--error)';
        errorsState[field] = true;
      } else {
        errorEl.style.display = 'none';
        inputEl.style.borderColor = 'var(--accent-secondary)';
        errorsState[field] = false;
      }
      checkFormValidity();
    }
  };

  const debouncedValidate = debounce((field, inputEl) => {
    validateField(field, inputEl);
  }, 400);

  formFields.forEach((field) => {
    const inputEl = document.getElementById(field);
    if (!inputEl) return;

    inputEl.addEventListener('blur', () => {
      validateField(field, inputEl);
    });

    inputEl.addEventListener('input', () => {
      debouncedValidate(field, inputEl);
    });

    if (inputEl.tagName === 'SELECT') {
      inputEl.addEventListener('change', () => {
        validateField(field, inputEl);
      });
    }
  });

  // 4. Form Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    formFields.forEach((field) => {
      const inputEl = document.getElementById(field);
      if (inputEl) validateField(field, inputEl);
    });

    if (Object.values(errorsState).includes(true)) {
      showToast('Please fix the validation errors before submitting.', 'error');
      return;
    }

    const formData = {
      patientName: document.getElementById('patientName').value,
      patientPhone: document.getElementById('patientPhone').value,
      patientEmail: document.getElementById('patientEmail').value,
      doctorId: document.getElementById('doctorId').value,
      date: document.getElementById('date').value,
      timeSlot: document.getElementById('timeSlot').value,
      notes: document.getElementById('notes').value || '',
    };

    try {
      submitBtn.textContent = 'Securing Booking...';
      submitBtn.disabled = true;

      const appt = await api.post('/api/appointments', formData);
      
      // Successful appointment details page popup or notification
      const dateText = new Date(formData.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
      });

      // Prepare fallback WhatsApp Click-to-Chat trigger link
      // Use clean phone from doctor or static WhatsApp default number
      const waLink = `https://wa.me/15550100100?text=Hello,%20I%27d%20like%20to%20confirm%20my%20appointment%20with%20ID%20${appt._id}%20for%20${encodeURIComponent(dateText)}%20at%20${formData.timeSlot}`;

      // Open dynamic success modal
      openSuccessModal(formData.patientName, dateText, formData.timeSlot, waLink);
      
      form.reset();
      dateInput.disabled = true;
      slotSelect.disabled = true;
      slotSelect.innerHTML = '<option value="">Select doctor & date first</option>';
      
      formFields.forEach(field => {
        errorsState[field] = true;
        const inputEl = document.getElementById(field);
        if (inputEl) inputEl.style.borderColor = 'var(--border-glass)';
      });

      submitBtn.textContent = 'Book Appointment';
      submitBtn.disabled = true;
    } catch (err) {
      submitBtn.textContent = 'Book Appointment';
      submitBtn.disabled = false;
    }
  });

  const openSuccessModal = (name, dateStr, timeStr, whatsappLink) => {
    let successModal = document.getElementById('booking-success-modal');
    if (!successModal) {
      successModal = document.createElement('div');
      successModal.id = 'booking-success-modal';
      successModal.className = 'modal';
      document.body.appendChild(successModal);
    }

    successModal.innerHTML = `
      <div class="modal-content text-center">
        <button class="modal-close" id="close-success-btn">&times;</button>
        <div style="font-size: 3rem; color: var(--success); margin-bottom: 1rem;">
          <i class="fa-solid fa-circle-check"></i>
        </div>
        <h2 style="margin-bottom: 1rem;">Booking Confirmed!</h2>
        <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
          Hi <strong>${name}</strong>, your appointment has been secured for <strong>${dateStr}</strong> at <strong>${timeStr} (UTC)</strong>. An email receipt has been dispatched to your mailbox.
        </p>
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <a href="${whatsappLink}" target="_blank" class="btn btn-primary" style="background: #25D366; box-shadow: 0 0 15px rgba(37, 211, 102, 0.3);">
            <i class="fa-brands fa-whatsapp"></i> Chat on WhatsApp
          </a>
          <button class="btn btn-secondary" id="success-dismiss-btn">Dismiss</button>
        </div>
      </div>
    `;

    successModal.classList.add('active');

    const dismiss = () => successModal.classList.remove('active');
    document.getElementById('close-success-btn').addEventListener('click', dismiss);
    document.getElementById('success-dismiss-btn').addEventListener('click', dismiss);
  };

  checkFormValidity();
});
