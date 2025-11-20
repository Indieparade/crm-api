import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// TEMPORARY "FAKE" DATABASE — later we'll swap this for Firestore
const companies = [
  {
    id: "1",
    name: "Green IT Disposal",
    town: "Rochdale",
    sector: "IT / Recycling",
    status: "Active",
    lastEngagementDate: "2025-02-01"
  },
  {
    id: "2",
    name: "Rushton Developments",
    town: "Rochdale",
    sector: "Construction",
    status: "Active",
    lastEngagementDate: "2025-01-11"
  },
  {
    id: "3",
    name: "First Bus Rochdale",
    town: "Rochdale",
    sector: "Transport",
    status: "Prospect",
    lastEngagementDate: null
  }
];

// POST /companies/search
app.post("/companies/search", (req, res) => {
  const { query, town, sector, status } = req.body || {};

  let results = companies;

  if (query) {
    const q = query.toLowerCase();
    results = results.filter((c) => c.name.toLowerCase().includes(q));
  }

  if (town) {
    const t = town.toLowerCase();
    results = results.filter(
      (c) => c.town && c.town.toLowerCase() === t
    );
  }

  if (sector) {
    const s = sector.toLowerCase();
    results = results.filter(
      (c) => c.sector && c.sector.toLowerCase().includes(s)
    );
  }

  if (status) {
    const st = status.toLowerCase();
    results = results.filter(
      (c) => c.status && c.status.toLowerCase() === st
    );
  }

  res.json({ companies: results });
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`CRM API running on port ${port}`);
});