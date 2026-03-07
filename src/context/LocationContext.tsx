import React, { createContext, useCallback, useContext, useState } from "react";

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
    setLocationData: (data: LocationData) => void;
    clearLocation: () => void;
    getCurrentLocation: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

async function reverseGeocode(lat: number, lon: number): Promise<LocationData | null> {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
            { headers: { "Accept-Language": "en" } }
        );
        if (!res.ok) return null;
        const data = await res.json();
        const addr = data.address || {};
        const city =
            addr.city ||
            addr.town ||
            addr.village ||
            addr.county ||
            addr.suburb ||
            "";
        const state = addr.state || "";
        const displayName = city && state ? `${city}, ${state}` : data.display_name || "";
        return { latitude: lat, longitude: lon, city, state, displayName };
    } catch {
        return null;
    }
}

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [locationData, setLocationDataState] = useState<LocationData | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);

    const setLocationData = useCallback((data: LocationData) => {
        setLocationDataState(data);
        setLocationError(null);
    }, []);

    const clearLocation = useCallback(() => {
        setLocationDataState(null);
        setLocationError(null);
    }, []);

    const getCurrentLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocationError("Geolocation is not supported by your browser.");
            return;
        }
        setLocationError(null);
        setIsLoadingLocation(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                const result = await reverseGeocode(latitude, longitude);
                if (result) {
                    setLocationDataState(result);
                } else {
                    // Fallback: store raw coordinates with a friendly label
                    setLocationDataState({
                        latitude,
                        longitude,
                        city: "",
                        state: "",
                        displayName: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                    });
                }
                setIsLoadingLocation(false);
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
    }, []);

    return (
        <LocationContext.Provider
            value={{
                locationData,
                locationError,
                isLoadingLocation,
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
