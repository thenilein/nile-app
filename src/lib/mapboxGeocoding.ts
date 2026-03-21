/**
 * Mapbox location APIs:
 * - Forward search / autocomplete: Search Box API v1 `/forward` (see `mapboxForwardGeocode`).
 * - Reverse geocode: Geocoding API v5 `mapbox.places` (see `mapboxReverseGeocode`).
 * Requires VITE_MAPBOX_ACCESS_TOKEN (or VITE_MAPBOX_TOKEN) in .env.
 */

export interface GeocodeSuggestion {
    id: string;
    displayName: string;
    city: string;
    state: string;
    latitude: number;
    longitude: number;
}

interface MapboxContext {
    id: string;
    short_code?: string;
    text: string;
}

interface MapboxFeature {
    id: string;
    place_type: string[];
    text: string;
    place_name: string;
    center: [number, number];
    context?: MapboxContext[];
}

interface MapboxGeocodeResponse {
    features: MapboxFeature[];
}

function getToken(): string | undefined {
    const env = import.meta.env as ImportMetaEnv & Record<string, string | undefined>;
    const t = env.VITE_MAPBOX_ACCESS_TOKEN || env.VITE_MAPBOX_TOKEN;
    return typeof t === "string" && t.trim().length > 0 ? t.trim() : undefined;
}

/** Public token for Geocoding API and Mapbox map tiles (restrict by URL in Mapbox dashboard). */
export function getMapboxAccessToken(): string | undefined {
    return getToken();
}

export function isMapboxGeocodingConfigured(): boolean {
    return Boolean(getToken());
}

/** Search Box forward response feature */
interface SearchBoxForwardFeature {
    type: string;
    geometry?: { type: string; coordinates: [number, number] };
    properties: {
        name: string;
        mapbox_id?: string;
        full_address?: string;
        place_formatted?: string;
        context?: {
            region?: { name?: string; region_code?: string; region_code_full?: string };
            place?: { name?: string };
            locality?: { name?: string };
        };
        coordinates?: { latitude: number; longitude: number };
    };
}

function featureIsTamilNaduSearchBox(props: SearchBoxForwardFeature["properties"]): boolean {
    const r = props.context?.region;
    if (!r) return false;
    const full = (r.region_code_full || "").toUpperCase();
    if (full === "IN-TN") return true;
    const name = (r.name || "").toLowerCase();
    return name === "tamil nadu" || name === "tamilnadu";
}

function parseSearchBoxForwardFeature(f: SearchBoxForwardFeature): GeocodeSuggestion | null {
    const p = f.properties;
    let latitude: number | undefined;
    let longitude: number | undefined;
    if (p.coordinates != null && typeof p.coordinates.latitude === "number" && typeof p.coordinates.longitude === "number") {
        latitude = p.coordinates.latitude;
        longitude = p.coordinates.longitude;
    } else if (f.geometry?.coordinates?.length === 2) {
        longitude = f.geometry.coordinates[0];
        latitude = f.geometry.coordinates[1];
    }
    if (
        latitude == null ||
        longitude == null ||
        Number.isNaN(latitude) ||
        Number.isNaN(longitude)
    ) {
        return null;
    }

    const id = p.mapbox_id || `sb:${latitude.toFixed(5)},${longitude.toFixed(5)}`;
    const placeName = p.context?.place?.name || p.context?.locality?.name || "";
    const state = p.context?.region?.name || "Tamil Nadu";
    let displayName = (p.full_address || "").trim();
    if (!displayName) {
        displayName = [p.name, p.place_formatted].filter(Boolean).join(", ");
    }
    if (!displayName) displayName = p.name;

    const city = placeName || p.name;

    return {
        id,
        displayName,
        city,
        state,
        latitude,
        longitude,
    };
}

function parseMapboxFeature(feature: MapboxFeature, opts?: { preferFullPlaceName?: boolean }): GeocodeSuggestion {
    const [longitude, latitude] = feature.center;
    const ctx = feature.context || [];
    let state = "";
    let placeFromContext = "";
    let locality = "";

    for (const c of ctx) {
        if (c.id.startsWith("region")) state = c.text || state;
        if (c.id.startsWith("place")) placeFromContext = c.text || placeFromContext;
        if (c.id.startsWith("locality")) locality = c.text || locality;
    }

    const types = feature.place_type || [];
    const isPlaceOrDistrict = types.includes("place") || types.includes("district");

    let city = "";
    if (isPlaceOrDistrict) {
        city = feature.text;
    } else {
        city = locality || placeFromContext || feature.text;
    }

    const stateNorm = state || "Tamil Nadu";
    const displayName = opts?.preferFullPlaceName
        ? feature.place_name
        : city && stateNorm && stateNorm.toLowerCase() === "tamil nadu"
          ? `${city}, ${stateNorm}`
          : feature.place_name;

    return {
        id: feature.id,
        displayName,
        city,
        state: stateNorm,
        latitude,
        longitude,
    };
}

/**
 * Forward search / autocomplete via Mapbox Search Box API (`/search/searchbox/v1/forward`).
 * Biases to India and Tamil Nadu; prefers TN results when the API returns region context.
 */
export async function mapboxForwardGeocode(query: string, limit = 8): Promise<GeocodeSuggestion[]> {
    const token = getToken();
    if (!token) return [];

    const q = query.trim();
    if (q.length < 2) return [];

    const lim = Math.min(Math.max(limit, 1), 10);
    const params = new URLSearchParams({
        q,
        access_token: token,
        limit: String(lim),
        language: "en",
        country: "IN",
        auto_complete: "true",
        proximity: "78.6569,11.1271",
    });

    const url = `https://api.mapbox.com/search/searchbox/v1/forward?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = (await res.json()) as { features?: SearchBoxForwardFeature[] };
    const features = data.features || [];
    const out: GeocodeSuggestion[] = [];
    const seen = new Set<string>();

    let candidates = features.filter((f) => featureIsTamilNaduSearchBox(f.properties));
    if (candidates.length === 0) {
        candidates = features;
    }

    for (const f of candidates) {
        const s = parseSearchBoxForwardFeature(f);
        if (!s) continue;
        if (seen.has(s.displayName)) continue;
        seen.add(s.displayName);
        out.push(s);
        if (out.length >= limit) break;
    }

    return out;
}

/**
 * After reverse geocode + user-entered door/street, build one display line for DB `formatted_address`
 * and prefer geocoded city/state for columns.
 */
export function mergeFormattedAddress(opts: {
    houseNo: string;
    street: string;
    geocode: GeocodeSuggestion | null;
    coordFallback: string;
}): { formattedAddress: string; city: string; state: string } {
    const unit = opts.houseNo.trim();
    const street = opts.street.trim();
    const doorLine = [unit, street].filter(Boolean).join(", ");
    const geoLine = opts.geocode?.displayName?.trim() || opts.coordFallback;
    const formattedAddress = doorLine ? `${doorLine}, ${geoLine}` : geoLine;
    const city = opts.geocode?.city?.trim() || "";
    const state = opts.geocode?.state?.trim() || "";
    return { formattedAddress, city, state };
}

export async function mapboxReverseGeocode(lat: number, lon: number): Promise<GeocodeSuggestion | null> {
    const token = getToken();
    if (!token) return null;

    const params = new URLSearchParams({
        access_token: token,
        limit: "1",
        language: "en",
    });
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data: MapboxGeocodeResponse = await res.json();
    const f = data.features?.[0];
    if (!f) return null;

    return parseMapboxFeature(f, { preferFullPlaceName: true });
}

/** Shape expected by checkout flow location list + handleSelectLocation. */
export async function mapboxCheckoutLocationResults(
    query: string
): Promise<Array<{ place_id: string; display_name: string; lat: string; lon: string }>> {
    const suggestions = await mapboxForwardGeocode(query, 4);
    return suggestions.map((s) => ({
        place_id: s.id,
        display_name: s.displayName,
        lat: String(s.latitude),
        lon: String(s.longitude),
    }));
}
