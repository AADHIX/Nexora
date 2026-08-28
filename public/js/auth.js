import { api, showToast } from './api.js';

/**
 * Check session and return user object if logged in
 */
export const checkSession = async () => {
  try {
    const user = await api.get('/api/auth/me');
    return user;
  } catch (err) {
    return null;
  }
};

/**
 * Log in a user (Admin/Doctor)
 */
export const loginUser = async (email, password) => {
  try {
    const user = await api.post('/api/auth/login', { email, password });
    showToast(`Welcome back, ${user.name}!`, 'success');
    return user;
  } catch (err) {
    // Error is already alerted by Toast in api.js
    return null;
  }
};

/**
 * Log out a user
 */
export const logoutUser = async () => {
  try {
    await api.post('/api/auth/logout');
    showToast('Logged out successfully', 'success');
    setTimeout(() => {
      window.location.href = '/index.html';
    }, 1000);
  } catch (err) {
    console.error('Logout failed:', err);
  }
};

/**
 * Update navigation elements dynamically based on login status
 */
export const updateNavAuthLinks = (user) => {
  const navList = document.querySelector('nav ul');
  if (!navList) return;

  // Remove existing dynamic auth items
  const dynamicItems = navList.querySelectorAll('.auth-dynamic');
  dynamicItems.forEach(item => item.remove());

  if (user) {
    // User is logged in: add Dashboard and Logout
    const dashLi = document.createElement('li');
    dashLi.className = 'auth-dynamic';
    dashLi.innerHTML = `<a href="/dashboard.html" class="${window.location.pathname.includes('dashboard') ? 'active' : ''}">Dashboard</a>`;
    
    const logoutLi = document.createElement('li');
    logoutLi.className = 'auth-dynamic';
    logoutLi.innerHTML = `<a href="#" id="nav-logout-btn" class="nav-btn">Logout</a>`;

    navList.appendChild(dashLi);
    navList.appendChild(logoutLi);

    document.getElementById('nav-logout-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      logoutUser();
    });
  } else {
    // User is guest: add Patient Register (if not already on landing page / contact, etc.) and Portal Login Button
    const loginLi = document.createElement('li');
    loginLi.className = 'auth-dynamic';
    loginLi.innerHTML = `<a href="#" id="nav-login-btn" class="nav-btn"><i class="fa-solid fa-lock"></i> Staff Portal</a>`;
    navList.appendChild(loginLi);

    document.getElementById('nav-login-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      openLoginModal();
    });
  }
};

/**
 * Render the global login modal dynamically on the page
 */
export const openLoginModal = () => {
  let modal = document.getElementById('login-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'login-modal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <button class="modal-close" id="close-login-btn">&times;</button>
        <h2 style="margin-bottom: 1.5rem; text-align: center;"><i class="fa-solid fa-user-shield text-accent"></i> Staff Access</h2>
        <form id="login-form">
          <div class="form-group">
            <label for="login-email">Email Address</label>
            <input type="email" id="login-email" class="form-control" placeholder="staff@nexora.com" required>
            <div class="form-error" id="login-email-error"></div>
          </div>
          <div class="form-group">
            <label for="login-password">Password</label>
            <input type="password" id="login-password" class="form-control" placeholder="••••••••" required>
            <div class="form-error" id="login-password-error"></div>
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Log In</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    // Form submission listener
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;

      const user = await loginUser(email, password);
      if (user) {
        modal.classList.remove('active');
        setTimeout(() => {
          window.location.href = '/dashboard.html';
        }, 1000);
      }
    });

    // Close listeners
    document.getElementById('close-login-btn').addEventListener('click', () => {
      modal.classList.remove('active');
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  }

  modal.classList.add('active');
};
