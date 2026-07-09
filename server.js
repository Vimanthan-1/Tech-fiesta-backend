const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const admin = require("firebase-admin");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  process.env.ADMIN_PAGE_URL || "http://localhost:3001",
  "http://localhost:3000", // Frontend fallback
  "http://localhost:3001", // Admin dashboard fallback
  "https://techfiesta2026.vercel.app", // Production Vercel domain
  "https://tech-fiesta-frontend.vercel.app", // Default Vercel deployment domain
  "https://tech-fiesta-frontend-vimanthan-1s-projects.vercel.app", // Vercel preview domain
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Raw body parser for webhooks (must be before express.json())
app.use("/api/payment/webhook", express.raw({ type: "application/json" }));

// JSON parser for all other routes
app.use(express.json());

// Initialize Firebase Admin SDK
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
    console.log("✅ Firebase Admin SDK initialized successfully");
  } catch (error) {
    console.warn(
      "⚠️  Firebase Admin SDK initialization failed:",
      error.message
    );
    console.warn(
      "   Please check your FIREBASE_SERVICE_ACCOUNT_KEY in .env file"
    );
    console.warn("   See FIREBASE_SETUP.md for instructions");
  }
} else {
  console.warn(
    "⚠️  Firebase Admin SDK not initialized - FIREBASE_SERVICE_ACCOUNT_KEY not provided"
  );
  console.warn(
    "   Registration endpoints will not work until Firebase is configured"
  );
  console.warn("   See FIREBASE_SETUP.md for setup instructions");
}

// Import routes
const eventRoutes = require("./routes/events");
const workshopRoutes = require("./routes/workshops");
const passRoutes = require("./routes/passes");
const registrationRoutes = require("./routes/registration");
const paymentRoutes = require("./routes/payment");

// Routes
app.use("/api/events", eventRoutes);
app.use("/api/workshops", workshopRoutes);
app.use("/api/passes", passRoutes);
app.use("/api/registration", registrationRoutes);
app.use("/api/payment", paymentRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    message: "Backend server is running!",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
module.exports = app;