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
  console.log("✅ Firebase Admin SDK initialized successfully\n");
} catch (error) {
  console.error("❌ Failed to initialize Firebase Admin:", error.message);
  process.exit(1);
}

const db = admin.firestore();

const TARGET_EMAIL = "divyadarsinibalaji2007@gmail.com";

async function findDivyaRegistration() {
  try {
    // ==========================================
    // 1. Search registrations by email field
    // ==========================================
    console.log("=== Searching REGISTRATIONS collection ===");
    
    // Search by userEmail
    console.log(`\n🔍 Searching by userEmail = "${TARGET_EMAIL}"...`);
    const regByUserEmail = await db.collection("registrations")
      .where("userEmail", "==", TARGET_EMAIL)
      .get();
    
    if (!regByUserEmail.empty) {
      console.log(`✅ Found ${regByUserEmail.size} registration(s) by userEmail:`);
      regByUserEmail.forEach(doc => {
        const data = doc.data();
        console.log("\n📋 Registration Document:", doc.id);
        console.log(JSON.stringify(data, null, 2));
      });
    } else {
      console.log("❌ No registrations found by userEmail");
    }

    // Search by email field (form data)
    console.log(`\n🔍 Searching by email = "${TARGET_EMAIL}"...`);
    const regByEmail = await db.collection("registrations")
      .where("email", "==", TARGET_EMAIL)
      .get();
    
    if (!regByEmail.empty) {
      console.log(`✅ Found ${regByEmail.size} registration(s) by email:`);
      regByEmail.forEach(doc => {
        const data = doc.data();
        console.log("\n📋 Registration Document:", doc.id);
        console.log(JSON.stringify(data, null, 2));
      });
    } else {
      console.log("❌ No registrations found by email field");
    }

    // ==========================================
    // 2. Search payment_orders collection
    // ==========================================
    console.log("\n\n=== Searching PAYMENT_ORDERS collection ===");
    
    console.log(`\n🔍 Searching by userEmail = "${TARGET_EMAIL}"...`);
    const ordersByEmail = await db.collection("payment_orders")
      .where("userEmail", "==", TARGET_EMAIL)
      .get();
    
    if (!ordersByEmail.empty) {
      console.log(`✅ Found ${ordersByEmail.size} payment order(s):`);
      ordersByEmail.forEach(doc => {
        const data = doc.data();
        console.log("\n💳 Payment Order:", doc.id);
        console.log(`  Amount: ₹${data.amount}`);
        console.log(`  Status: ${data.status}`);
        console.log(`  Created: ${data.createdAt?.toDate().toISOString()}`);
        console.log(`  Payment ID: ${data.paymentId || "N/A"}`);
        console.log(`  Registration ID: ${data.registrationId || "N/A"}`);
        console.log(`  Full data:`, JSON.stringify(data, null, 2));
      });
    } else {
      console.log("❌ No payment orders found");
    }

    // ==========================================
    // 3. Also try case-insensitive search by scanning all recent registrations
    // ==========================================
    console.log("\n\n=== Scanning ALL recent registrations for partial match ===");
    const allRegsSnapshot = await db.collection("registrations")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
    
    let found = false;
    allRegsSnapshot.forEach(doc => {
      const data = doc.data();
      const emails = [
        data.userEmail, 
        data.email, 
        data.name
      ].filter(Boolean).map(v => String(v).toLowerCase());
      
      if (emails.some(e => e.includes("divya") || e.includes("darsini") || e.includes("divyadarsini"))) {
        found = true;
        console.log(`\n✅ MATCH FOUND in registration ${doc.id}:`);
        console.log(`  Registration ID: ${data.registrationId}`);
        console.log(`  Name: ${data.name}`);
        console.log(`  Email (form): ${data.email}`);
        console.log(`  UserEmail: ${data.userEmail}`);
        console.log(`  Status: ${data.status}`);
        console.log(`  Payment Status: ${data.paymentStatus}`);
        console.log(`  Email Sent: ${data.emailSent}`);
        console.log(`  Created: ${data.createdAt?.toDate().toISOString()}`);
        console.log(`  Payment Details:`, JSON.stringify(data.paymentDetails, null, 2));
      }
    });
    
    if (!found) {
      console.log("❌ No partial match found in recent 50 registrations");
    }

    // ==========================================
    // 4. Scan all recent payment orders for partial match
    // ==========================================
    console.log("\n\n=== Scanning ALL recent payment orders for partial match ===");
    const allOrdersSnapshot = await db.collection("payment_orders")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
    
    let orderFound = false;
    allOrdersSnapshot.forEach(doc => {
      const data = doc.data();
      const email = (data.userEmail || "").toLowerCase();
      
      if (email.includes("divya") || email.includes("darsini") || email.includes("divyadarsini")) {
        orderFound = true;
        console.log(`\n✅ MATCH FOUND in payment order ${doc.id}:`);
        console.log(`  Email: ${data.userEmail}`);
        console.log(`  Amount: ₹${data.amount}`);
        console.log(`  Status: ${data.status}`);
        console.log(`  Payment ID: ${data.paymentId || "N/A"}`);
        console.log(`  Registration ID: ${data.registrationId || "N/A"}`);
        console.log(`  Created: ${data.createdAt?.toDate().toISOString()}`);
      }
    });
    
    if (!orderFound) {
      console.log("❌ No partial match found in recent 50 payment orders");
    }

  } catch (error) {
    console.error("❌ Error querying Firestore:", error);
  }
  process.exit(0);
}

findDivyaRegistration();
