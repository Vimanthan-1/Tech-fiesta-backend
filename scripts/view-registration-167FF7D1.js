// READ-ONLY script - just fetches and displays the registration data
// Does NOT modify anything

const admin = require("firebase-admin");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID,
});

const db = admin.firestore();

async function viewRegistration() {
  try {
    const snapshot = await db
      .collection("registrations")
      .where("registrationId", "==", "TF2025-167FF7D1")
      .get();

    if (snapshot.empty) {
      console.log("❌ No registration found with ID: TF2025-167FF7D1");
      process.exit(1);
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    console.log("=== REGISTRATION DATA FOR TF2025-167FF7D1 ===");
    console.log("Firestore Doc ID:", doc.id);
    console.log("\n--- Personal Info ---");
    console.log("Name:", data.name);
    console.log("Email:", data.email);
    console.log("WhatsApp:", data.whatsapp);

    console.log("\n--- Selected Events (Tech) ---");
    console.log(JSON.stringify(data.selectedEvents, null, 2));

    console.log("\n--- Selected Workshops ---");
    console.log(JSON.stringify(data.selectedWorkshops, null, 2));

    console.log("\n--- Selected Non-Tech Events ---");
    console.log(JSON.stringify(data.selectedNonTechEvents, null, 2));

    console.log("\n--- Event Count ---");
    console.log(data.eventCount);

    console.log("\n--- Workshop Details ---");
    console.log(JSON.stringify(data.workshopDetails, null, 2));

    console.log("\n--- Event Attendance ---");
    console.log(JSON.stringify(data.eventAttendance, null, 2));

    console.log("\n--- Payment Status ---");
    console.log("Status:", data.status);
    console.log("Payment Status:", data.paymentStatus);

    console.log("\n--- Pass Info ---");
    console.log("ispass:", data.ispass);
    console.log("selectedPassId:", data.selectedPassId);
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}

viewRegistration();
