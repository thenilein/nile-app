import Constants from "expo-constants";

type NileExtra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  mapboxAccessToken?: string;
};

function readExtra(): NileExtra {
  const e = Constants.expoConfig?.extra;
  if (e && typeof e === "object") return e as NileExtra;
  return {};
}

export function getSupabaseUrl(): string {
  return (
    process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ||
    readExtra().supabaseUrl?.trim() ||
    ""
  );
}

export function getSupabaseAnonKey(): string {
  return (
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    readExtra().supabaseAnonKey?.trim() ||
    ""
  );
}

export function getMapboxAccessTokenResolved(): string | undefined {
  const a = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();
  const b = process.env.EXPO_PUBLIC_MAPBOX_TOKEN?.trim();
  const c = readExtra().mapboxAccessToken?.trim();
  const t = a || b || c || "";
  return t.length > 0 ? t : undefined;
}
