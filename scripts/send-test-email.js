/**
 * Send a test confirmation email to a non-registered email address.
 * Uses dummy registration data to preview the email template.
 */

const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const {
  sendRegistrationConfirmationEmail,
} = require("../services/emailService");
const { events } = require("../data/events");
const { workshops } = require("../data/workshops");

const testRegistration = {
  registrationId: "TF2025-TEST0001",
  userEmail: "vimanexample@gmail.com",
  userDetails: {
    name: "Test User",
    college: "Chennai Institute of Technology",
    department: "CSE",
    whatsapp: "9876543210",
  },
  selectedEvents: [{ id: 1 }, { id: 3 }],
  selectedWorkshops: [{ id: 1 }],
  selectedNonTechEvents: [{ id: 7 }],
  paymentDetails: {
    amount: 250,
    paymentId: "pay_TEST123456",
  },
};

async function main() {
  console.log("📧 Sending test email to vimanexample@gmail.com...\n");
  const result = await sendRegistrationConfirmationEmail(
    testRegistration,
    events,
    workshops
  );

  if (result.success) {
    console.log("\n✅ Test email sent successfully!");
    console.log(`   Message ID: ${result.messageId}`);
  } else {
    console.log("\n❌ Failed to send test email:", result.error);
  }
  process.exit(0);
}

main();
