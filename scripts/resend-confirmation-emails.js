/**
 * Resend Registration Confirmation Emails
 * ----------------------------------------
 * This script fetches all registrations from Firestore and resends
 * the confirmation email (with the updated date) to each registrant.
 *
 * Usage:
 *   DRY RUN (preview only, no emails sent):
 *     node scripts/resend-confirmation-emails.js --dry-run
 *
 *   SEND FOR REAL:
 *     node scripts/resend-confirmation-emails.js
 *
 *   SEND TO A SPECIFIC EMAIL ONLY (for testing):
 *     node scripts/resend-confirmation-emails.js --test-email someone@example.com
 */

const admin = require("firebase-admin");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

// Initialize Firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID,
});

const db = admin.firestore();

// Import email service and data
const {
  sendRegistrationConfirmationEmail,
} = require("../services/emailService");
const { events } = require("../data/events");
const { workshops } = require("../data/workshops");

// Parse CLI arguments
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const testEmailIndex = args.indexOf("--test-email");
const testEmail = testEmailIndex !== -1 ? args[testEmailIndex + 1] : null;

// Delay between emails (ms) to avoid rate limits
const DELAY_BETWEEN_EMAILS_MS = 2000; // 2 seconds

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resendAllEmails() {
  console.log("=".repeat(60));
  console.log("📧 RESEND CONFIRMATION EMAILS");
  console.log("=".repeat(60));

  if (isDryRun) {
    console.log("🔍 MODE: DRY RUN (no emails will be sent)\n");
  } else {
    console.log("🚀 MODE: LIVE (emails will be sent)\n");
  }

  if (testEmail) {
    console.log(`🎯 FILTER: Only sending to ${testEmail}\n`);
  }

  try {
    // Fetch all registrations
    console.log("📥 Fetching registrations from Firestore...");
    const snapshot = await db.collection("registrations").get();
    console.log(`✅ Found ${snapshot.size} total registrations\n`);

    if (snapshot.empty) {
      console.log("⚠️  No registrations found. Exiting.");
      process.exit(0);
    }

    // Build the list of registrations to process
    let registrations = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      registrations.push({
        docId: doc.id,
        ...data,
      });
    });

    // Filter by test email if specified
    if (testEmail) {
      registrations = registrations.filter(
        (reg) => reg.userEmail === testEmail
      );
      console.log(
        `🎯 Filtered to ${registrations.length} registration(s) matching ${testEmail}\n`
      );

      if (registrations.length === 0) {
        console.log(`⚠️  No registrations found for ${testEmail}. Exiting.`);
        process.exit(0);
      }
    }

    // Summary before sending
    console.log("📊 PRE-SEND SUMMARY:");
    console.log(`   Total registrations to process: ${registrations.length}`);
    console.log(
      `   Estimated time: ~${Math.ceil(
        (registrations.length * DELAY_BETWEEN_EMAILS_MS) / 1000 / 60
      )} minutes`
    );
    console.log(`   Delay between emails: ${DELAY_BETWEEN_EMAILS_MS}ms`);
    console.log("");

    // Process each registration
    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;
    const failures = [];

    for (let i = 0; i < registrations.length; i++) {
      const reg = registrations[i];
      const regId = reg.registrationId || reg.docId;
      const email = reg.userEmail;

      console.log(
        `[${i + 1}/${registrations.length}] Processing: ${email} (${regId})`
      );

      if (!email) {
        console.log(`   ⏭️  SKIPPED - No email address found`);
        skipCount++;
        continue;
      }

      if (isDryRun) {
        console.log(`   📋 DRY RUN - Would send to: ${email}`);
        console.log(
          `      Events: ${reg.selectedEvents?.length || 0}, Workshops: ${
            reg.selectedWorkshops?.length || 0
          }, Non-Tech: ${reg.selectedNonTechEvents?.length || 0}`
        );
        successCount++;
        continue;
      }

      try {
        const result = await sendRegistrationConfirmationEmail(
          reg,
          events,
          workshops
        );

        if (result.success) {
          console.log(`   ✅ SENT successfully (Message ID: ${result.messageId})`);
          successCount++;
        } else {
          console.log(`   ❌ FAILED - ${result.error}`);
          failCount++;
          failures.push({ email, regId, error: result.error });
        }
      } catch (err) {
        console.log(`   ❌ ERROR - ${err.message}`);
        failCount++;
        failures.push({ email, regId, error: err.message });
      }

      // Delay between sends (skip delay on last email)
      if (i < registrations.length - 1) {
        await sleep(DELAY_BETWEEN_EMAILS_MS);
      }
    }

    // Final summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 FINAL SUMMARY");
    console.log("=".repeat(60));
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   ⏭️  Skipped: ${skipCount}`);
    console.log(`   📧 Total processed: ${registrations.length}`);

    if (failures.length > 0) {
      console.log("\n❌ FAILED EMAILS:");
      failures.forEach((f) => {
        console.log(`   - ${f.email} (${f.regId}): ${f.error}`);
      });
    }

    if (isDryRun) {
      console.log(
        "\n💡 This was a DRY RUN. To actually send emails, run without --dry-run"
      );
    }
  } catch (err) {
    console.error("❌ Fatal error:", err);
  }

  process.exit(0);
}

resendAllEmails();
