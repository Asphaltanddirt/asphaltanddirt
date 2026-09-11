/**
 * One-time helper: exchanges an OAuth client ID/secret for a long-lived refresh
 * token, for the analytics cron (YouTube Analytics API + Search Console API).
 *
 * Usage:
 *   node scripts/get-google-refresh-token.mjs <CLIENT_ID> <CLIENT_SECRET>
 *
 * It prints an auth URL — open it in the browser where you're signed in as the
 * asphaltanddirt.com Google account, approve, and it captures the code on
 * localhost and prints the refresh token. Not committed; run locally only.
 */

import http from "node:http";
import { writeFileSync, readFileSync } from "node:fs";

const args = process.argv.slice(2);
let CLIENT_ID, CLIENT_SECRET;
if (args.length === 1 && args[0].endsWith(".json")) {
  // Pass the downloaded client_secret_*.json (drag it into the terminal)
  const j = JSON.parse(readFileSync(args[0].trim(), "utf8"));
  const c = j.installed || j.web || j;
  CLIENT_ID = c.client_id;
  CLIENT_SECRET = c.client_secret;
} else {
  [CLIENT_ID, CLIENT_SECRET] = args;
}
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "Usage:\n" +
      "  node scripts/get-google-refresh-token.mjs /path/to/client_secret_XXX.json\n" +
      "  node scripts/get-google-refresh-token.mjs <CLIENT_ID> <CLIENT_SECRET>",
  );
  process.exit(1);
}

const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}`;
const SCOPES = [
  "https://www.googleapis.com/auth/yt-analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
].join(" ");

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
  }).toString();

console.log("\n1. Open this URL in the browser signed in as your asphaltanddirt.com account:\n");
console.log(authUrl);
console.log("\n2. Approve. This window will capture the response.\n");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get("code");
  const err = url.searchParams.get("error");

  if (err) {
    res.end(`Error: ${err}. You can close this tab.`);
    console.error("OAuth error:", err);
    server.close();
    return;
  }
  if (!code) {
    res.end("Waiting for the OAuth redirect...");
    return;
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }).toString(),
    });
    const data = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(JSON.stringify(data));

    res.end("Done. Refresh token written to scripts/.google-token.txt — you can close this tab.");
    if (!data.refresh_token) {
      console.log("\nNo refresh_token returned. Re-run (prompt=consent should force it).");
      return;
    }
    writeFileSync(new URL("./.google-token.txt", import.meta.url), data.refresh_token + "\n");
    console.log("\n=== SUCCESS ===");
    console.log("Refresh token written to scripts/.google-token.txt");
    console.log("Granted scopes:", data.scope);
  } catch (e) {
    res.end("Token exchange failed — see terminal.");
    console.error("\nToken exchange failed:", e.message);
  } finally {
    server.close();
  }
});

server.listen(PORT, () => {});
