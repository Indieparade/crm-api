import express from "express";
import cors from "cors";
import admin from "firebase-admin";

// Initialise Firebase Admin using env vars from Render
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Convert \n sequences in the env var into real newlines
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());

/**
 * POST /companies/search
 * Firestore-backed search with optional filters
 */
app.post("/companies/search", async (req, res) => {
  const { query, town, sector, status } = req.body || {};

  try {
    let qRef = db.collection("companies");

    // Apply Firestore filters (exact match)
    if (town) qRef = qRef.where("town", "==", town);
    if (sector) qRef = qRef.where("sector", "==", sector);
    if (status) qRef = qRef.where("status", "==", status);

    const snapshot = await qRef.get();
    const companies = [];

    snapshot.forEach((doc) => {
      const data = doc.data() || {};

      // Optional free-text filter on name (case insensitive, in memory)
      if (query) {
        const name = (data.name || "").toLowerCase();
        if (!name.includes(query.toLowerCase())) {
          return; // Skip if name doesn't match
        }
      }

      // Normalise lastEngagementDate
      let lastEngagementDate = null;
      const rawDate = data.lastEngagementDate;
      if (rawDate) {
        if (rawDate.toDate) {
          lastEngagementDate = rawDate.toDate().toISOString().slice(0, 10);
        } else if (typeof rawDate === "string") {
          lastEngagementDate = rawDate;
        }
      }

      companies.push({
        id: doc.id,
        name: data.name || "",
        town: data.town || "",
        sector: data.sector || "",
        status: data.status || "",
        lastEngagementDate,
      });
    });

    res.json({ companies });
  } catch (err) {
    console.error("Error searching companies", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /companies
 * Return ALL companies from Firestore (no filters)
 */
app.get("/companies", async (req, res) => {
  try {
    const snapshot = await db.collection("companies").get();
    const companies = [];

    snapshot.forEach((doc) => {
      const data = doc.data() || {};

      let lastEngagementDate = null;
      const rawDate = data.lastEngagementDate;
      if (rawDate) {
        if (rawDate.toDate) {
          lastEngagementDate = rawDate.toDate().toISOString().slice(0, 10);
        } else if (typeof rawDate === "string") {
          lastEngagementDate = rawDate;
        }
      }

      companies.push({
        id: doc.id,
        name: data.name || "",
        town: data.town || "",
        sector: data.sector || "",
        status: data.status || "",
        lastEngagementDate,
      });
    });

    res.json({ companies });
  } catch (err) {
    console.error("Error getting all companies", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PATCH /companies/:id
 * Update any company (partial update)
 */
app.patch("/companies/:id", async (req, res) => {
  try {
    const companyId = req.params.id;
    const updates = req.body || {};

    if (!companyId) {
      return res.status(400).json({ error: "Missing company ID" });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No update fields provided" });
    }

    await db.collection("companies").doc(companyId).update(updates);

    res.json({
      success: true,
      id: companyId,
      updates,
    });
  } catch (err) {
    console.error("Error updating company", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`CRM API running on port ${port}`);
});