const admin = require("firebase-admin");
const Razorpay = require("razorpay");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  console.error("❌ Error: FIREBASE_SERVICE_ACCOUNT_KEY not found in .env file.");
  process.exit(1);
}

try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
  console.log("✅ Firebase Admin SDK initialized successfully");
} catch (error) {
  console.error("❌ Failed to initialize Firebase Admin:", error.message);
  process.exit(1);
}

// Initialize Razorpay
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  console.log("✅ Razorpay SDK initialized successfully");
  console.log(`   Key ID: ${process.env.RAZORPAY_KEY_ID.substring(0, 12)}...`);
  console.log(`   Mode: ${process.env.RAZORPAY_KEY_ID.startsWith("rzp_test") ? "⚠️ TEST MODE" : "🟢 LIVE MODE"}`);
} else {
  console.error("❌ Razorpay credentials not found in .env");
  console.error("   RAZORPAY_KEY_ID:", process.env.RAZORPAY_KEY_ID ? "Set" : "MISSING");
  console.error("   RAZORPAY_KEY_SECRET:", process.env.RAZORPAY_KEY_SECRET ? "Set" : "MISSING");
}

const db = admin.firestore();

async function runDiagnostics() {
  const report = {
    timestamp: new Date().toISOString(),
    razorpayConfig: {},
    ordersSummary: {},
    registrationsSummary: {},
    issues: [],
    stuckOrders: [],
    orphanedPayments: [],
    successfulRegistrations: [],
    failedVerifications: [],
  };

  try {
    // ==========================================
    // 1. Razorpay Configuration Check
    // ==========================================
    console.log("\n" + "=".repeat(60));
    console.log("1. RAZORPAY CONFIGURATION CHECK");
    console.log("=".repeat(60));

    report.razorpayConfig = {
      keyIdPresent: !!process.env.RAZORPAY_KEY_ID,
      keySecretPresent: !!process.env.RAZORPAY_KEY_SECRET,
      webhookSecretPresent: !!process.env.RAZORPAY_WEBHOOK_SECRET,
      mode: process.env.RAZORPAY_KEY_ID
        ? (process.env.RAZORPAY_KEY_ID.startsWith("rzp_test") ? "TEST" : "LIVE")
        : "UNKNOWN",
    };

    console.log(`   Key ID: ${report.razorpayConfig.keyIdPresent ? "✅ Present" : "❌ MISSING"}`);
    console.log(`   Key Secret: ${report.razorpayConfig.keySecretPresent ? "✅ Present" : "❌ MISSING"}`);
    console.log(`   Webhook Secret: ${report.razorpayConfig.webhookSecretPresent ? "✅ Present" : "❌ MISSING (webhooks disabled)"}`);
    console.log(`   Mode: ${report.razorpayConfig.mode}`);

    if (!report.razorpayConfig.keyIdPresent || !report.razorpayConfig.keySecretPresent) {
      report.issues.push({
        severity: "CRITICAL",
        issue: "Razorpay credentials missing",
        detail: "RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not set in the environment. All payments will fail.",
      });
    }

    if (!report.razorpayConfig.webhookSecretPresent) {
      report.issues.push({
        severity: "HIGH",
        issue: "No webhook configured",
        detail: "System relies on client-side verification only. If users close the browser after paying, the registration will be lost.",
      });
    }

    // ==========================================
    // 2. Fetch ALL Payment Orders from Firestore
    // ==========================================
    console.log("\n" + "=".repeat(60));
    console.log("2. PAYMENT ORDERS ANALYSIS");
    console.log("=".repeat(60));

    const allOrdersSnapshot = await db.collection("payment_orders")
      .orderBy("createdAt", "desc")
      .get();

    const orders = [];
    allOrdersSnapshot.forEach(doc => {
      orders.push({ id: doc.id, ...doc.data() });
    });

    const statusCounts = {};
    orders.forEach(o => {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    });

    report.ordersSummary = {
      total: orders.length,
      byStatus: statusCounts,
    };

    console.log(`   Total orders: ${orders.length}`);
    console.log(`   By status:`);
    Object.entries(statusCounts).forEach(([status, count]) => {
      const emoji = status === "completed" ? "✅" : status === "created" ? "⚠️" : "❓";
      console.log(`     ${emoji} ${status}: ${count}`);
    });

    // ==========================================
    // 3. Identify STUCK orders (created but never completed)
    // ==========================================
    console.log("\n" + "=".repeat(60));
    console.log("3. STUCK ORDERS (created but never verified)");
    console.log("=".repeat(60));

    const stuckOrders = orders.filter(o => o.status === "created");
    report.stuckOrders = stuckOrders.map(o => ({
      orderId: o.orderId,
      email: o.userEmail,
      amount: o.amount,
      createdAt: o.createdAt?._seconds ? new Date(o.createdAt._seconds * 1000).toISOString() : "unknown",
      name: o.registrationData?.name || "unknown",
      selectedEvents: (o.registrationData?.selectedEvents || []).map(e => e.title),
    }));

    if (stuckOrders.length === 0) {
      console.log("   ✅ No stuck orders found");
    } else {
      console.log(`   ⚠️ ${stuckOrders.length} stuck order(s) found:\n`);
      for (const order of stuckOrders) {
        const createdDate = order.createdAt?._seconds
          ? new Date(order.createdAt._seconds * 1000).toISOString()
          : "unknown";
        console.log(`   📦 Order: ${order.orderId}`);
        console.log(`      Email: ${order.userEmail}`);
        console.log(`      Name: ${order.registrationData?.name || "N/A"}`);
        console.log(`      Amount: ₹${order.amount}`);
        console.log(`      Created: ${createdDate}`);
        console.log(`      Has Payment ID: ${order.paymentId ? "YES" : "NO"}`);
        console.log(`      Has Registration ID: ${order.registrationId ? "YES" : "NO"}`);
        console.log(`      Events: ${(order.registrationData?.selectedEvents || []).map(e => e.title).join(", ") || "none"}`);

        // Cross-check with Razorpay API if available
        if (razorpay) {
          try {
            const rzpOrder = await razorpay.orders.fetch(order.orderId);
            const rzpPayments = await razorpay.orders.fetchPayments(order.orderId);

            console.log(`      --- Razorpay API Cross-Check ---`);
            console.log(`      Razorpay Order Status: ${rzpOrder.status}`);
            console.log(`      Razorpay Amount: ₹${rzpOrder.amount / 100}`);
            console.log(`      Razorpay Payments: ${rzpPayments.items?.length || 0} payment(s)`);

            if (rzpPayments.items && rzpPayments.items.length > 0) {
              for (const payment of rzpPayments.items) {
                console.log(`        💳 Payment ID: ${payment.id}`);
                console.log(`           Status: ${payment.status}`);
                console.log(`           Amount: ₹${payment.amount / 100}`);
                console.log(`           Method: ${payment.method}`);
                console.log(`           Created: ${new Date(payment.created_at * 1000).toISOString()}`);

                if (payment.status === "captured") {
                  report.orphanedPayments.push({
                    orderId: order.orderId,
                    paymentId: payment.id,
                    email: order.userEmail,
                    name: order.registrationData?.name,
                    amount: payment.amount / 100,
                    status: payment.status,
                    paidAt: new Date(payment.created_at * 1000).toISOString(),
                    problem: "Payment captured on Razorpay but registration NOT created (user likely closed browser)",
                  });
                  report.issues.push({
                    severity: "CRITICAL",
                    issue: `Orphaned payment for ${order.userEmail}`,
                    detail: `Payment ${payment.id} (₹${payment.amount / 100}) was captured by Razorpay but no registration was created. Order: ${order.orderId}`,
                  });
                }
              }
            } else {
              console.log(`      ℹ️ No payments attempted on Razorpay for this order`);
            }
          } catch (rzpError) {
            console.log(`      ❌ Razorpay API error: ${rzpError.message}`);
          }
        }
        console.log("");
      }
    }

    // ==========================================
    // 4. Fetch ALL Registrations
    // ==========================================
    console.log("\n" + "=".repeat(60));
    console.log("4. REGISTRATIONS ANALYSIS");
    console.log("=".repeat(60));

    const allRegsSnapshot = await db.collection("registrations")
      .orderBy("createdAt", "desc")
      .get();

    const registrations = [];
    allRegsSnapshot.forEach(doc => {
      registrations.push({ id: doc.id, ...doc.data() });
    });

    const regStatusCounts = {};
    const paymentStatusCounts = {};
    const emailSentCounts = { sent: 0, notSent: 0, unknown: 0 };

    registrations.forEach(r => {
      regStatusCounts[r.status] = (regStatusCounts[r.status] || 0) + 1;
      paymentStatusCounts[r.paymentStatus] = (paymentStatusCounts[r.paymentStatus] || 0) + 1;
      if (r.emailSent === true) emailSentCounts.sent++;
      else if (r.emailSent === false) emailSentCounts.notSent++;
      else emailSentCounts.unknown++;
    });

    report.registrationsSummary = {
      total: registrations.length,
      byStatus: regStatusCounts,
      byPaymentStatus: paymentStatusCounts,
      emailDelivery: emailSentCounts,
    };

    console.log(`   Total registrations: ${registrations.length}`);
    console.log(`   By status:`);
    Object.entries(regStatusCounts).forEach(([status, count]) => {
      console.log(`     ${status}: ${count}`);
    });
    console.log(`   By payment status:`);
    Object.entries(paymentStatusCounts).forEach(([status, count]) => {
      console.log(`     ${status}: ${count}`);
    });
    console.log(`   Email delivery:`);
    console.log(`     ✅ Sent: ${emailSentCounts.sent}`);
    console.log(`     ❌ Not sent: ${emailSentCounts.notSent}`);
    console.log(`     ❓ Unknown: ${emailSentCounts.unknown}`);

    // Check for registrations where email failed
    const emailFailedRegs = registrations.filter(r => r.emailSent === false);
    if (emailFailedRegs.length > 0) {
      report.issues.push({
        severity: "MEDIUM",
        issue: `${emailFailedRegs.length} registration(s) where confirmation email was NOT sent`,
        detail: emailFailedRegs.map(r => `${r.registrationId} (${r.userEmail || r.email}) - Error: ${r.emailSendError || "unknown"}`).join("\n"),
      });
    }

    // ==========================================
    // 5. Cross-reference: completed orders without registrations
    // ==========================================
    console.log("\n" + "=".repeat(60));
    console.log("5. CROSS-REFERENCE CHECK");
    console.log("=".repeat(60));

    const completedOrders = orders.filter(o => o.status === "completed");
    const registrationIds = new Set(registrations.map(r => r.registrationId));

    let missingRegs = 0;
    for (const order of completedOrders) {
      if (order.registrationId && !registrationIds.has(order.registrationId)) {
        missingRegs++;
        console.log(`   ❌ Order ${order.orderId} marked completed with registration ${order.registrationId} but registration NOT found in DB`);
        report.issues.push({
          severity: "CRITICAL",
          issue: `Missing registration for completed order`,
          detail: `Order ${order.orderId} (${order.userEmail}) has registrationId ${order.registrationId} but registration document doesn't exist.`,
        });
      }
    }

    if (missingRegs === 0) {
      console.log("   ✅ All completed orders have matching registrations");
    }

    // ==========================================
    // 6. Code-level issues analysis
    // ==========================================
    console.log("\n" + "=".repeat(60));
    console.log("6. KNOWN CODE-LEVEL ISSUES");
    console.log("=".repeat(60));

    report.issues.push({
      severity: "HIGH",
      issue: "No Razorpay webhooks configured",
      detail: "The system uses client-side verification only (line 617 of payment.js). If a user's browser closes/crashes after Razorpay captures payment but before the frontend calls /verify-payment, the payment is captured but NO registration is created. This is the most likely cause of 'paid but no confirmation' complaints.",
    });

    report.issues.push({
      severity: "MEDIUM",
      issue: "verify-payment uses req.user.email which may be undefined for anonymous auth",
      detail: "In payment.js line 415: userEmail is set to `req.user.email || registrationData.email`. If the user authenticates via anonymous Firebase auth (not email/password), req.user.email will be undefined, and the registration might store `undefined` as userEmail.",
    });

    report.issues.push({
      severity: "LOW",
      issue: "Email sent via setImmediate (fire-and-forget)",
      detail: "Confirmation emails are sent asynchronously via setImmediate after the response. If the server process restarts or crashes during email sending, the email won't be sent but the emailSent field will remain false.",
    });

    // ==========================================
    // 7. Summary
    // ==========================================
    console.log("\n" + "=".repeat(60));
    console.log("7. ISSUES SUMMARY");
    console.log("=".repeat(60));

    const criticalIssues = report.issues.filter(i => i.severity === "CRITICAL");
    const highIssues = report.issues.filter(i => i.severity === "HIGH");
    const mediumIssues = report.issues.filter(i => i.severity === "MEDIUM");
    const lowIssues = report.issues.filter(i => i.severity === "LOW");

    console.log(`\n   🔴 CRITICAL: ${criticalIssues.length}`);
    criticalIssues.forEach(i => {
      console.log(`      → ${i.issue}`);
      console.log(`        ${i.detail}\n`);
    });

    console.log(`   🟠 HIGH: ${highIssues.length}`);
    highIssues.forEach(i => {
      console.log(`      → ${i.issue}`);
      console.log(`        ${i.detail}\n`);
    });

    console.log(`   🟡 MEDIUM: ${mediumIssues.length}`);
    mediumIssues.forEach(i => {
      console.log(`      → ${i.issue}`);
      console.log(`        ${i.detail}\n`);
    });

    console.log(`   🔵 LOW: ${lowIssues.length}`);
    lowIssues.forEach(i => {
      console.log(`      → ${i.issue}`);
      console.log(`        ${i.detail}\n`);
    });

    // ==========================================
    // 8. Orphaned payments (money collected but no registration)
    // ==========================================
    if (report.orphanedPayments.length > 0) {
      console.log("\n" + "=".repeat(60));
      console.log("8. 🚨 ORPHANED PAYMENTS (REQUIRE MANUAL INTERVENTION)");
      console.log("=".repeat(60));
      report.orphanedPayments.forEach(p => {
        console.log(`\n   💰 Payment: ${p.paymentId}`);
        console.log(`      Order: ${p.orderId}`);
        console.log(`      Email: ${p.email}`);
        console.log(`      Name: ${p.name}`);
        console.log(`      Amount: ₹${p.amount}`);
        console.log(`      Paid At: ${p.paidAt}`);
        console.log(`      Problem: ${p.problem}`);
      });
    }

    console.log("\n" + "=".repeat(60));
    console.log("DIAGNOSTIC COMPLETE");
    console.log("=".repeat(60));

  } catch (error) {
    console.error("❌ Error running diagnostics:", error);
  }
  process.exit(0);
}

runDiagnostics();
