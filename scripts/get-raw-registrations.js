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

async function getRawRegistrations() {
  try {
    const snapshot = await db.collection("registrations").get();
    console.log(`Total registrations found: ${snapshot.size}`);
    snapshot.forEach(doc => {
      console.log(`Reg ID: ${doc.id} =>`, JSON.stringify(doc.data(), null, 2));
    });
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

getRawRegistrations();
