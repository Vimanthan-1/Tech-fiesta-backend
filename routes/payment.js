const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const admin = require("firebase-admin");
const { verifyToken } = require("../middleware/auth");
const { getPassById } = require("../data/passes");
const {
  sendRegistrationConfirmationEmail,
  getEmailServiceStatus,
  sendNotificationEmail,
  sendODLetterWithAttachment,
} = require("../services/emailService");
const { events } = require("../data/events");
const { workshops } = require("../data/workshops");

const router = express.Router();

// Pass limits configuration (should match frontend)
const passLimits = [
  {
    passId: 1,
    workshopsIncluded: 1,
    maxAdditionalWorkshops: 4,
    workshopSelectionEnabled: true,
    techEventsIncluded: 6, // Unlimited
    maxAdditionalTechEvents: 0,
    techEventSelectionEnabled: false, // Disabled - unlimited access
    nonTechEventsIncluded: 4,
    maxAdditionalNonTechEvents: 0,
    nonTechEventSelectionEnabled: false, // Disabled - pay on arrival
  },
];

const getPassLimits = (passId) => {
  return passLimits.find((limit) => limit.passId === passId) || null;
};

// Initialize Razorpay instance
let razorpay = null;
try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log("✅ Razorpay initialized successfully");
  } else {
    console.warn(
      "⚠️ Razorpay credentials not found - payment features will be disabled"
    );
  }
} catch (error) {
  console.error("❌ Failed to initialize Razorpay:", error.message);
}

// Create order endpoint
router.post("/create-order", verifyToken, async (req, res) => {
  try {
    const { currency = "INR", receipt, notes, registrationData } = req.body;
    const userEmail = req.user.email || (registrationData && registrationData.email);

    // Calculate dynamic amount based on selected events/workshops
    let totalAmount = 0;
    const isCIT = userEmail && userEmail.toLowerCase().endsWith("@citchennai.net");

    // Check if pass is selected
    if (registrationData.selectedPass) {
      const pass = getPassById(registrationData.selectedPass);
      if (pass) {
        // Collect individual prices of all selected items
        const prices = [];
        
        if (registrationData.selectedEvents) {
          registrationData.selectedEvents.forEach((se) => {
            const event = events.find((e) => e.id === se.id);
            if (event && event.price) {
              const priceStr = isCIT && event.citPrice ? event.citPrice : event.price;
              prices.push(parseInt(priceStr.replace("₹", "")));
            } else {
              prices.push(isCIT ? 59 : 99);
            }
          });
        }

        if (registrationData.selectedWorkshops) {
          registrationData.selectedWorkshops.forEach(() => {
            prices.push(100);
          });
        }

        if (registrationData.selectedNonTechEvents) {
          registrationData.selectedNonTechEvents.forEach(() => {
            prices.push(50);
          });
        }

        // Sort descending so the 3 most expensive items are covered by the pass
        prices.sort((a, b) => b - a);

        // Base pass price is ₹150
        totalAmount = 150;

        // Any items beyond the first 3 are charged at their regular price
        if (prices.length > 3) {
          const extraPrices = prices.slice(3);
          const extraCost = extraPrices.reduce((sum, p) => sum + p, 0);
          totalAmount += extraCost;
        }
      }
    } else {
      // No pass selected - charge for individual events and workshops

      // Calculate event costs dynamically from events data
      if (
        registrationData.selectedEvents &&
        registrationData.selectedEvents.length > 0
      ) {
        registrationData.selectedEvents.forEach((selectedEvent) => {
          const event = events.find((e) => e.id === selectedEvent.id);
          if (event && event.price) {
            const priceStr = isCIT && event.citPrice ? event.citPrice : event.price;
            totalAmount += parseInt(priceStr.replace("₹", ""));
          } else {
            // Fallback to original hardcoded values if event data is not found
            totalAmount += isCIT ? 59 : 99;
          }
        });
      }

      // Calculate workshop costs
      if (
        registrationData.selectedWorkshops &&
        registrationData.selectedWorkshops.length > 0
      ) {
        registrationData.selectedWorkshops.forEach((workshop) => {
          // Workshop pricing: ₹100 for both regular and CIT students
          totalAmount += 100;
        });
      }

      // Calculate non-tech event costs
      if (
        registrationData.selectedNonTechEvents &&
        registrationData.selectedNonTechEvents.length > 0
      ) {
        totalAmount += registrationData.selectedNonTechEvents.length * 50;
      }
    }

    // Final amount
    const amount = totalAmount;

    // Validate amount
    if (amount < 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid amount",
        message: "Amount cannot be negative",
      });
    }

    // If amount is 0, return free registration response
    if (amount === 0) {
      return res.json({
        success: true,
        data: {
          amount: 0,
          currency: currency,
          freeRegistration: true,
          message: "No payment required - registration is free!",
        },
      });
    }

    // Check if Razorpay is initialized
    if (!razorpay) {
      return res.status(500).json({
        success: false,
        error: "Payment service not configured",
        message: "Razorpay credentials are missing",
      });
    }

    // Create order in Razorpay
    const options = {
      amount: amount * 100, // Convert to paise - use calculated amount
      currency: currency,
      receipt: receipt || `TF2025_${Date.now()}`,
      notes: {
        userEmail: userEmail,
        userId: req.user.uid,
        totalEvents: registrationData.selectedEvents?.length || 0,
        totalWorkshops: registrationData.selectedWorkshops?.length || 0,
        totalNonTechEvents: registrationData.selectedNonTechEvents?.length || 0,
        selectedPass: registrationData.selectedPass || null,
        isCIT: isCIT,
        calculatedAmount: amount,
        ...notes,
      },
    };

    console.log("=== PAYMENT DEBUG ===");
    console.log("Environment:", process.env.NODE_ENV || "development");
    console.log(
      "Razorpay Key ID (first 10 chars):",
      process.env.RAZORPAY_KEY_ID
        ? process.env.RAZORPAY_KEY_ID.substring(0, 10) + "..."
        : "MISSING"
    );
    console.log("Calculated amount:", amount);
    console.log(
      "Options being sent to Razorpay:",
      JSON.stringify(options, null, 2)
    );
    console.log(
      "Creating Razorpay order with amount:",
      amount,
      "for user:",
      userEmail
    );

    const order = await razorpay.orders.create(options);

    console.log(
      "Razorpay order created successfully:",
      order.id,
      "amount:",
      order.amount
    );
    console.log("Full order response:", JSON.stringify(order, null, 2));
    console.log("=== END DEBUG ===");

    // Store order details in Firebase for verification
    const db = admin.firestore();
    await db
      .collection("payment_orders")
      .doc(order.id)
      .set({
        orderId: order.id,
        amount: amount,
        currency: currency,
        status: "created",
        userId: req.user.uid,
        userEmail: userEmail,
        createdAt: admin.firestore.Timestamp.now(),
        notes: notes || {},
        registrationData: registrationData || {}, // Store for client verification
        calculatedAmount: amount,
        verificationMethod: "client-side", // Indicates client-side verification flow
        breakdown: {
          techEvents: registrationData.selectedEvents?.length || 0,
          workshops: registrationData.selectedWorkshops?.length || 0,
          nonTechEvents: registrationData.selectedNonTechEvents?.length || 0,
        },
      });

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
        calculatedAmount: amount,
        breakdown: {
          techEvents: registrationData.selectedEvents?.length || 0,
          workshops: registrationData.selectedWorkshops?.length || 0,
          nonTechEvents: registrationData.selectedNonTechEvents?.length || 0,
          total: amount,
        },
      },
      message: "Order created successfully",
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create order",
      message: error.message,
    });
  }
});

// Verify payment endpoint
router.post("/verify-payment", verifyToken, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      registrationData,
    } = req.body;

    console.log(
      "Verifying payment for order:",
      razorpay_order_id,
      "payment:",
      razorpay_payment_id
    );

    // Verify payment signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      console.error(
        "Payment verification failed for order:",
        razorpay_order_id
      );
      return res.status(400).json({
        success: false,
        error: "Invalid payment verification",
        message: "Payment verification failed",
      });
    }

    console.log(
      "Payment verified successfully for order:",
      razorpay_order_id,
      "Payment completed successfully"
    );

    // Get order details from Firebase
    const db = admin.firestore();
    const orderDoc = await db
      .collection("payment_orders")
      .doc(razorpay_order_id)
      .get();

    if (!orderDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
        message: "Order details not found",
      });
    }

    const orderData = orderDoc.data();

    // Verify user owns this order
    if (orderData.userId !== req.user.uid) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized",
        message: "You are not authorized to verify this payment",
      });
    }

    // Check if registration already exists to prevent duplicates
    if (orderData.registrationId) {
      console.log(
        "Registration already exists for order:",
        razorpay_order_id,
        "registration:",
        orderData.registrationId
      );
      return res.json({
        success: true,
        data: {
          registrationId: orderData.registrationId,
          status: "confirmed",
          paymentStatus: "verified",
          amount: orderData.amount,
        },
        message: "Registration already completed successfully",
      });
    }

    // Generate registration ID
    const { v4: uuidv4 } = require("uuid");
    const registrationId = `TF2025-${uuidv4().substr(0, 8).toUpperCase()}`;

    // Create registration record with payment details
    const finalRegistrationData = {
      registrationId,
      ...registrationData,
      paymentDetails: {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        amount: orderData.amount,
        currency: orderData.currency,
        status: "paid",
        paidAt: admin.firestore.Timestamp.now(),
        verificationMethod: "client-side", // Indicates this was verified via client, not webhook
      },
      status: "confirmed",
      paymentStatus: "verified",
      emailSent: false, // Added field tracking confirmation email delivery status
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      userId: req.user.uid,
      userEmail: req.user.email || (registrationData && registrationData.email),

      // Admin tracking fields
      arrivalStatus: {
        hasArrived: false,
        arrivalTime: null,
        checkedInBy: null,
        notes: "",
      },

      // Workshop details for pass holders
      workshopDetails: {
        selectedWorkshop: registrationData.selectedPass
          ? registrationData.selectedWorkshops?.[0]?.id || null
          : null,
        workshopTitle: registrationData.selectedPass
          ? registrationData.selectedWorkshops?.[0]?.title || ""
          : "",
        canEditWorkshop: !!registrationData.selectedPass, // Can edit if they have a pass
        workshopAttended: false,
        workshopAttendanceTime: null,
      },

      // Event attendance tracking
      eventAttendance: {
        techEvents: (registrationData.selectedEvents || []).map((event) => ({
          eventId: event.id,
          eventTitle: event.title,
          attended: false,
          attendanceTime: null,
          notes: "",
        })),
        workshops: (registrationData.selectedWorkshops || []).map(
          (workshop) => ({
            workshopId: workshop.id,
            workshopTitle: workshop.title,
            attended: false,
            attendanceTime: null,
            notes: "",
          })
        ),
        nonTechEvents: (registrationData.selectedNonTechEvents || []).map(
          (event) => ({
            eventId: event.id,
            eventTitle: event.title,
            attended: false,
            attendanceTime: null,
            paidOnArrival: false,
            amountPaid: 0,
            notes: "",
          })
        ),
      },

      // Admin notes and flags
      adminNotes: {
        generalNotes: "",
        specialRequirements: "",
        flagged: false,
        flagReason: "",
        lastModifiedBy: null,
        lastModifiedAt: null,
      },

      // Contact and emergency details
      contactDetails: {
        emergencyContact: "",
        emergencyPhone: "",
        dietaryRestrictions: "",
        accessibility: "",
      },
    };

    // Save registration to database
    const registrationRef = await db
      .collection("registrations")
      .add(finalRegistrationData);

    // Update payment order status
    await db.collection("payment_orders").doc(razorpay_order_id).update({
      status: "completed",
      paymentId: razorpay_payment_id,
      registrationId,
      completedAt: admin.firestore.Timestamp.now(),
    });

    console.log("Payment verified and registration completed:", registrationId);

    // ✅ Respond immediately — do NOT wait for email to send
    res.json({
      success: true,
      data: {
        registrationId,
        status: "confirmed",
        paymentStatus: "verified",
        amount: orderData.amount,
      },
      message: "Payment verified and registration completed successfully",
    });

    // 📧 Send confirmation email in background (fire-and-forget)
    // This runs AFTER the response is already sent — no blocking
    setImmediate(async () => {
      try {
        const emailResult = await sendRegistrationConfirmationEmail(
          finalRegistrationData,
          events,
          workshops
        );

        if (emailResult.success) {
          console.log(
            `Confirmation email sent successfully to ${finalRegistrationData.email} using ${emailResult.usedEmail}`
          );
          await registrationRef.update({
            emailSent: true,
            emailSentAt: admin.firestore.FieldValue.serverTimestamp()
          });
        } else {
          console.error(
            `Failed to send confirmation email: ${emailResult.error}`
          );
          await registrationRef.update({
            emailSent: false,
            emailSendError: emailResult.error?.message || String(emailResult.error)
          });
        }
      } catch (emailError) {
        console.error("Error sending confirmation email (background):", emailError);
      }
    });

  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({
      success: false,
      error: "Payment verification failed",
      message: error.message,
    });
  }
});


// Get payment status endpoint - simplified for UPI payments
router.get("/status/:orderId", verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const db = admin.firestore();

    console.log(
      `📊 Status check for order: ${orderId} by user: ${req.user.email}`
    );

    const orderDoc = await db.collection("payment_orders").doc(orderId).get();

    if (!orderDoc.exists) {
      console.log(`❌ Order not found: ${orderId}`);
      return res.status(404).json({
        success: false,
        error: "Order not found",
        message: "Order details not found",
      });
    }

    const orderData = orderDoc.data();

    // Verify user owns this order
    if (orderData.userId !== req.user.uid) {
      console.log(
        `🚫 Unauthorized access attempt for order: ${orderId} by user: ${req.user.uid}`
      );
      return res.status(403).json({
        success: false,
        error: "Unauthorized",
        message: "You are not authorized to view this order",
      });
    }

    console.log(`✅ Order status: ${orderData.status} for order: ${orderId}`);

    res.json({
      success: true,
      data: {
        orderId: orderData.orderId,
        amount: orderData.amount,
        currency: orderData.currency,
        status: orderData.status,
        createdAt: orderData.createdAt,
        registrationId: orderData.registrationId || null,
      },
      message: "Order status retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching payment status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch payment status",
      message: error.message,
    });
  }
});

// Note: Webhooks removed - using client-side verification only
// This simplifies deployment but requires users to complete the payment flow

// Get payment warnings for frontend display
router.get("/payment-warnings", (req, res) => {
  res.json({
    success: true,
    data: {
      warnings: [
        "⚠️ DO NOT close this browser tab during payment",
        "⚠️ DO NOT navigate to other pages until payment is complete",
        "⚠️ Keep this page open until you see the confirmation message",
        "⚠️ If you close the page during payment, your registration may not be completed even if payment succeeds",
      ],
      title: "Important Payment Instructions",
      subtitle: "Please read carefully before proceeding",
    },
    message: "Payment warnings retrieved successfully",
  });
});

// Simple environment test endpoint (no auth required for debugging)
router.get("/env-test", (req, res) => {
  res.json({
    success: true,
    data: {
      nodeEnv: process.env.NODE_ENV || "development",
      hasRazorpayKeyId: !!process.env.RAZORPAY_KEY_ID,
      razorpayKeyIdPrefix: process.env.RAZORPAY_KEY_ID
        ? process.env.RAZORPAY_KEY_ID.substring(0, 8) + "..."
        : "MISSING",
      hasRazorpaySecret: !!process.env.RAZORPAY_KEY_SECRET,
      port: process.env.PORT || "not set",
      timestamp: new Date().toISOString(),
    },
    message: "Environment check completed",
  });
});

// Debug endpoint to check environment and configuration
router.get("/debug-config", verifyToken, async (req, res) => {
  try {
    const config = {
      hasRazorpayKeyId: !!process.env.RAZORPAY_KEY_ID,
      hasRazorpayKeySecret: !!process.env.RAZORPAY_KEY_SECRET,
      hasWebhookSecret: !!process.env.RAZORPAY_WEBHOOK_SECRET,
      keyIdLength: process.env.RAZORPAY_KEY_ID
        ? process.env.RAZORPAY_KEY_ID.length
        : 0,
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
      userEmail: req.user.email,
      userIsCIT: req.user.email && req.user.email.endsWith("@citchennai.net"),
      emailService: getEmailServiceStatus(),
    };

    res.json({
      success: true,
      data: config,
      message: "Configuration check completed",
    });
  } catch (error) {
    console.error("Debug config error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get debug config",
      message: error.message,
    });
  }
});

// Email service status endpoint
router.get("/email-status", verifyToken, async (req, res) => {
  try {
    const emailStatus = getEmailServiceStatus();

    res.json({
      success: true,
      data: {
        emailConfigs: emailStatus,
        totalConfigured: emailStatus.filter((config) => config.isConfigured)
          .length,
        totalUsage: emailStatus.reduce(
          (sum, config) => sum + config.currentUsage,
          0
        ),
        timestamp: new Date().toISOString(),
      },
      message: "Email service status retrieved successfully",
    });
  } catch (error) {
    console.error("Email status error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get email status",
      message: error.message,
    });
  }
});

// Test email endpoint
router.post("/test-email", verifyToken, async (req, res) => {
  try {
    const { type = "test" } = req.body;
    const userEmail = req.user.email;

    if (type === "registration") {
      // Test registration email with comprehensive sample data
      const sampleRegistrationData = {
        registrationId: `TEST-${Date.now()}`,
        userEmail: userEmail,
        paymentDetails: {
          paymentId: "test_payment_123",
          amount: 299,
          orderId: "test_order_123",
        },
        selectedEvents: [
          { id: 1, title: "Paper Presentation" },
          { id: 2, title: "Jeopardy-Style CTF" },
        ],
        selectedWorkshops: [{ id: 1, title: "Blend with Blender" }],
        selectedNonTechEvents: [
          { id: 7, title: "Photography Contest" },
          { id: 8, title: "Gaming Tournament" },
        ],
        selectedPass: 1,
        status: "confirmed",
        paymentStatus: "verified",
      };

      const result = await sendRegistrationConfirmationEmail(
        sampleRegistrationData,
        events,
        workshops
      );

      res.json({
        success: result.success,
        data: result,
        message: result.success
          ? "Test registration email sent successfully"
          : "Failed to send test email",
      });
    } else if (type === "free-registration") {
      // Test free registration email
      const sampleFreeRegistrationData = {
        registrationId: `FREE-TEST-${Date.now()}`,
        userEmail: userEmail,
        paymentDetails: { amount: 0 }, // Free registration
        selectedEvents: [],
        selectedWorkshops: [],
        selectedNonTechEvents: [
          { id: 7, title: "Photography Contest" },
          { id: 8, title: "Gaming Tournament" },
        ],
        selectedPass: null,
        status: "confirmed",
        paymentStatus: "not-required",
      };

      const result = await sendRegistrationConfirmationEmail(
        sampleFreeRegistrationData,
        events,
        workshops
      );

      res.json({
        success: result.success,
        data: result,
        message: result.success
          ? "Test free registration email sent successfully"
          : "Failed to send test free registration email",
      });
    } else {
      // Test simple notification email
      const result = await sendNotificationEmail(
        userEmail,
        "🧪 Tech Fiesta 2025 - Email Service Test",
        `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
          <h2 style="color: #667eea;">Email Service Test</h2>
          <p>This is a test email from the Tech Fiesta 2025 email service.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Recipient:</strong> ${userEmail}</p>
          <p style="background: #f0f0f0; padding: 15px; border-radius: 5px;">
            ✅ Email service is working correctly!
          </p>
        </div>
        `,
        `Tech Fiesta 2025 - Email Service Test\n\nThis is a test email from the Tech Fiesta 2025 email service.\nTimestamp: ${new Date().toISOString()}\nRecipient: ${userEmail}\n\nEmail service is working correctly!`
      );

      res.json({
        success: result.success,
        data: result,
        message: result.success
          ? "Test email sent successfully"
          : "Failed to send test email",
      });
    }
  } catch (error) {
    console.error("Test email error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send test email",
      message: error.message,
    });
  }
});

// Manual email sending endpoint for admin dashboard
router.post("/send-manual-email", verifyToken, async (req, res) => {
  try {
    const { registrationData } = req.body;

    if (!registrationData || !registrationData.userEmail) {
      return res.status(400).json({
        success: false,
        error: "Registration data and email are required",
      });
    }

    console.log(
      `📧 Manual email send request for: ${registrationData.userEmail}`
    );

    // Send the registration confirmation email
    const result = await sendRegistrationConfirmationEmail(
      registrationData,
      events,
      workshops
    );

    if (result.success) {
      console.log(
        `✅ Manual email sent successfully to ${registrationData.userEmail}`
      );

      // Update Firestore document to set emailSent: true
      try {
        const db = admin.firestore();
        const registrationsRef = db.collection("registrations");
        const query = registrationsRef.where("registrationId", "==", registrationData.registrationId);
        const snapshot = await query.get();
        if (!snapshot.empty) {
          await snapshot.docs[0].ref.update({
            emailSent: true,
            emailSentAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      } catch (dbError) {
        console.error("Error updating emailSent status in Firestore:", dbError);
      }

      res.json({
        success: true,
        messageId: result.messageId,
        usedEmail: result.usedEmail,
        currentUsage: result.currentUsage,
        message: `Email sent successfully to ${registrationData.userEmail}`,
      });
    } else {
      console.error(
        `❌ Failed to send manual email to ${registrationData.userEmail}:`,
        result.error
      );
      res.status(500).json({
        success: false,
        error: result.error,
        message: `Failed to send email to ${registrationData.userEmail}`,
      });
    }
  } catch (error) {
    console.error("Manual email sending error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send manual email",
      message: error.message,
    });
  }
});

// Send notification email endpoint for admin dashboard
router.post("/send-notification", verifyToken, async (req, res) => {
  try {
    const { to, subject, htmlContent, textContent } = req.body;

    if (!to || !subject || !htmlContent) {
      return res.status(400).json({
        success: false,
        error: "Recipient, subject, and content are required",
      });
    }

    console.log(`📧 Notification email send request to: ${to}`);

    const result = await sendNotificationEmail(
      to,
      subject,
      htmlContent,
      textContent || htmlContent.replace(/<[^>]*>/g, "") // Strip HTML for text content if not provided
    );

    if (result.success) {
      console.log(`✅ Notification email sent successfully to ${to}`);
      res.json({
        success: true,
        messageId: result.messageId,
        usedEmail: result.usedEmail,
        message: `Notification email sent successfully to ${to}`,
      });
    } else {
      console.error(
        `❌ Failed to send notification email to ${to}:`,
        result.error
      );
      res.status(500).json({
        success: false,
        error: result.error,
        message: `Failed to send notification email to ${to}`,
      });
    }
  } catch (error) {
    console.error("Notification email sending error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send notification email",
      message: error.message,
    });
  }
});

// Send OD letter email with PDF attachment
router.post("/send-od-letter", verifyToken, async (req, res) => {
  try {
    const multer = require('multer');
    const upload = multer({ storage: multer.memoryStorage() });

    // Handle the multipart form data
    upload.single('attachment')(req, res, async (err) => {
      if (err) {
        console.error("Multer error:", err);
        return res.status(400).json({
          success: false,
          error: "File upload error",
          message: err.message,
        });
      }

      const { to, subject, htmlContent, textContent } = req.body;
      const attachment = req.file;

      if (!to || !subject || !htmlContent || !attachment) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields",
          message: "Recipient, subject, content, and PDF attachment are required",
        });
      }

      console.log(`📧 OD Letter email with PDF attachment request to: ${to}`);
      console.log(`📎 Attachment: ${attachment.originalname} (${attachment.size} bytes)`);

      try {
        // Use the existing email service but modify it to include attachment
        const result = await sendODLetterWithAttachment(
          to,
          subject,
          htmlContent,
          textContent,
          {
            filename: attachment.originalname,
            content: attachment.buffer,
            contentType: 'application/pdf'
          }
        );

        if (result.success) {
          console.log(`✅ OD Letter email with PDF sent successfully to ${to}`);
          res.json({
            success: true,
            messageId: result.messageId,
            usedEmail: result.usedEmail,
            message: `OD Letter email with PDF attachment sent successfully to ${to}`,
          });
        } else {
          console.error(`❌ Failed to send OD Letter email to ${to}:`, result.error);
          res.status(500).json({
            success: false,
            error: result.error,
            message: `Failed to send OD Letter email to ${to}`,
          });
        }
      } catch (emailError) {
        console.error("OD Letter email sending error:", emailError);
        res.status(500).json({
          success: false,
          error: "Failed to send OD Letter email",
          message: emailError.message,
        });
      }
    });
  } catch (error) {
    console.error("OD Letter endpoint error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process OD Letter request",
      message: error.message,
    });
  }
});

module.exports = router;
