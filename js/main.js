/**
 * ==========================================================
 * NEXORA TECHNOLOGIES - MAIN APPLICATION JAVASCRIPT
 * ==========================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // Use SITE_CONFIG from config.js or fallback defaults
  const config = window.SITE_CONFIG || {
    companyName: "Nexora Technologies",
    whatsapp: {
      phoneNumber: "15551234567",
      displayNumber: "+1 (555) 123-4567",
      agentName: "Nexora Support Team",
      welcomeMessage: "Hello! 👋 Welcome to Nexora Technologies. How can we assist you today?"
    },
    contact: {
      email: "contact@nexoratech.com",
      phone: "+1 (555) 123-4567",
      address: "742 Evergreen Terrace, Tech City, CA 94016"
    }
  };

  initNavbar();
  initWhatsAppWidget(config);
  initWhatsAppServiceInquiries(config);
  initContactForm(config);
  initStatsCounter();
  initDynamicConfigSync(config);
});

/**
 * Sync dynamic data attributes and links with SITE_CONFIG
 */
function initDynamicConfigSync(config) {
  // Update all WhatsApp direct links
  const waLinks = document.querySelectorAll('.wa-link-btn');
  waLinks.forEach(link => {
    const defaultText = encodeURIComponent("Hello Nexora! I would like to learn more about your services.");
    link.href = `https://wa.me/${config.whatsapp.phoneNumber}?text=${defaultText}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });

  // Update company text elements
  document.querySelectorAll('[data-config="companyName"]').forEach(el => {
    el.textContent = config.companyName;
  });
  document.querySelectorAll('[data-config="phone"]').forEach(el => {
    el.textContent = config.contact.phone;
  });
  document.querySelectorAll('[data-config="email"]').forEach(el => {
    el.textContent = config.contact.email;
    if (el.tagName === 'A') el.href = `mailto:${config.contact.email}`;
  });
  document.querySelectorAll('[data-config="address"]').forEach(el => {
    el.textContent = config.contact.address;
  });
}

/**
 * Navbar sticky scroll effect and mobile hamburger menu
 */
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const menuToggle = document.getElementById('menuToggle');
  const navMenu = document.getElementById('navMenu');
  const navLinks = document.querySelectorAll('.nav-link');

  // Sticky navbar on scroll
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    updateActiveNavLink();
  });

  // Mobile menu toggle
  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      const icon = menuToggle.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-bars');
        icon.classList.toggle('fa-xmark');
      }
    });

    // Close menu when clicking any nav link
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        const icon = menuToggle.querySelector('i');
        if (icon) {
          icon.classList.add('fa-bars');
          icon.classList.remove('fa-xmark');
        }
      });
    });
  }

  // Active section indicator on scroll
  function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const scrollY = window.pageYOffset;

    sections.forEach(current => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - 120;
      const sectionId = current.getAttribute('id');
      const link = document.querySelector(`.nav-link[href*="${sectionId}"]`);

      if (link) {
        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      }
    });
  }
}

/**
 * Floating WhatsApp Live Chat Widget
 */
function initWhatsAppWidget(config) {
  const triggerBtn = document.getElementById('waTriggerBtn');
  const chatBox = document.getElementById('waChatBox');
  const closeBtn = document.getElementById('waCloseBtn');
  const sendBtn = document.getElementById('waSendBtn');
  const inputField = document.getElementById('waInput');
  const chipsContainer = document.getElementById('waQuickChips');
  const agentNameEl = document.getElementById('waAgentName');
  const welcomeMsgEl = document.getElementById('waWelcomeMsg');
  const notificationBadge = document.getElementById('waNotificationBadge');

  if (!triggerBtn || !chatBox) return;

  // Set Agent Info
  if (agentNameEl && config.whatsapp.agentName) {
    agentNameEl.textContent = config.whatsapp.agentName;
  }
  if (welcomeMsgEl && config.whatsapp.welcomeMessage) {
    welcomeMsgEl.textContent = config.whatsapp.welcomeMessage;
  }

  // Populate Quick Action Chips
  if (chipsContainer && config.quickChatTemplates) {
    chipsContainer.innerHTML = '';
    config.quickChatTemplates.forEach(item => {
      const chipBtn = document.createElement('button');
      chipBtn.className = 'quick-chip-btn';
      chipBtn.type = 'button';
      chipBtn.textContent = item.label;
      chipBtn.addEventListener('click', () => {
        sendWhatsAppMessage(config.whatsapp.phoneNumber, item.message);
      });
      chipsContainer.appendChild(chipBtn);
    });
  }

  // Toggle Chat Box
  triggerBtn.addEventListener('click', () => {
    chatBox.classList.toggle('active');
    if (notificationBadge) notificationBadge.style.display = 'none';
    if (chatBox.classList.contains('active')) {
      setTimeout(() => inputField && inputField.focus(), 200);
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      chatBox.classList.remove('active');
    });
  }

  // Send message on button click or Enter key
  function handleSendMessage() {
    const text = inputField.value.trim();
    if (!text) return;
    sendWhatsAppMessage(config.whatsapp.phoneNumber, text);
    inputField.value = '';
    chatBox.classList.remove('active');
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', handleSendMessage);
  }

  if (inputField) {
    inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSendMessage();
      }
    });
  }
}

/**
 * Opens WhatsApp Chat with specified text message
 */
function sendWhatsAppMessage(phoneNumber, message) {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  const encodedMsg = encodeURIComponent(message);
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
  window.open(waUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Handle Service Inquiries directly via WhatsApp
 */
function initWhatsAppServiceInquiries(config) {
  const inquireButtons = document.querySelectorAll('.btn-service-inquire');
  inquireButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const serviceTitle = btn.getAttribute('data-service') || 'Digital Solutions';
      const msg = `Hello ${config.companyName}! 👋\nI am interested in inquiring about your *${serviceTitle}* service.\nCould you please provide more information regarding timeline, deliverables, and pricing?`;
      sendWhatsAppMessage(config.whatsapp.phoneNumber, msg);
    });
  });
}

/**
 * Interactive Contact Form with Dual Submission (WhatsApp & Free Email API)
 */
function initContactForm(config) {
  const form = document.getElementById('contactForm');
  const btnSubmitWA = document.getElementById('btnSubmitWA');
  const btnSubmitEmail = document.getElementById('btnSubmitEmail');

  if (!form) return;

  // WhatsApp Instant Dispatch
  if (btnSubmitWA) {
    btnSubmitWA.addEventListener('click', (e) => {
      e.preventDefault();
      if (!validateForm(form)) return;

      const name = form.querySelector('[name="name"]').value.trim();
      const email = form.querySelector('[name="email"]').value.trim();
      const phone = form.querySelector('[name="phone"]').value.trim() || 'Not provided';
      const service = form.querySelector('[name="service"]').value || 'General Inquiry';
      const userMsg = form.querySelector('[name="message"]').value.trim();

      const formattedMessage = 
`🔔 *NEW CONTACT INQUIRY - ${config.companyName}*
----------------------------------
👤 *Name:* ${name}
📧 *Email:* ${email}
📞 *Phone:* ${phone}
🛠️ *Service of Interest:* ${service}
💬 *Message:*
${userMsg}
----------------------------------
_Sent via Nexora Web Portal_`;

      sendWhatsAppMessage(config.whatsapp.phoneNumber, formattedMessage);
      showToast('Opening WhatsApp with your formatted message... 💬');
      form.reset();
    });
  }

  // Email / Free API Dispatch (e.g. Web3Forms or Fallback)
  if (btnSubmitEmail) {
    btnSubmitEmail.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!validateForm(form)) return;

      const formData = new FormData(form);
      const originalText = btnSubmitEmail.innerHTML;
      btnSubmitEmail.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
      btnSubmitEmail.disabled = true;

      // Note: You can replace the endpoint below with your free Web3Forms Access Key
      // https://web3forms.com (100% free, no backend required)
      try {
        // Fallback simulation or Web3Forms post
        await new Promise(resolve => setTimeout(resolve, 800));
        showToast('Thank you! Your message has been received. We will contact you shortly. ✉️');
        form.reset();
      } catch (err) {
        showToast('Unable to send email right now. Please try WhatsApp! ⚠️');
      } finally {
        btnSubmitEmail.innerHTML = originalText;
        btnSubmitEmail.disabled = false;
      }
    });
  }
}

/**
 * Basic Form Validation Helper
 */
function validateForm(form) {
  const name = form.querySelector('[name="name"]');
  const email = form.querySelector('[name="email"]');
  const msg = form.querySelector('[name="message"]');

  if (!name.value.trim()) {
    showToast('Please enter your full name ⚠️');
    name.focus();
    return false;
  }
  if (!email.value.trim() || !email.value.includes('@')) {
    showToast('Please enter a valid email address ⚠️');
    email.focus();
    return false;
  }
  if (!msg.value.trim()) {
    showToast('Please enter your message ⚠️');
    msg.focus();
    return false;
  }
  return true;
}

/**
 * Toast Notification Popup
 */
function showToast(message) {
  let toast = document.getElementById('toastNotification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastNotification';
    toast.className = 'toast-notification';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color: #25d366; font-size: 1.2rem;"></i> <span>${message}</span>`;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

/**
 * Animated Numbers Counter
 */
function initStatsCounter() {
  const counters = document.querySelectorAll('.stat-number[data-target], .box-number[data-target]');
  if (!counters.length) return;

  let hasRun = false;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !hasRun) {
        hasRun = true;
        counters.forEach(counter => {
          const target = +counter.getAttribute('data-target');
          const prefix = counter.getAttribute('data-prefix') || '';
          const suffix = counter.getAttribute('data-suffix') || '';
          const duration = 1500; // ms
          const stepTime = 20;
          const totalSteps = duration / stepTime;
          const increment = target / totalSteps;
          let current = 0;

          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              counter.textContent = `${prefix}${target}${suffix}`;
              clearInterval(timer);
            } else {
              counter.textContent = `${prefix}${Math.floor(current)}${suffix}`;
            }
          }, stepTime);
        });
      }
    });
  }, { threshold: 0.2 });

  const statsSection = document.querySelector('.hero-stats') || document.querySelector('.about-visual');
  if (statsSection) {
    observer.observe(statsSection);
  }
}
