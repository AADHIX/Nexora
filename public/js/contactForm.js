import { api, showToast } from './api.js';

// Debounce helper
const debounce = (func, delay = 300) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-lead-form');
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');

  const validators = {
    name: (val) => (val.trim().length > 0 ? '' : 'Name is required'),
    email: (val) => {
      if (!val) return 'Email is required';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(val) ? '' : 'Enter a valid email address';
    },
    phone: (val) => (val.trim().length > 0 ? '' : 'Phone number is required'),
    subject: (val) => (val.trim().length > 0 ? '' : 'Subject is required'),
    message: (val) => (val.trim().length > 0 ? '' : 'Message is required'),
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
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    formFields.forEach((field) => {
      const inputEl = document.getElementById(field);
      if (inputEl) validateField(field, inputEl);
    });

    if (Object.values(errorsState).includes(true)) {
      showToast('Please fix errors before submitting', 'error');
      return;
    }

    const formData = {
      name: document.getElementById('name').value,
      email: document.getElementById('email').value,
      phone: document.getElementById('phone').value,
      subject: document.getElementById('subject').value,
      message: document.getElementById('message').value,
    };

    try {
      submitBtn.textContent = 'Sending Message...';
      submitBtn.disabled = true;

      const res = await api.post('/api/contact', formData);
      showToast('Message sent successfully!', 'success');

      openSuccessModal(formData.name, res.whatsappLink);

      form.reset();
      formFields.forEach(field => {
        errorsState[field] = true;
        const inputEl = document.getElementById(field);
        if (inputEl) inputEl.style.borderColor = 'var(--border-glass)';
      });

      submitBtn.textContent = 'Send Message';
      submitBtn.disabled = true;
    } catch (err) {
      submitBtn.textContent = 'Send Message';
      submitBtn.disabled = false;
    }
  });

  const openSuccessModal = (name, whatsappLink) => {
    let successModal = document.getElementById('contact-success-modal');
    if (!successModal) {
      successModal = document.createElement('div');
      successModal.id = 'contact-success-modal';
      successModal.className = 'modal';
      document.body.appendChild(successModal);
    }

    successModal.innerHTML = `
      <div class="modal-content text-center">
        <button class="modal-close" id="close-contact-modal-btn">&times;</button>
        <div style="font-size: 3rem; color: var(--success); margin-bottom: 1rem;">
          <i class="fa-solid fa-paper-plane"></i>
        </div>
        <h2 style="margin-bottom: 1rem;">Message Received!</h2>
        <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
          Thank you <strong>${name}</strong>, our administrative team has received your lead details. For immediate feedback, you can chat with our coordinators directly on WhatsApp.
        </p>
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <a href="${whatsappLink}" target="_blank" class="btn btn-primary" style="background: #25D366; box-shadow: 0 0 15px rgba(37, 211, 102, 0.3);">
            <i class="fa-brands fa-whatsapp"></i> Chat on WhatsApp
          </a>
          <button class="btn btn-secondary" id="contact-modal-dismiss-btn">Dismiss</button>
        </div>
      </div>
    `;

    successModal.classList.add('active');

    const dismiss = () => successModal.classList.remove('active');
    document.getElementById('close-contact-modal-btn').addEventListener('click', dismiss);
    document.getElementById('contact-modal-dismiss-btn').addEventListener('click', dismiss);
  };

  checkFormValidity();
});
