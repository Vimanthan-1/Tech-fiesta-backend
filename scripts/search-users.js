const admin = require("firebase-admin");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const db = admin.firestore();

async function searchUsers() {
  try {
    const snapshot = await db.collection("registrations").get();
    
    let matchingRegistrations = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const name = (data.name || "").toLowerCase();
      
      if (name.includes("sarmitha") || name.includes("rufina")) {
        matchingRegistrations.push({ id: doc.id, ...data });
      }
    });

    console.log(`Found ${matchingRegistrations.length} matching registrations.`);
    
    matchingRegistrations.forEach((reg, index) => {
      console.log(`\n=== REGISTRATION ${index + 1} ===`);
      console.log("Firestore Doc ID:", reg.id);
      console.log("Registration ID:", reg.registrationId);
      console.log("Name:", reg.name);
      console.log("Email:", reg.email);
      console.log("WhatsApp:", reg.whatsapp);
      console.log("Status:", reg.status);
      console.log("Payment Status:", reg.paymentStatus);
      
      let amountPaid = "N/A";
      if (reg.paymentDetails && reg.paymentDetails.amount) {
          amountPaid = reg.paymentDetails.amount;
      } else if (reg.calculatedAmount) {
          amountPaid = reg.calculatedAmount;
      }
      console.log("Amount Paid:", amountPaid);
      
      console.log("Selected Workshops:", JSON.stringify(reg.selectedWorkshops));
      console.log("Selected Events:", JSON.stringify(reg.selectedEvents));
      if (reg.transactions) {
          console.log("Transactions:", JSON.stringify(reg.transactions));
      }
    });
    
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}

searchUsers();
