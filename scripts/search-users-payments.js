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

async function searchPaymentOrders() {
  try {
    const snapshot = await db.collection("payment_orders").get();
    
    let matchingOrders = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const stringifiedData = JSON.stringify(data).toLowerCase();
      
      if (stringifiedData.includes("sarmitha") || stringifiedData.includes("rufina") || stringifiedData.includes("xena")) {
        matchingOrders.push({ id: doc.id, ...data });
      }
    });

    console.log(`Found ${matchingOrders.length} matching payment orders.`);
    
    matchingOrders.forEach((order, index) => {
      console.log(`\n=== ORDER ${index + 1} ===`);
      console.log("Firestore Doc ID:", order.id);
      
      const regData = order.registrationData || {};
      console.log("Name:", regData.name);
      console.log("Email:", regData.email || order.userEmail);
      console.log("Status:", order.status);
      console.log("Amount:", order.amount);
      
      console.log("Selected Workshops:", JSON.stringify(regData.selectedWorkshops));
      console.log("Selected Events:", JSON.stringify(regData.selectedEvents));
      
      if (order.paymentId) {
          console.log("Payment ID:", order.paymentId);
      }
    });
    
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}

searchPaymentOrders();
