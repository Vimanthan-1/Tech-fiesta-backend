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

async function showCompletedOrders() {
  const snapshot = await db.collection("payment_orders").where("status", "==", "completed").get();
  console.log(`Completed orders: ${snapshot.size}`);
  snapshot.forEach(doc => {
    console.log(`Order ID: ${doc.id}`);
    console.log(JSON.stringify(doc.data(), null, 2));
  });
  process.exit(0);
}

showCompletedOrders();
