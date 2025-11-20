import express from "express";
import cors from "cors";
import admin from "firebase-admin";

// Initialise Firebase Admin using env vars from Render
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY,
}),
  });
}

const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());

// POST /companies/search - now reads from Firestore instead of a fake array
app.post("/companies/search", async (req, res) => {
  const { query, town, sector, status } = req.body || {};

  try {
    // Start from the 'companies' collection
    let qRef = db.collection("companies");

    // Apply exact-match filters that Firestore can handle efficiently
    if (town) {
      qRef = qRef.where("town", "==", town);
    }
    if (sector) {
      qRef = qRef.where("sector", "==", sector);
    }
    if (status) {
      qRef = qRef.where("status", "==", status);
    }

    const snapshot = await qRef.get();

    const companies = [];

    snapshot.forEach((doc) => {
      const data = doc.data() || {};

      // Optional free-text filter on name (done in memory)
      if (query) {
        const name = (data.name || "").toLowerCase();
        if (!name.includes(query.toLowerCase())) {
          return; // skip this doc if it doesn't match the query
        }
      }

      // Handle lastEngagementDate as Firestore Timestamp or string
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

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`CRM API running on port ${port}`);
});