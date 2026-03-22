import { supabase } from "./supabase.ts";
import { mapboxReverseGeocode } from "./mapboxGeocoding.ts";
import { findMatchingSavedAddress } from "./addressCoordMatch.ts";

/** Same shape as `LocationData` in context (kept here to avoid circular imports). */
type ResolvedGpsLocation = {
    latitude: number;
    longitude: number;
    city: string;
    state: string;
    displayName: string;
};

type AddressPinRow = {
    latitude: number | null;
    longitude: number | null;
    formatted_address: string | null;
    street: string | null;
    locality: string | null;
    city: string | null;
    state: string | null;
};

/**
 * For GPS coords: if the user has a saved address within ~45m, reuse its label for nav/UI.
 * Otherwise reverse-geocode. (Search / saved tap / recents skip this and set labels directly.)
 */
export async function resolveGpsCoordsToLocationData(
    latitude: number,
    longitude: number,
    userId: string | null | undefined
): Promise<ResolvedGpsLocation> {
    if (userId) {
        try {
            const { data, error } = await supabase
                .from("addresses")
                .select("latitude, longitude, formatted_address, street, locality, city, state")
                .or(`user_id.eq.${userId},profile_id.eq.${userId}`)
                .order("created_at", { ascending: false })
                .limit(24);
            if (!error && data?.length) {
                const match = findMatchingSavedAddress(data as AddressPinRow[], latitude, longitude);
                if (match) {
                    return {
                        latitude,
                        longitude,
                        city: match.city ?? "",
                        state: match.state ?? "",
                        displayName:
                            match.formatted_address?.trim() ||
                            [match.locality, match.street, match.city].filter(Boolean).join(", ") ||
                            "Saved address",
                    };
                }
            }
        } catch {
            /* fall through to reverse geocode */
        }
    }

    const s = await mapboxReverseGeocode(latitude, longitude);
    if (s) {
        return {
            latitude,
            longitude,
            city: s.city,
            state: s.state,
            displayName: s.displayName,
        };
    }

    return {
        latitude,
        longitude,
        city: "",
        state: "",
        displayName: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
    };
}
