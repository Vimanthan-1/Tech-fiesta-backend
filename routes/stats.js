const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

// Cache implementation to protect Firestore read quota
let cachedStats = null;
let cacheLastFetched = null;
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours cache (effectively permanent until next manual restart/reset)

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
        const id = event.id || event;
        eventCounts[id] = (eventCounts[id] || 0) + 1;
      });
    }
    
    if (data.selectedWorkshops && Array.isArray(data.selectedWorkshops)) {
      data.selectedWorkshops.forEach((workshop) => {
        const id = workshop.id || workshop;
        workshopCounts[id] = (workshopCounts[id] || 0) + 1;
      });
    }

    if (data.selectedNonTechEvents && Array.isArray(data.selectedNonTechEvents)) {
      data.selectedNonTechEvents.forEach((event) => {
        const id = event.id || event;
        nonTechEventCounts[id] = (nonTechEventCounts[id] || 0) + 1;
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

// Helper to manually increment cached stats without reading database
const incrementStats = (formData) => {
  if (!cachedStats) {
    // If cache hasn't been loaded yet, getRegistrationStats will fetch it on first call.
    return;
  }

  console.log("⚡ Manually incrementing registration stats in memory cache...");

  if (formData.selectedEvents && Array.isArray(formData.selectedEvents)) {
    formData.selectedEvents.forEach((event) => {
      const id = event.id || event;
      cachedStats.events[id] = (cachedStats.events[id] || 0) + 1;
    });
  }

  if (formData.selectedWorkshops && Array.isArray(formData.selectedWorkshops)) {
    formData.selectedWorkshops.forEach((workshop) => {
      const id = workshop.id || workshop;
      cachedStats.workshops[id] = (cachedStats.workshops[id] || 0) + 1;
    });
  }

  if (formData.selectedNonTechEvents && Array.isArray(formData.selectedNonTechEvents)) {
    formData.selectedNonTechEvents.forEach((event) => {
      const id = event.id || event;
      cachedStats.nonTechEvents[id] = (cachedStats.nonTechEvents[id] || 0) + 1;
    });
  }
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
  getRegistrationStats,
  incrementStats
};
