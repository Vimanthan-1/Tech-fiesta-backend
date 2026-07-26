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

async function countPiRegistrations() {
  const snapshot = await db.collection("registrations").get();
  let count = 0;
  snapshot.forEach(doc => {
    const data = doc.data();
    // Check in selectedWorkshops array
    const hasInArray = data.selectedWorkshops && Array.isArray(data.selectedWorkshops) && data.selectedWorkshops.some(w => w.id === 2);
    // Check in workshopDetails object
    const hasInDetails = data.workshopDetails && data.workshopDetails.selectedWorkshop === 2;
    
    if (hasInArray || hasInDetails) {
      count++;
    }
  });
  console.log(`Total registrations for Raspberry Pi workshop: ${count}`);
  process.exit(0);
}

countPiRegistrations();
