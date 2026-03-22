import React, { useMemo } from "react";
import { Clock } from "lucide-react";
import { useLocation, type LocationData } from "../context/LocationContext.tsx";
import { getLocationRecents } from "../lib/locationRecents.ts";
import { LocationSheetInsetList } from "./LocationSheetInsetList.tsx";

export const LocationSheetRecent: React.FC<{ active: boolean }> = ({ active }) => {
    const { locationData, setLocationData } = useLocation();

    const items = useMemo(() => {
        if (!active) return [];
        return getLocationRecents().map((r, i) => ({
            id: `${r.latitude},${r.longitude},${i}`,
            title: r.displayName,
            subtitle: [r.city, r.state].filter(Boolean).join(", ") || undefined,
            icon: <Clock className="size-4" strokeWidth={2} aria-hidden />,
            onSelect: () => {
                const data: LocationData = {
                    latitude: r.latitude,
                    longitude: r.longitude,
                    city: r.city,
                    state: r.state,
                    displayName: r.displayName,
                };
                setLocationData(data);
            },
        }));
    }, [active, locationData, setLocationData]);

    return <LocationSheetInsetList heading="Recents" items={items} />;
};
