const admin = require("firebase-admin");
const dotenv = require("dotenv");
const { v4: uuidv4 } = require("uuid");
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

const generateId = () => `TF2026-${uuidv4().substr(0, 8).toUpperCase()}`;

const persons = [
  {
    name: "Rufina Xena A",
    email: "rufinaxenaamalan@gmail.com",
    college: "Panimalar Egineering College",
    amountPaid: 101,
    selectedWorkshops: [{ id: 1, title: "Orchestration of Multi-Agent Systems in Production" }],
    selectedEvents: [],
    selectedNonTechEvents: []
  },
  {
    name: "Sarmitha R",
    email: "sarmithar2107@gmail.com",
    college: "Panimalar Egineering College",
    amountPaid: 101,
    selectedWorkshops: [{ id: 1, title: "Orchestration of Multi-Agent Systems in Production" }],
    selectedEvents: [],
    selectedNonTechEvents: []
  },
  {
    name: "Divyadarsini B",
    email: "divyadarsinibalaji2007@gmail.com",
    college: "Panimalar Engineering College, Chennai",
    amountPaid: 70,
    selectedWorkshops: [],
    selectedEvents: [{ id: 2, title: "Tech Survivor – Elimination Arena" }],
    selectedNonTechEvents: []
  }
];

async function run() {
  for (const person of persons) {
    const registrationId = generateId();
    
    // Construct registrationData similar to how /submit route does
    const registrationData = {
      registrationId,
      userId: "manual-entry",
      userEmail: person.email,
      name: person.name,
      email: person.email,
      college: person.college,
      selectedWorkshops: person.selectedWorkshops,
      selectedEvents: person.selectedEvents,
      selectedNonTechEvents: person.selectedNonTechEvents,
      status: "confirmed",
      paymentStatus: "paid",
      paymentDetails: {
          paymentId: "manual-entry-" + Date.now(),
          amount: person.amountPaid
      },
      emailSent: false,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      eventCount: person.selectedWorkshops.length + person.selectedEvents.length,
      ispass: false,
      selectedPassId: null,
      arrivalStatus: { hasArrived: false, arrivalTime: null, checkedInBy: null, notes: "manual entry" },
      workshopDetails: { 
          selectedWorkshop: person.selectedWorkshops.length ? person.selectedWorkshops[0].id : null,
          workshopTitle: person.selectedWorkshops.length ? person.selectedWorkshops[0].title : "",
          canEditWorkshop: false, workshopAttended: false, workshopAttendanceTime: null 
      },
      eventAttendance: {
          techEvents: person.selectedEvents.map(e => ({ eventId: e.id, eventTitle: e.title, attended: false, attendanceTime: null, notes: "" })),
          workshops: person.selectedWorkshops.map(w => ({ workshopId: w.id, workshopTitle: w.title, attended: false, attendanceTime: null, notes: "" })),
          nonTechEvents: person.selectedNonTechEvents.map(e => ({ eventId: e.id, eventTitle: e.title, attended: false, attendanceTime: null, paidOnArrival: false, amountPaid: 0, notes: "" }))
      },
      adminNotes: { generalNotes: "Added manually", specialRequirements: "", flagged: false, flagReason: "", lastModifiedBy: "admin", lastModifiedAt: admin.firestore.Timestamp.now() },
      contactDetails: { emergencyContact: "", emergencyPhone: "", dietaryRestrictions: "", accessibility: "" }
    };

    console.log(`Adding ${person.name} with ID ${registrationId}...`);
    const docRef = await db.collection("registrations").add(registrationData);
    
    // Construct email payload
    const emailData = {
      registrationId,
      userEmail: person.email,
      userName: person.name,
      userDetails: {
        name: person.name,
        email: person.email,
        college: person.college,
      },
      paymentDetails: registrationData.paymentDetails,
      selectedEvents: person.selectedEvents,
      selectedWorkshops: person.selectedWorkshops,
      selectedNonTechEvents: person.selectedNonTechEvents
    };
    
    console.log(`Sending email to ${person.email}...`);
    try {
      const emailResult = await sendRegistrationConfirmationEmail(emailData, events, workshops);
      if (emailResult && emailResult.success) {
        console.log(`Email sent successfully to ${person.email}`);
        await docRef.update({
          emailSent: true,
          emailSentAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        console.error(`Failed to send email to ${person.email}`, emailResult);
      }
    } catch(e) {
      console.error(`Exception sending email to ${person.email}:`, e.message);
    }
  }
  
  console.log("Done");
  process.exit(0);
}

run().catch(console.error);
