import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ExpoLocation from "expo-location";
import { supabase } from "../lib/supabase";
import { resolveGpsCoordsToLocationData } from "../lib/resolveGpsToLocationData";
import type { LocationData, Outlet } from "../types/location";
import { useAuth } from "./AuthContext";

const LOC_KEY = "nile_location";
const OUTLET_KEY = "nile_outlet_id";

interface LocationContextType {
  locationData: LocationData | null;
  locationError: string | null;
  isLoadingLocation: boolean;
  outlets: Outlet[];
  nearestOutlet: Outlet | null;
  isServiceable: boolean;
  setLocationData: (data: LocationData) => void;
  clearLocation: () => void;
  getCurrentLocation: () => Promise<boolean>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [locationData, setLocationDataState] = useState<LocationData | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [nearestOutlet, setNearestOutlet] = useState<Outlet | null>(null);
  const [isServiceable, setIsServiceable] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LOC_KEY).then((raw) => {
      if (raw) {
        try {
          setLocationDataState(JSON.parse(raw));
        } catch {
          /* ignore */
        }
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    const fetchOutlets = async () => {
      const { data } = await supabase.from("outlets").select("*").eq("is_active", true);
      if (data) setOutlets(data as Outlet[]);
    };
    fetchOutlets();
  }, []);

  useEffect(() => {
    if (!locationData) {
      setNearestOutlet(null);
      setIsServiceable(false);
      return;
    }

    const fetchNearestOutlet = async () => {
      setIsLoadingLocation(true);
      try {
        const { data, error } = await supabase.rpc("find_nearest_outlet", {
          user_lat: locationData.latitude,
          user_lng: locationData.longitude,
        });

        if (error) {
          console.error("find_nearest_outlet", error);
          setLocationError("Unable to detect nearest outlet.");
          setNearestOutlet(null);
          setIsServiceable(false);
        } else if (!data || !Array.isArray(data) || data.length === 0) {
          setLocationError("No outlets found anywhere.");
          setNearestOutlet(null);
          setIsServiceable(false);
        } else {
          const closest = data[0] as Outlet;
          setNearestOutlet(closest);
          setIsServiceable(closest.is_serviceable);
          if (closest.is_serviceable) {
            await AsyncStorage.setItem(OUTLET_KEY, closest.id);
          } else {
            await AsyncStorage.removeItem(OUTLET_KEY);
          }
        }
      } catch (e) {
        console.error(e);
        setLocationError("Unexpected error calculating distance.");
      } finally {
        setIsLoadingLocation(false);
      }
    };

    fetchNearestOutlet();
  }, [locationData]);

  const setLocationData = useCallback(async (data: LocationData) => {
    setLocationDataState(data);
    setLocationError(null);
    await AsyncStorage.setItem(LOC_KEY, JSON.stringify(data));
  }, []);

  const clearLocation = useCallback(async () => {
    setLocationDataState(null);
    setLocationError(null);
    setNearestOutlet(null);
    setIsServiceable(false);
    await AsyncStorage.removeItem(LOC_KEY);
    await AsyncStorage.removeItem(OUTLET_KEY);
  }, []);

  const getCurrentLocation = useCallback(async (): Promise<boolean> => {
    setLocationError(null);
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setLocationError("Location permission denied. Please allow access and try again.");
      return false;
    }
    setIsLoadingLocation(true);
    try {
      const pos = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.High,
      });
      const { latitude, longitude } = pos.coords;
      const resolved = await resolveGpsCoordsToLocationData(latitude, longitude, user?.id);
      await setLocationData(resolved);
      return true;
    } catch {
      setLocationError("Unable to get your location. Please try manual search.");
      return false;
    } finally {
      setIsLoadingLocation(false);
    }
  }, [setLocationData, user?.id]);

  const value: LocationContextType = {
    locationData: hydrated ? locationData : null,
    locationError,
    isLoadingLocation,
    outlets,
    nearestOutlet,
    isServiceable,
    setLocationData,
    clearLocation,
    getCurrentLocation,
  };

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
};

export const useLocation = () => {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used within a LocationProvider");
  return ctx;
};
