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

async function searchSpecificPayment() {
  try {
    const snapshot = await db.collection("payment_orders").get();
    
    let matchingOrders = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const stringifiedData = JSON.stringify(data).toLowerCase();
      
      // Look for the specific payment ID from the screenshot
      if (stringifiedData.includes("pay_thnt6vvqyhjq1")) {
        matchingOrders.push({ id: doc.id, ...data });
      }
    });

    console.log(`Found ${matchingOrders.length} potential payment orders for 'pay_THNt6VVQYyhJQ1'.`);
    
    matchingOrders.forEach((order, index) => {
      console.log(`\n=== ORDER ${index + 1} ===`);
      console.log("Firestore Doc ID:", order.id);
      console.log("Data:", JSON.stringify(order, null, 2));
    });
    
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}

searchSpecificPayment();
