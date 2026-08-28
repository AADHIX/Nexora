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
  const form = document.getElementById('patient-register-form');
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  const doctorSelect = document.getElementById('primaryDoctor');

  // 1. Fetch and populate doctor options
  try {
    const doctors = await api.get('/api/doctors');
    doctors.forEach((doc) => {
      const option = document.createElement('option');
      option.value = doc._id;
      option.textContent = `${doc.name} - ${doc.specialty}`;
      doctorSelect.appendChild(option);
    });
  } catch (err) {
    showToast('Failed to load doctors list', 'error');
  }

  // 2. Validation constraints
  const validators = {
    firstName: (val) => (val.trim().length > 0 ? '' : 'First name is required'),
    lastName: (val) => (val.trim().length > 0 ? '' : 'Last name is required'),
    dob: (val) => {
      if (!val) return 'Date of birth is required';
      if (new Date(val) > new Date()) return 'Date of birth cannot be in the future';
      return '';
    },
    gender: (val) => (val ? '' : 'Please select a gender'),
    phone: (val) => {
      if (!val) return 'Phone number is required';
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      return phoneRegex.test(val) ? '' : 'Enter valid phone number (e.g. +15551234567)';
    },
    email: (val) => {
      if (!val) return 'Email address is required';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(val) ? '' : 'Enter a valid email address';
    },
    address: (val) => (val.trim().length > 0 ? '' : 'Address is required'),
    bloodGroup: (val) => (val ? '' : 'Please select a blood group'),
    symptoms: (val) => (val.trim().length > 0 ? '' : 'Symptoms description is required'),
    primaryDoctor: (val) => (val ? '' : 'Please select a primary doctor'),
  };

  const formFields = Object.keys(validators);
  const errorsState = {};
  
  // Initialize error state
  formFields.forEach(field => {
    errorsState[field] = true; // starts invalid
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

  // Debounced input check
  const debouncedValidate = debounce((field, inputEl) => {
    validateField(field, inputEl);
  }, 400);

  // Attach event listeners
  formFields.forEach((field) => {
    const inputEl = document.getElementById(field);
    if (!inputEl) return;

    // Validate immediately on blur
    inputEl.addEventListener('blur', () => {
      validateField(field, inputEl);
    });

    // Debounce validation on input typing
    inputEl.addEventListener('input', () => {
      debouncedValidate(field, inputEl);
    });

    // Special handler for selects/radios
    if (inputEl.tagName === 'SELECT') {
      inputEl.addEventListener('change', () => {
        validateField(field, inputEl);
      });
    }
  });

  // 3. Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Trigger validation for all fields on submit
    formFields.forEach((field) => {
      const inputEl = document.getElementById(field);
      if (inputEl) validateField(field, inputEl);
    });

    if (Object.values(errorsState).includes(true)) {
      showToast('Please fix the validation errors before submitting.', 'error');
      return;
    }

    // Prepare data
    const formData = {};
    formFields.forEach((field) => {
      formData[field] = document.getElementById(field).value;
    });
    // Add knownAllergies as optional
    formData.knownAllergies = document.getElementById('knownAllergies')?.value || 'None';

    try {
      submitBtn.textContent = 'Registering Patient...';
      submitBtn.disabled = true;
      
      const newPatient = await api.post('/api/patients', formData);
      showToast('Registration successful! Check your inbox for confirmation.', 'success');
      
      // Reset form
      form.reset();
      formFields.forEach(field => {
        errorsState[field] = true;
        const inputEl = document.getElementById(field);
        if (inputEl) inputEl.style.borderColor = 'var(--border-glass)';
      });
      submitBtn.textContent = 'Submit Registration';
      submitBtn.disabled = true;
      
    } catch (err) {
      submitBtn.textContent = 'Submit Registration';
      submitBtn.disabled = false;
    }
  });

  // Initial check to disable button
  checkFormValidity();
});
