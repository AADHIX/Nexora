/**
 * ==========================================================
 * WEBSITE & WHATSAPP CONFIGURATION
 * ==========================================================
 * Update these details to customize your company info,
 * WhatsApp contact number, email, and pre-filled message templates.
 */

const SITE_CONFIG = {
  // Company & Branding
  companyName: "Nexora Technologies",
  companyTagline: "Innovative Digital & Cloud Solutions for Modern Enterprises",
  companyDescription: "We craft cutting-edge web applications, cloud architectures, and digital transformation solutions to help businesses scale globally.",
  
  // Contact Details
  // IMPORTANT: For WhatsApp, enter the phone number with country code (NO '+' or spaces or dashes)
  whatsapp: {
    phoneNumber: "918921540983", // Real WhatsApp Number with Country Code (91)
    displayNumber: "+91 89215 40983",
    agentName: "Nexora Support Team",
    agentRole: "Customer Success & Consultation",
    welcomeMessage: "Hello! 👋 Welcome to Nexora Technologies. How can we assist you today?",
    responseBadge: "Typically replies in minutes",
    onlineStatus: "Online Now"
  },

  // Contact Info
  contact: {
    email: "contact@nexoratech.com",
    supportEmail: "support@nexoratech.com",
    phone: "+91 89215 40983",
    address: "742 Evergreen Terrace, Suite 500, Tech City, CA 94016",
    workingHours: "Mon - Fri: 9:00 AM - 6:00 PM (IST)",
    googleMapsUrl: "https://maps.google.com"
  },

  // Social Profiles
  socials: {
    github: "https://github.com",
    linkedin: "https://linkedin.com",
    twitter: "https://twitter.com",
    instagram: "https://instagram.com"
  },

  // WhatsApp Pre-filled Quick Chips & Templates
  quickChatTemplates: [
    {
      label: "🚀 Get a Project Quote",
      message: "Hi Nexora Team! I would like to request a quotation for a new web development / software project."
    },
    {
      label: "💼 Consult on Services",
      message: "Hello! I'd like to schedule a consultation regarding your digital solutions and services."
    },
    {
      label: "🛠️ Technical Support",
      message: "Hi! I am reaching out regarding technical support for an existing product."
    },
    {
      label: "🤝 Partner with Us",
      message: "Hello Nexora! We are interested in exploring a business partnership or collaboration."
    }
  ]
};

// Export configuration to global window object
if (typeof window !== "undefined") {
  window.SITE_CONFIG = SITE_CONFIG;
}
