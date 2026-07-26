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

async function searchNetra() {
  try {
    const collections = await db.listCollections();
    console.log("Available Collections:");
    collections.forEach(col => console.log(`- ${col.id}`));

    const snapshot = await db.collection("registrations").get();
    
    let netraRegistrations = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const nameMatch = data.name && data.name.toLowerCase().includes("netra");
      const emailMatch = data.email && data.email.toLowerCase().includes("netra");
      
      if (nameMatch || emailMatch) {
        netraRegistrations.push({ id: doc.id, ...data });
      }
    });

    console.log(`\nFound ${netraRegistrations.length} registrations for 'netra' (by name or email).`);
    
    netraRegistrations.forEach((reg, index) => {
      console.log(`\n=== REGISTRATION ${index + 1} ===`);
      console.log("Firestore Doc ID:", reg.id);
      console.log("Name:", reg.name);
      console.log("Email:", reg.email);
      console.log("Status:", reg.status);
      console.log("Payment Status:", reg.paymentStatus);
      if (reg.paymentDetails) {
          console.log("Payment Details:", JSON.stringify(reg.paymentDetails));
      }
      if (reg.transactions) {
          console.log("Transactions:", JSON.stringify(reg.transactions));
      }
    });
    
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}

searchNetra();
