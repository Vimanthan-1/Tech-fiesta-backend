const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

// Cache implementation to protect Firestore read quota
let cachedStats = null;
let cacheLastFetched = null;
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes cache

// Helper to get registration stats
const getRegistrationStats = async () => {
  const now = Date.now();
  
  // Optimized to avoid massive Firebase Read limits
  // All Events (1-12) closed as registrations reach 50+
  cachedStats = {
    events: {
      1: 55, // Paper Presentation - sold out (capacity 51)
      2: 105, // Tech Survivor - sold out (capacity 100)
      3: 55, // UI Challenge - sold out (capacity 50)
      4: 105, // Common Coding Challenge - sold out (capacity 100)
      5: 105, // Hack the Campus - sold out (capacity 50)
      6: 105 // Tech Debate - sold out (capacity 100)
    },
    workshops: {
      1: 85, // Orchestration of Multi-Agent Systems - sold out
      2: 85, // Raspberry Pi - sold out
      3: 85, // MLOps for RAG - sold out
      4: 85, // Building a Private Cloud - sold out
      5: 85  // Blockchains and Smart Contracts - sold out
    },
    nonTechEvents: {
      7: 105, // Chess - sold out (capacity 100)
      8: 105, // Best Meme Creation - sold out (capacity 100)
      9: 55, // Missing Lyrics - sold out (capacity 50)
      10: 55, // Murder Mystery - sold out (capacity 50)
      11: 55, // Wiki Surfers - sold out (capacity 50)
      12: 55 // Adzap - sold out (capacity 50)
    }
  };
  
  cacheLastFetched = now;
  return cachedStats;
};

// Helper to manually increment cached stats without reading database
const incrementStats = (formData) => {
  if (!cachedStats) return;

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
