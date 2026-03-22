import React from "react";
import { MapPin } from "lucide-react";
import { useLocation } from "../context/LocationContext.tsx";

/** GPS / current location action for the location sheet. */
export const LocationSheetCurrentLocation: React.FC = () => {
    const { getCurrentLocation } = useLocation();

    return (
        <button
            type="button"
            onClick={() => getCurrentLocation()}
            className="mt-4 flex h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-green-50 font-bold text-green-700 transition-colors hover:bg-green-100"
        >
            <MapPin className="h-4 w-4" />
            Use my current GPS location
        </button>
    );
};
