const path = require("path");
const dotenv = require("dotenv");

// Repo-root .env (VITE_* for web); mobile/.env overrides if present.
dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, ".env") });

function firstNonEmpty(...keys) {
  for (const key of keys) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return "";
}

module.exports = ({ config }) => {
  const supabaseUrl = firstNonEmpty(
    "EXPO_PUBLIC_SUPABASE_URL",
    "VITE_SUPABASE_URL"
  );
  const supabaseAnonKey = firstNonEmpty(
    "EXPO_PUBLIC_SUPABASE_ANON_KEY",
    "VITE_SUPABASE_ANON_KEY"
  );
  const mapboxAccessToken = firstNonEmpty(
    "EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN",
    "EXPO_PUBLIC_MAPBOX_TOKEN",
    "VITE_MAPBOX_ACCESS_TOKEN"
  );

  if (supabaseUrl) process.env.EXPO_PUBLIC_SUPABASE_URL = supabaseUrl;
  if (supabaseAnonKey) process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = supabaseAnonKey;
  if (mapboxAccessToken) {
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN = mapboxAccessToken;
  }

  // `config` here is already the expo object from app.json (not { expo: {...} }).
  const prevExtra =
    config && typeof config.extra === "object" && config.extra !== null
      ? config.extra
      : {};

  const scheme =
    (typeof config.scheme === "string" && config.scheme.trim()) || "nilecafe";

  return {
    expo: {
      ...config,
      scheme,
      extra: {
        ...prevExtra,
        supabaseUrl,
        supabaseAnonKey,
        mapboxAccessToken,
      },
    },
  };
};
