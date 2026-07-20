/**
 * Verify all registration data before sending emails.
 * Checks events, workshops, non-tech events, and team members.
 */

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
const { events } = require("../data/events");
const { workshops } = require("../data/workshops");

async function verify() {
  const snapshot = await db.collection("registrations").get();
  console.log(`Total registrations: ${snapshot.size}\n`);

  let issues = 0;

  snapshot.forEach((doc) => {
    const reg = doc.data();
    const email = reg.userEmail;
    const regId = reg.registrationId || doc.id;
    const name = reg.userDetails?.name || reg.name || "N/A";

    console.log(`━━━ ${regId} | ${email} | ${name} ━━━`);

    // Check selected events
    if (reg.selectedEvents?.length > 0) {
      reg.selectedEvents.forEach((se) => {
        const eventId = se.id || se;
        const found = events.find((e) => e.id === eventId && e.type === "tech");
        if (found) {
          console.log(`  ✅ Tech Event: ${found.title}`);
        } else {
          console.log(`  ⚠️  Tech Event ID ${eventId} NOT FOUND in data`);
          issues++;
        }
      });
    }

    // Check workshops
    if (reg.selectedWorkshops?.length > 0) {
      reg.selectedWorkshops.forEach((sw) => {
        const wId = sw.id || sw;
        const found = workshops.find((w) => w.id === wId);
        if (found) {
          console.log(`  ✅ Workshop: ${found.title}`);
        } else {
          console.log(`  ⚠️  Workshop ID ${wId} NOT FOUND in data`);
          issues++;
        }
      });
    }

    // Check non-tech events
    if (reg.selectedNonTechEvents?.length > 0) {
      reg.selectedNonTechEvents.forEach((se) => {
        const eventId = se.id || se;
        const found = events.find((e) => e.id === eventId && e.type === "non-tech");
        if (found) {
          console.log(`  ✅ Non-Tech: ${found.title}`);
        } else {
          console.log(`  ⚠️  Non-Tech Event ID ${eventId} NOT FOUND in data`);
          issues++;
        }
      });
    }

    // Check team members
    const teamMembers = reg.teamDetails?.teamMembers || reg.teamMembers;
    if (teamMembers?.length > 0) {
      console.log(`  👥 Team (${teamMembers.length} members):`);
      teamMembers.forEach((m, i) => {
        console.log(`     Member ${i + 2}: ${m.name || "N/A"} | ${m.email || "N/A"}`);
      });
    }

    // Check payment
    if (reg.paymentDetails?.amount > 0) {
      console.log(`  💰 Paid: ₹${reg.paymentDetails.amount} (${reg.paymentDetails.paymentId})`);
    } else {
      console.log(`  🆓 Free registration`);
    }

    console.log("");
  });

  console.log("=".repeat(50));
  if (issues > 0) {
    console.log(`⚠️  Found ${issues} issue(s) - some event/workshop IDs don't match the data files.`);
  } else {
    console.log(`✅ All registrations verified - no issues found!`);
  }
  console.log("=".repeat(50));

  process.exit(0);
}

verify();
