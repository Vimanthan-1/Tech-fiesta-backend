const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const { v4: uuidv4 } = require("uuid");
const {
  sendRegistrationConfirmationEmail,
} = require("../services/emailService");
const { events } = require("../data/events");
const { workshops } = require("../data/workshops");
const { getRegistrationStats } = require("./stats");

// Middleware to verify Firebase ID token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "Missing or invalid authorization header",
      });
    }

    const token = authHeader.substring(7);
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "Invalid token",
    });
  }
};

// Check for duplicate registrations
router.post("/check-duplicate", verifyToken, async (req, res) => {
  try {
    const { email, whatsapp } = req.body;

    if (!email || !whatsapp) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        message: "Email and WhatsApp number are required",
      });
    }

    const db = admin.firestore();
    const registrationsRef = db.collection("registrations");

    // Check for email duplicates
    const emailQuery = registrationsRef.where(
      "email",
      "==",
      email.toLowerCase()
    );
    const emailSnapshot = await emailQuery.get();

    // Check for WhatsApp duplicates
    const whatsappQuery = registrationsRef.where("whatsapp", "==", whatsapp);
    const whatsappSnapshot = await whatsappQuery.get();

    const duplicateFields = [];
    let existingRegistration = null;

    if (!emailSnapshot.empty) {
      duplicateFields.push("email");
      existingRegistration = {
        id: emailSnapshot.docs[0].id,
        ...emailSnapshot.docs[0].data(),
      };
    }

    if (!whatsappSnapshot.empty) {
      duplicateFields.push("whatsapp");
      if (!existingRegistration) {
        existingRegistration = {
          id: whatsappSnapshot.docs[0].id,
          ...whatsappSnapshot.docs[0].data(),
        };
      }
    }

    res.json({
      success: true,
      data: {
        exists: duplicateFields.length > 0,
        duplicateFields,
        existingRegistration,
      },
      message: "Duplicate check completed",
    });
  } catch (error) {
    console.error("Error checking duplicate registration:", error);
    res.status(500).json({
      success: false,
      error: "Failed to check for duplicate registrations",
      message: error.message,
    });
  }
});

// Submit registration
router.post("/submit", verifyToken, async (req, res) => {
  try {
    const formData = req.body;
    const userEmail = req.user.email || formData.email;

    // Validate that at least one event or workshop is selected
    const totalSelections = (formData.selectedEvents?.length || 0) + 
                           (formData.selectedWorkshops?.length || 0) + 
                           (formData.selectedNonTechEvents?.length || 0);
    if (totalSelections === 0) {
      return res.status(400).json({
        success: false,
        error: "No events selected",
        message: "Please select at least one event or workshop to register",
      });
    }

    // Strip consent flag - should not be persisted in the database
    delete formData.hasConsented;

    // Validate that the user is submitting their own registration (only if they have a non-anonymous email logged in)
    if (req.user.email && formData.email.toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You can only submit registration for your own email address",
      });
    }

    // Validate capacities before proceeding
    const stats = await getRegistrationStats();
    let capacityError = null;

    if (formData.selectedEvents) {
      for (const se of formData.selectedEvents) {
        const eventData = events.find((e) => e.id === se.id);
        const count = stats.events[se.id] || 0;
        if (eventData && eventData.id === 1 && eventData.capacity && count >= eventData.capacity) {
          capacityError = `Event "${eventData.title}" is already sold out.`;
        }
      }
    }
    
    if (formData.selectedNonTechEvents) {
      for (const se of formData.selectedNonTechEvents) {
        const eventData = events.find((e) => e.id === se.id);
        const count = stats.nonTechEvents[se.id] || 0;
        if (eventData && eventData.id === 1 && eventData.capacity && count >= eventData.capacity) {
          capacityError = `Event "${eventData.title}" is already sold out.`;
        }
      }
    }
    
    if (formData.selectedWorkshops) {
      for (const sw of formData.selectedWorkshops) {
        if (sw.id === 2) {
          capacityError = `Workshop "Raspberry Pi, Linux and OpenCV" is already sold out.`;
        }
      }
    }

    if (capacityError) {
      return res.status(400).json({
        success: false,
        error: "Capacity Reached",
        message: capacityError,
      });
    }

    // Calculate total amount based on selected events/workshops
    let totalAmount = 0;
    const isCIT = userEmail && userEmail.endsWith("@citchennai.net");

    // Calculate cost for tech events (if no pass selected)
    if (!formData.selectedPass && formData.selectedEvents) {
      formData.selectedEvents.forEach((selectedEvent) => {
        const event = events.find((e) => e.id === selectedEvent.id);
        if (event && event.price) {
          const price = event.price;
          totalAmount += parseInt(price.replace("₹", ""));
        } else {
          totalAmount += 70;
        }
      });
    }

    // Calculate cost for workshops (if no pass selected)
    if (!formData.selectedPass && formData.selectedWorkshops) {
      const workshopsData = require("../data/workshops").workshops;
      formData.selectedWorkshops.forEach((selectedWorkshop) => {
        const workshop = workshopsData.find(
          (w) => w.id === selectedWorkshop.id
        );
        if (workshop && workshop.price) {
          const price = workshop.price;
          totalAmount += parseInt(price.replace("₹", ""));
        } else {
          totalAmount += 101;
        }
      });
    }

    // Calculate cost for non-tech events (if no pass selected)
    if (!formData.selectedPass && formData.selectedNonTechEvents) {
      formData.selectedNonTechEvents.forEach((selectedEvent) => {
        const event = events.find((e) => e.id === selectedEvent.id);
        if (event && event.price) {
          const price = event.price;
          totalAmount += parseInt(price.replace("₹", ""));
        } else {
          totalAmount += 50;
        }
      });
    }

    // Add pass cost if selected
    if (formData.selectedPass) {
      const { getPassById } = require("../data/passes");
      const pass = getPassById(formData.selectedPass);
      if (pass) {
        // Collect individual prices of all selected items
        const prices = [];
        
        if (formData.selectedEvents) {
          formData.selectedEvents.forEach((se) => {
            const event = events.find((e) => e.id === se.id);
            if (event && event.price) {
              const priceStr = event.price;
              prices.push(parseInt(priceStr.replace("₹", "")));
            } else {
              prices.push(70);
            }
          });
        }

        if (formData.selectedWorkshops) {
          const workshopsData = require("../data/workshops").workshops;
          formData.selectedWorkshops.forEach((sw) => {
            const workshop = workshopsData.find(
              (w) => w.id === sw.id
            );
            if (workshop && workshop.price) {
              prices.push(parseInt(workshop.price.replace("₹", "")));
            } else {
              prices.push(101);
            }
          });
        }

        if (formData.selectedNonTechEvents) {
          formData.selectedNonTechEvents.forEach((se) => {
            const event = events.find((e) => e.id === se.id);
            if (event && event.price) {
              prices.push(parseInt(event.price.replace("₹", "")));
            } else {
              prices.push(50);
            }
          });
        }

        // Sort descending so the 3 most expensive items are covered by the pass
        prices.sort((a, b) => b - a);

        // Base pass price is ₹149
        totalAmount = 149;

        // Any items beyond the first 3 are charged at their regular price
        if (prices.length > 3) {
          const extraPrices = prices.slice(3);
          const extraCost = extraPrices.reduce((sum, p) => sum + p, 0);
          totalAmount += extraCost;
        }
      }
    }

    console.log(
      `💰 Calculated total amount: ₹${totalAmount} for user ${userEmail}`
    );
    console.log(`📊 Registration details:`, {
      selectedEvents: formData.selectedEvents?.length || 0,
      selectedWorkshops: formData.selectedWorkshops?.length || 0,
      selectedNonTechEvents: formData.selectedNonTechEvents?.length || 0,
      selectedPass: formData.selectedPass || null,
      isCIT,
    });

    // Always send confirmation email regardless of amount
    // Free registrations (totalAmount = 0) are confirmed immediately
    // Paid registrations will need payment processing
    if (totalAmount === 0) {
      // Free registration - create record directly
      const registrationId = `TF2026-${require("uuid")
        .v4()
        .substr(0, 8)
        .toUpperCase()}`;

      // Create registration record
      const db = admin.firestore();
      const registrationData = {
        registrationId,
        userId: req.user.uid,
        userEmail: req.user.email,
        ...formData,
        status: "confirmed", // Directly confirmed since it's free
        paymentStatus: "not-required",
        emailSent: false, // Added field tracking confirmation email delivery status
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        eventCount: (formData.selectedEvents?.length || 0) + 
                    (formData.selectedWorkshops?.length || 0) + 
                    (formData.selectedNonTechEvents?.length || 0),
        
        // Pass information
        ispass: !!formData.selectedPass, // Boolean indicating if user selected a pass
        selectedPassId: formData.selectedPass || null, // Store the pass ID if selected
        
        // Admin tracking fields
        arrivalStatus: {
          hasArrived: false,
          arrivalTime: null,
          checkedInBy: null,
          notes: ""
        },
        
        // Workshop details for pass holders
        workshopDetails: {
          selectedWorkshop: formData.selectedPass ? (formData.selectedWorkshops?.[0]?.id || null) : null,
          workshopTitle: formData.selectedPass ? (formData.selectedWorkshops?.[0]?.title || "") : "",
          canEditWorkshop: !!formData.selectedPass, // Can edit if they have a pass
          workshopAttended: false,
          workshopAttendanceTime: null
        },
        
        // Event attendance tracking
        eventAttendance: {
          techEvents: (formData.selectedEvents || []).map(event => ({
            eventId: event.id,
            eventTitle: event.title,
            attended: false,
            attendanceTime: null,
            notes: ""
          })),
          workshops: (formData.selectedWorkshops || []).map(workshop => ({
            workshopId: workshop.id,
            workshopTitle: workshop.title,
            attended: false,
            attendanceTime: null,
            notes: ""
          })),
          nonTechEvents: (formData.selectedNonTechEvents || []).map(event => ({
            eventId: event.id,
            eventTitle: event.title,
            attended: false,
            attendanceTime: null,
            paidOnArrival: false,
            amountPaid: 0,
            notes: ""
          }))
        },
        
        // Admin notes and flags
        adminNotes: {
          generalNotes: "",
          specialRequirements: "",
          flagged: false,
          flagReason: "",
          lastModifiedBy: null,
          lastModifiedAt: null
        },
        
        // Contact and emergency details
        contactDetails: {
          emergencyContact: "",
          emergencyPhone: "",
          dietaryRestrictions: "",
          accessibility: ""
        }
      };

      const docRef = await db.collection("registrations").add(registrationData);

      // Manually increment registration stats in memory cache
      incrementStats(registrationData);

      console.log(
        `Free registration completed: ${registrationId} for user ${userEmail}`
      );

      // ✅ Respond immediately — do NOT wait for email
      res.json({
        success: true,
        data: {
          registrationId,
          status: "confirmed",
          eventCount: registrationData.eventCount,
        },
        message: "Registration completed successfully",
      });

      // 📧 Send confirmation email in background (fire-and-forget)
      setImmediate(async () => {
        try {
          const emailData = {
            registrationId,
            userEmail: req.user.email,
            userName: formData.name,
            userDetails: {
              name: formData.name,
              email: formData.email,
              whatsapp: formData.whatsapp,
              college: formData.college,
              department: formData.department,
              year: formData.year,
            },
            teamDetails: formData.isTeamEvent
              ? {
                  isTeamEvent: formData.isTeamEvent,
                  teamSize: formData.teamSize,
                  teamMembers: formData.teamMembers || [],
                }
              : null,
            paymentDetails: { amount: 0 }, // Free registration
            selectedPass: formData.selectedPass,
            selectedEvents: formData.selectedEvents || [],
            selectedWorkshops: formData.selectedWorkshops || [],
            selectedNonTechEvents: formData.selectedNonTechEvents || [],
          };

          console.log(
            `📧 Sending confirmation email for free registration: ${registrationId}`
          );
          const emailResult = await sendRegistrationConfirmationEmail(
            emailData,
            events,
            workshops
          );

          if (emailResult.success) {
            console.log(
              `✅ Free registration email sent successfully to ${formData.email}`
            );
            await docRef.update({
              emailSent: true,
              emailSentAt: admin.firestore.FieldValue.serverTimestamp()
            });
          } else {
            console.error(
              `❌ Failed to send free registration email:`,
              emailResult.error
            );
            await docRef.update({
              emailSent: false,
              emailSendError: emailResult.error?.message || String(emailResult.error)
            });
          }
        } catch (emailError) {
          console.error(`❌ Error sending free registration email (background):`, emailError);
        }
      });
    } else {
      // For paid registrations - redirect to payment processing
      console.log(`💳 Payment required: ₹${totalAmount} for user ${userEmail}`);

      return res.json({
        success: true,
        data: {
          requiresPayment: true,
          amount: totalAmount,
          currency: "INR",
          registrationData: formData,
        },
        message: "Please complete payment to finalize registration",
      });
    }
  } catch (error) {
    console.error("Error processing registration:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process registration",
      message: error.message,
    });
  }
});

// Get user's registrations
router.get("/my-registrations", verifyToken, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const db = admin.firestore();
    const registrationsRef = db.collection("registrations");

    const query = registrationsRef.where("userEmail", "==", userEmail);
    const snapshot = await query.get();

    const registrations = [];
    snapshot.forEach((doc) => {
      registrations.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.json({
      success: true,
      data: registrations,
      message: "User registrations retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting user registrations:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve registrations",
      message: error.message,
    });
  }
});

// Admin endpoint to update arrival status
router.put("/admin/arrival/:registrationId", verifyToken, async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { hasArrived, notes, checkedInBy } = req.body;

    const db = admin.firestore();
    const registrationsRef = db.collection("registrations");
    
    // Find registration by registrationId
    const query = registrationsRef.where("registrationId", "==", registrationId);
    const snapshot = await query.get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        error: "Registration not found",
        message: "No registration found with the provided ID",
      });
    }

    const docRef = snapshot.docs[0].ref;
    const updateData = {
      "arrivalStatus.hasArrived": hasArrived,
      "arrivalStatus.notes": notes || "",
      "arrivalStatus.checkedInBy": checkedInBy || req.user.email,
      "arrivalStatus.arrivalTime": hasArrived ? admin.firestore.Timestamp.now() : null,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await docRef.update(updateData);

    res.json({
      success: true,
      data: { registrationId, hasArrived, notes },
      message: "Arrival status updated successfully",
    });
  } catch (error) {
    console.error("Error updating arrival status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update arrival status",
      message: error.message,
    });
  }
});

// Admin endpoint to update workshop selection
router.put("/admin/workshop/:registrationId", verifyToken, async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { selectedWorkshop, workshopTitle } = req.body;

    const db = admin.firestore();
    const registrationsRef = db.collection("registrations");
    
    const query = registrationsRef.where("registrationId", "==", registrationId);
    const snapshot = await query.get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        error: "Registration not found",
        message: "No registration found with the provided ID",
      });
    }

    const docRef = snapshot.docs[0].ref;
    const updateData = {
      "workshopDetails.selectedWorkshop": selectedWorkshop,
      "workshopDetails.workshopTitle": workshopTitle || "",
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await docRef.update(updateData);

    res.json({
      success: true,
      data: { registrationId, selectedWorkshop, workshopTitle },
      message: "Workshop selection updated successfully",
    });
  } catch (error) {
    console.error("Error updating workshop selection:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update workshop selection",
      message: error.message,
    });
  }
});

// Admin endpoint to update event attendance
router.put("/admin/attendance/:registrationId", verifyToken, async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { eventType, eventId, attended, notes, paidOnArrival, amountPaid } = req.body;

    const db = admin.firestore();
    const registrationsRef = db.collection("registrations");
    
    const query = registrationsRef.where("registrationId", "==", registrationId);
    const snapshot = await query.get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        error: "Registration not found",
        message: "No registration found with the provided ID",
      });
    }

    const doc = snapshot.docs[0];
    const docRef = doc.ref;
    const data = doc.data();

    // Update the specific event attendance
    const eventAttendance = data.eventAttendance || {};
    const eventTypeArray = eventAttendance[eventType] || [];
    
    const eventIndex = eventTypeArray.findIndex(e => e.eventId === eventId);
    if (eventIndex !== -1) {
      eventTypeArray[eventIndex] = {
        ...eventTypeArray[eventIndex],
        attended,
        attendanceTime: attended ? admin.firestore.Timestamp.now() : null,
        notes: notes || "",
        ...(eventType === 'nonTechEvents' && { paidOnArrival, amountPaid: amountPaid || 0 })
      };

      const updateData = {
        [`eventAttendance.${eventType}`]: eventTypeArray,
        updatedAt: admin.firestore.Timestamp.now(),
      };

      await docRef.update(updateData);
    }

    res.json({
      success: true,
      data: { registrationId, eventType, eventId, attended },
      message: "Event attendance updated successfully",
    });
  } catch (error) {
    console.error("Error updating event attendance:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update event attendance",
      message: error.message,
    });
  }
});

// Admin endpoint to update notes and flags
router.put("/admin/notes/:registrationId", verifyToken, async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { generalNotes, specialRequirements, flagged, flagReason } = req.body;

    const db = admin.firestore();
    const registrationsRef = db.collection("registrations");
    
    const query = registrationsRef.where("registrationId", "==", registrationId);
    const snapshot = await query.get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        error: "Registration not found",
        message: "No registration found with the provided ID",
      });
    }

    const docRef = snapshot.docs[0].ref;
    const updateData = {
      "adminNotes.generalNotes": generalNotes || "",
      "adminNotes.specialRequirements": specialRequirements || "",
      "adminNotes.flagged": flagged || false,
      "adminNotes.flagReason": flagReason || "",
      "adminNotes.lastModifiedBy": req.user.email,
      "adminNotes.lastModifiedAt": admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await docRef.update(updateData);

    res.json({
      success: true,
      data: { registrationId, generalNotes, specialRequirements, flagged, flagReason },
      message: "Admin notes updated successfully",
    });
  } catch (error) {
    console.error("Error updating admin notes:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update admin notes",
      message: error.message,
    });
  }
});

// Admin endpoint to get all registrations with admin fields
router.get("/admin/all", verifyToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const registrationsRef = db.collection("registrations");
    const snapshot = await registrationsRef.orderBy("createdAt", "desc").get();

    const registrations = [];
    snapshot.forEach((doc) => {
      registrations.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.json({
      success: true,
      data: registrations,
      message: "All registrations retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting all registrations:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve registrations",
      message: error.message,
    });
  }
});

module.exports = router;
