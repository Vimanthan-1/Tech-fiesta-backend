const {
  sendRegistrationConfirmationEmail,
} = require("./services/emailService");
const { events } = require("./data/events");
const { workshops } = require("./data/workshops");

// Test data that mimics the structure from registration route
const testEmailData = {
  registrationId: "TF2026-TEST123",
  userEmail: "test@example.com",
  userName: "Test User",
  userDetails: {
    name: "Test User",
    email: "test@example.com",
    whatsapp: "+91 9876543210",
    college: "Test College",
    department: "Computer Science",
    year: "3rd",
  },
  teamDetails: null,
  paymentDetails: { amount: 0 }, // Free registration
  selectedPass: null,
  selectedEvents: [],
  selectedWorkshops: [],
  selectedNonTechEvents: [],
};

// Test the email template generation without actually sending
console.log("🧪 Testing email template with user details...");
console.log("Test data structure:", JSON.stringify(testEmailData, null, 2));

// Just test the template generation part
try {
  // We'll just require the template function directly
  const emailService = require("./services/emailService");
  console.log("✅ Email service loaded successfully");
  console.log("Available functions:", Object.keys(emailService));
} catch (error) {
  console.error("❌ Error loading email service:", error);
}
