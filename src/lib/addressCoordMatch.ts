/** Earth radius in metres (WGS84 mean). */
const R_EARTH_M = 6_371_000;

function toRad(deg: number): number {
    return (deg * Math.PI) / 180;
}

/** Great-circle distance between two WGS84 points. */
function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R_EARTH_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

export type SavedCoords = { latitude: number | null; longitude: number | null };

/**
 * Returns the first saved row whose pin is within `maxMeters` of (lat, lng).
 * Use this instead of exact float equality (search / GPS / DB differ slightly).
 */
export function findMatchingSavedAddress<T extends SavedCoords>(
    rows: T[],
    lat: number,
    lng: number,
    maxMeters = 45
): T | undefined {
    for (const row of rows) {
        if (row.latitude == null || row.longitude == null) continue;
        if (haversineDistanceMeters(lat, lng, row.latitude, row.longitude) <= maxMeters) {
            return row;
        }
    }
    return undefined;
}
