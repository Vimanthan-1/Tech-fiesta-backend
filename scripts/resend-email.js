const admin = require("firebase-admin");
const dotenv = require("dotenv");
const { sendRegistrationConfirmationEmail } = require("../services/emailService");
const { events } = require("../data/events");
const { workshops } = require("../data/workshops");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
  console.log("Firebase initialized");
} else {
  console.error("No FIREBASE_SERVICE_ACCOUNT_KEY found");
  process.exit(1);
}

const db = admin.firestore();

async function run() {
  const oldEmail = "sec25it054@gmail.com";
  const newEmail = "sec25it054@sairamtap.edu.in";
  
  console.log(`Searching for registration with email: ${oldEmail}...`);
  const snapshot = await db.collection("registrations").where("userEmail", "==", oldEmail).get();
  
  if (snapshot.empty) {
    console.error("No registration found for that email. Trying by phone...");
    const phoneSnapshot = await db.collection("registrations").where("whatsapp", "==", "7200853683").get();
    if (phoneSnapshot.empty) {
      console.error("No registration found by phone either.");
      process.exit(1);
    }
    await processDoc(phoneSnapshot.docs[0], newEmail);
  } else {
    await processDoc(snapshot.docs[0], newEmail);
  }
  
  console.log("Done");
  process.exit(0);
}

async function processDoc(doc, newEmail) {
  const data = doc.data();
  console.log(`Found registration! ID: ${data.registrationId}, Name: ${data.name || data.userDetails?.name}`);
  
  // Update the email in database
  console.log(`Updating email in DB to ${newEmail}...`);
  await doc.ref.update({
    userEmail: newEmail,
    email: newEmail,
    "userDetails.email": newEmail
  });
  
  // Re-fetch to get updated data
  const updatedDoc = await doc.ref.get();
  const updatedData = updatedDoc.data();
  
  // Construct email payload
  const emailData = {
    registrationId: updatedData.registrationId,
    userEmail: newEmail,
    userName: updatedData.name || updatedData.userDetails?.name,
    userDetails: updatedData.userDetails || {
      name: updatedData.name,
      email: newEmail,
      college: updatedData.college,
    },
    teamDetails: updatedData.isTeamEvent ? {
      isTeamEvent: updatedData.isTeamEvent,
      teamSize: updatedData.teamSize,
      teamMembers: updatedData.teamMembers || [],
    } : (updatedData.teamDetails || null),
    paymentDetails: updatedData.paymentDetails || { amount: 0 },
    selectedPass: updatedData.selectedPass,
    selectedEvents: updatedData.selectedEvents || [],
    selectedWorkshops: updatedData.selectedWorkshops || [],
    selectedNonTechEvents: updatedData.selectedNonTechEvents || []
  };
  
  console.log(`Sending email to ${newEmail}...`);
  try {
    const emailResult = await sendRegistrationConfirmationEmail(emailData, events, workshops);
    if (emailResult && emailResult.success) {
      console.log(`Email sent successfully to ${newEmail}`);
      await doc.ref.update({
        emailSent: true,
        emailSentAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      console.error(`Failed to send email to ${newEmail}`, emailResult);
    }
  } catch(e) {
    console.error(`Exception sending email to ${newEmail}:`, e.message);
  }
}

run().catch(console.error);
