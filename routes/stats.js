const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

// Cache implementation to protect Firestore read quota
let cachedStats = null;
let cacheLastFetched = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes cache

// Helper to get registration stats
const getRegistrationStats = async () => {
  const now = Date.now();
  if (cachedStats && cacheLastFetched && (now - cacheLastFetched < CACHE_DURATION_MS)) {
    return cachedStats;
  }

  const db = admin.firestore();
  
  // We only count registrations that are successfully confirmed
  const snapshot = await db.collection("registrations")
    .where("status", "==", "confirmed")
    .get();

  const eventCounts = {};
  const workshopCounts = {};
  const nonTechEventCounts = {};

  snapshot.forEach((doc) => {
    const data = doc.data();
    
    if (data.selectedEvents && Array.isArray(data.selectedEvents)) {
      data.selectedEvents.forEach((event) => {
        eventCounts[event.id] = (eventCounts[event.id] || 0) + 1;
      });
    }
    
    if (data.selectedWorkshops && Array.isArray(data.selectedWorkshops)) {
      data.selectedWorkshops.forEach((workshop) => {
        workshopCounts[workshop.id] = (workshopCounts[workshop.id] || 0) + 1;
      });
    }

    if (data.selectedNonTechEvents && Array.isArray(data.selectedNonTechEvents)) {
      data.selectedNonTechEvents.forEach((event) => {
        nonTechEventCounts[event.id] = (nonTechEventCounts[event.id] || 0) + 1;
      });
    }
  });

  cachedStats = {
    events: eventCounts,
    workshops: workshopCounts,
    nonTechEvents: nonTechEventCounts
  };
  cacheLastFetched = now;

  return cachedStats;
};

// GET /stats/registrations
router.get("/registrations", async (req, res) => {
  try {
    const stats = await getRegistrationStats();
    res.json({
      success: true,
      data: stats,
      message: "Registration stats retrieved successfully"
    });
  } catch (error) {
    console.error("Error retrieving registration stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve stats",
      message: error.message
    });
  }
});

module.exports = {
  router,
  getRegistrationStats
};
