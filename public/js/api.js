/**
 * Nexora API Fetch Wrapper
 */

// Toast Notification Manager
export const showToast = (message, type = 'success') => {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconClass = 'fa-circle-check';
  if (type === 'error') iconClass = 'fa-circle-xmark';
  if (type === 'warning') iconClass = 'fa-circle-exclamation';

  toast.innerHTML = `
    <i class="fa-solid ${iconClass}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Trigger reflow to initiate transition
  setTimeout(() => toast.classList.add('show'), 10);

  // Auto remove after 4 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

const request = async (url, options = {}) => {
  // Always include credentials to send and receive cookies (JWT)
  options.credentials = 'include';
  
  if (options.body && typeof options.body === 'object') {
    options.headers = {
      ...options.headers,
      'Content-Type': 'application/json',
    };
    options.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, options);
    const result = await response.json();

    if (!response.ok || !result.success) {
      const errorMsg = result.error || 'Something went wrong';
      throw new Error(errorMsg);
    }

    return result.data;
  } catch (error) {
    console.error(`API Error [${options.method || 'GET'} ${url}]:`, error.message);
    showToast(error.message, 'error');
    throw error;
  }
};

export const api = {
  get: (url, options = {}) => request(url, { ...options, method: 'GET' }),
  post: (url, body, options = {}) => request(url, { ...options, method: 'POST', body }),
  put: (url, body, options = {}) => request(url, { ...options, method: 'PUT', body }),
  delete: (url, options = {}) => request(url, { ...options, method: 'DELETE' }),
};
