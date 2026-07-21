// Script to remove Workshop and Missing Lyrics from registration TF2025-167FF7D1
// ONLY modifies these specific fields for this specific person:
//   - selectedWorkshops: [] (was [{id:4, title:"Building a Private Cloud with OpenStack"}])
//   - selectedNonTechEvents: [] (was [{id:9, title:"Missing Lyrics"}])
//   - eventAttendance.workshops: [] (was 1 entry for OpenStack)
//   - eventAttendance.nonTechEvents: [] (was 1 entry for Missing Lyrics)
// 
// DOES NOT TOUCH:
//   - selectedEvents (UI Challenge stays)
//   - eventAttendance.techEvents (UI Challenge attendance stays)
//   - name, email, whatsapp, team info, payment status, etc.

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

async function removeWorkshopAndMissingLyrics() {
  try {
    // Step 1: Find the exact document
    const snapshot = await db
      .collection("registrations")
      .where("registrationId", "==", "TF2025-167FF7D1")
      .get();

    if (snapshot.empty) {
      console.log("❌ Registration TF2025-167FF7D1 not found");
      process.exit(1);
    }

    const doc = snapshot.docs[0];
    const docRef = doc.ref;
    const data = doc.data();

    // Safety check - confirm this is the right person
    console.log("🔍 Confirming target registration:");
    console.log(`   Doc ID: ${doc.id}`);
    console.log(`   Name: ${data.name}`);
    console.log(`   Email: ${data.email}`);

    if (data.email !== "monishad.cse2025@citchennai.net") {
      console.log("❌ ABORT: Email doesn't match expected value!");
      process.exit(1);
    }

    // Step 2: Apply targeted updates ONLY to workshop and non-tech event fields
    await docRef.update({
      selectedWorkshops: [],                      // Remove workshop selection
      selectedNonTechEvents: [],                  // Remove non-tech event selection
      "eventAttendance.workshops": [],            // Remove workshop attendance tracking
      "eventAttendance.nonTechEvents": [],        // Remove non-tech attendance tracking
      updatedAt: admin.firestore.Timestamp.now(),
    });

    console.log("\n✅ Successfully updated registration TF2025-167FF7D1:");
    console.log("   ❌ Removed: Workshop - Building a Private Cloud with OpenStack");
    console.log("   ❌ Removed: Non-Tech Event - Missing Lyrics");
    console.log("   ✅ Kept: Tech Event - UI Challenge – Design the Future");
    console.log("   ✅ Kept: All personal info, team info, payment status unchanged");

    // Step 3: Verify the update
    const verifyDoc = await docRef.get();
    const verified = verifyDoc.data();
    console.log("\n🔍 Verification:");
    console.log("   selectedEvents:", JSON.stringify(verified.selectedEvents));
    console.log("   selectedWorkshops:", JSON.stringify(verified.selectedWorkshops));
    console.log("   selectedNonTechEvents:", JSON.stringify(verified.selectedNonTechEvents));
    console.log("   eventAttendance.techEvents:", JSON.stringify(verified.eventAttendance?.techEvents));
    console.log("   eventAttendance.workshops:", JSON.stringify(verified.eventAttendance?.workshops));
    console.log("   eventAttendance.nonTechEvents:", JSON.stringify(verified.eventAttendance?.nonTechEvents));
  } catch (err) {
    console.error("❌ Error:", err);
  }
  process.exit(0);
}

removeWorkshopAndMissingLyrics();
