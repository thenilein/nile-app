/** Same fields as LocationData; kept local to avoid circular imports with LocationContext. */
export type LocationRecentEntry = {
    latitude: number;
    longitude: number;
    city: string;
    state: string;
    displayName: string;
};

const STORAGE_KEY = "nile_location_recents";
const MAX_RECENTS = 8;

function keyFor(loc: LocationRecentEntry): string {
    return `${loc.latitude.toFixed(5)},${loc.longitude.toFixed(5)}`;
}

export function getLocationRecents(): LocationRecentEntry[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as LocationRecentEntry[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/** Call when user confirms a location (search, GPS, saved pick). Dedupes and caps list. */
export function pushLocationRecent(data: LocationRecentEntry): void {
    try {
        const k = keyFor(data);
        const prev = getLocationRecents().filter((p) => keyFor(p) !== k);
        const next = [data, ...prev].slice(0, MAX_RECENTS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
        /* ignore quota */
    }
}
