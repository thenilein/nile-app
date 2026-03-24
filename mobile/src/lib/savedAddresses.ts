import type { LocationData } from "../types/location";
import { supabase } from "./supabase";

export type SavedAddressType = "home" | "work" | "other";

export type SavedAddressRow = {
  id: string;
  formatted_address: string | null;
  latitude: number | null;
  longitude: number | null;
  street: string | null;
  locality: string | null;
  city: string | null;
  state: string | null;
  recipient_name?: string | null;
  phone?: string | null;
  address_type: string | null;
};

export const SAVED_ADDRESS_SELECT =
  "id, formatted_address, latitude, longitude, street, locality, city, state, recipient_name, phone, address_type";

export async function fetchUserSavedAddresses(userId: string, limit = 12): Promise<SavedAddressRow[]> {
  const { data, error } = await supabase
    .from("addresses")
    .select(SAVED_ADDRESS_SELECT)
    .or(`user_id.eq.${userId},profile_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as SavedAddressRow[];
}

export function savedAddressToLocation(row: SavedAddressRow): LocationData | null {
  if (row.latitude == null || row.longitude == null) return null;

  const displayName =
    row.formatted_address?.trim() ||
    [row.street, row.locality, row.city, row.state].filter(Boolean).join(", ") ||
    "Saved address";

  return {
    latitude: row.latitude,
    longitude: row.longitude,
    city: row.city ?? "",
    state: row.state ?? "",
    displayName,
  };
}

export function isSavedAddressType(value: string | null): value is SavedAddressType {
  return value === "home" || value === "work" || value === "other";
}

export function savedAddressTypeLabel(
  addressType: string | null,
  options?: { otherLabel?: string; unknownLabel?: string }
): string {
  if (addressType === "home") return "Home";
  if (addressType === "work") return "Work";
  if (addressType === "other") return options?.otherLabel ?? "Other";
  return options?.unknownLabel ?? options?.otherLabel ?? "Other";
}
