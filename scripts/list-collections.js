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

async function listCollections() {
  const collections = await db.listCollections();
  for (const collection of collections) {
    const snapshot = await collection.limit(5).get();
    console.log(`Collection: ${collection.id}, Approx Count: >= ${snapshot.size}`);
    snapshot.forEach(doc => {
      console.log(`  Doc ID: ${doc.id}`);
    });
  }
  process.exit(0);
}

listCollections();
