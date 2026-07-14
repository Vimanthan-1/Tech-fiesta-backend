const admin = require("firebase-admin");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  console.error("❌ Error: FIREBASE_SERVICE_ACCOUNT_KEY not found in .env file.");
  process.exit(1);
}

try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
  console.log("✅ Firebase Admin SDK initialized successfully");
} catch (error) {
  console.error("❌ Failed to initialize Firebase Admin:", error.message);
  process.exit(1);
}

const db = admin.firestore();

async function checkRecentOrdersAndRegistrations() {
  try {
    console.log("\n--- Checking Recent Payment Orders (Last 20) ---");
    const ordersSnapshot = await db.collection("payment_orders")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();
    
    if (ordersSnapshot.empty) {
      console.log("No payment orders found.");
    } else {
      ordersSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`Order ID: ${doc.id} | Email: ${data.userEmail} | Amount: ₹${data.amount} | Status: ${data.status} | Created: ${data.createdAt?.toDate().toISOString()}`);
      });
    }

    console.log("\n--- Checking Recent Registrations (Last 20) ---");
    const regSnapshot = await db.collection("registrations")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();
      
    if (regSnapshot.empty) {
      console.log("No registrations found.");
    } else {
      regSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`Reg ID: ${data.registrationId} | Email: ${data.userEmail} | Status: ${data.status} | Payment: ${data.paymentStatus} | Created: ${data.createdAt?.toDate().toISOString()}`);
      });
    }
  } catch (error) {
    console.error("❌ Error querying Firestore:", error);
  }
  process.exit(0);
}

checkRecentOrdersAndRegistrations();
