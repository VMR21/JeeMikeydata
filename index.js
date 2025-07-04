import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;
const SELF_URL = "https://jeemikeydata.onrender.com/leaderboard/top14";
const API_KEY = "RdzfrIAKpbYJeeVvUPwdWRn389gb8vfw";

let cachedCurrent = [];
let cachedPrevious = [];

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

function getDateRange(monthOffset = 0) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + monthOffset;

  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 0));

  return {
    startStr: start.toISOString().slice(0, 10),
    endStr: end.toISOString().slice(0, 10),
  };
}

async function fetchLeaderboardData(monthOffset = 0) {
  const { startStr, endStr } = getDateRange(monthOffset);
  const url = `https://services.rainbet.com/v1/external/affiliates?start_at=${startStr}&end_at=${endStr}&key=${API_KEY}`;

  const response = await fetch(url);
  const json = await response.json();
  if (!json.affiliates) throw new Error("No data");

  const sorted = json.affiliates.sort(
    (a, b) => parseFloat(b.wagered_amount) - parseFloat(a.wagered_amount)
  );
  const top10 = sorted.slice(0, 10);
  if (top10.length >= 2) [top10[0], top10[1]] = [top10[1], top10[0]];

  return top10.map(entry => ({
    username: entry.username, // unmasked
    wagered: Math.round(parseFloat(entry.wagered_amount)),
    weightedWager: Math.round(parseFloat(entry.wagered_amount)),
  }));
}

async function fetchAndCacheData() {
  try {
    cachedCurrent = await fetchLeaderboardData(0); // current month
    cachedPrevious = await fetchLeaderboardData(-1); // previous month
    console.log("[✅] Leaderboard (current + previous) updated");
  } catch (err) {
    console.error("[❌] Fetch failed:", err.message);
  }
}

fetchAndCacheData();
setInterval(fetchAndCacheData, 5 * 60 * 1000); // every 5 mins

app.get("/leaderboard/top14", (req, res) => {
  res.json(cachedCurrent);
});

app.get("/leaderboard/prev", (req, res) => {
  res.json(cachedPrevious);
});

setInterval(() => {
  fetch(SELF_URL)
    .then(() => console.log(`[🔁] Self-pinged ${SELF_URL}`))
    .catch(err => console.error("[⚠️] Self-ping failed:", err.message));
}, 270000); // every 4.5 mins

app.listen(PORT, () => console.log(`🚀 Running on port ${PORT}`));
