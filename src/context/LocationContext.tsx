import React, { createContext, useCallback, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase.ts";
import { mapboxReverseGeocode } from "../lib/mapboxGeocoding.ts";

export interface Outlet {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    address: string;
    city: string;
    state: string;
    is_active: boolean;
    distance_km: number;
    is_serviceable: boolean;
}

export interface LocationData {
    latitude: number;
    longitude: number;
    city: string;
    state: string;
    displayName: string;
}

interface LocationContextType {
    locationData: LocationData | null;
    locationError: string | null;
    isLoadingLocation: boolean;
    outlets: Outlet[];
    nearestOutlet: Outlet | null;
    isServiceable: boolean;
    setLocationData: (data: LocationData) => void;
    clearLocation: () => void;
    getCurrentLocation: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

async function reverseGeocode(lat: number, lon: number): Promise<LocationData | null> {
    try {
        const s = await mapboxReverseGeocode(lat, lon);
        if (!s) return null;
        return {
            latitude: lat,
            longitude: lon,
            city: s.city,
            state: s.state,
            displayName: s.displayName,
        };
    } catch {
        return null;
    }
}

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [locationData, setLocationDataState] = useState<LocationData | null>(() => {
        try {
            const cached = localStorage.getItem("nile_location");
            if (cached) return JSON.parse(cached);
        } catch { }
        return null;
    });

    const [locationError, setLocationError] = useState<string | null>(null);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);

    const [outlets, setOutlets] = useState<Outlet[]>([]);
    const [nearestOutlet, setNearestOutlet] = useState<Outlet | null>(null);
    const [isServiceable, setIsServiceable] = useState<boolean>(false);

    // Fetch active outlets to draw on the map
    useEffect(() => {
        const fetchOutlets = async () => {
            const { data } = await supabase.from('outlets').select('*').eq('is_active', true);
            if (data) {
                setOutlets(data as Outlet[]);
            }
        };
        fetchOutlets();
    }, []);

    // Fetch nearest outlet whenever location changes
    useEffect(() => {
        if (!locationData) {
            setNearestOutlet(null);
            setIsServiceable(false);
            return;
        }

        const fetchNearestOutlet = async () => {
            setIsLoadingLocation(true);
            try {
                const { data, error } = await supabase.rpc('find_nearest_outlet', {
                    user_lat: locationData.latitude,
                    user_lng: locationData.longitude
                });

                if (error) {
                    console.error("Error finding nearest outlet:", error);
                    setLocationError("Unable to detect nearest outlet.");
                    setNearestOutlet(null);
                    setIsServiceable(false);
                } else if (!data || data.length === 0) {
                    setLocationError("No outlets found anywhere.");
                    setNearestOutlet(null);
                    setIsServiceable(false);
                } else {
                    const closest = data[0] as Outlet;
                    setNearestOutlet(closest);
                    setIsServiceable(closest.is_serviceable);

                    if (closest.is_serviceable) {
                        localStorage.setItem("nile_outlet_id", closest.id);
                    } else {
                        localStorage.removeItem("nile_outlet_id");
                    }
                }
            } catch (err) {
                console.error(err);
                setLocationError("Unexpected error calculating distance.");
            } finally {
                setIsLoadingLocation(false);
            }
        };

        fetchNearestOutlet();
    }, [locationData]);

    const setLocationData = useCallback((data: LocationData) => {
        setLocationDataState(data);
        setLocationError(null);
        localStorage.setItem("nile_location", JSON.stringify(data));
    }, []);

    const clearLocation = useCallback(() => {
        setLocationDataState(null);
        setLocationError(null);
        setNearestOutlet(null);
        setIsServiceable(false);
        localStorage.removeItem("nile_location");
        localStorage.removeItem("nile_outlet_id");
        try {
            sessionStorage.removeItem("nile_mapbox_label_sync");
        } catch {
            /* ignore */
        }
    }, []);

    const getCurrentLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocationError("Geolocation is not supported by your browser.");
            return;
        }
        setLocationError(null);
        setIsLoadingLocation(true); // Let it spin while it fetches coordinates and outlet
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                const result = await reverseGeocode(latitude, longitude);
                if (result) {
                    setLocationData(result);
                } else {
                    const fallbackData = {
                        latitude,
                        longitude,
                        city: "",
                        state: "",
                        displayName: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                    };
                    setLocationData(fallbackData);
                }
                // setIsLoadingLocation is turned off inside the useEffect that catches `locationData` changing
            },
            (error) => {
                setIsLoadingLocation(false);
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        setLocationError("Location permission denied. Please allow access and try again.");
                        break;
                    case error.POSITION_UNAVAILABLE:
                        setLocationError("Location information is unavailable.");
                        break;
                    case error.TIMEOUT:
                        setLocationError("Location request timed out. Please try again.");
                        break;
                    default:
                        setLocationError("Unable to get your location. Please try manual search.");
                }
            },
            { timeout: 10000, enableHighAccuracy: true }
        );
    }, [setLocationData]);

    return (
        <LocationContext.Provider
            value={{
                locationData,
                locationError,
                isLoadingLocation,
                outlets,
                nearestOutlet,
                isServiceable,
                setLocationData,
                clearLocation,
                getCurrentLocation,
            }}
        >
            {children}
        </LocationContext.Provider>
    );
};

export const useLocation = () => {
    const context = useContext(LocationContext);
    if (context === undefined) {
        throw new Error("useLocation must be used within a LocationProvider");
    }
    return context;
};
