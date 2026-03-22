import React from "react";
import LocationSearch from "./LocationSearch.tsx";
import { LocationSheetCurrentLocation } from "./LocationSheetCurrentLocation.tsx";
import { LocationSheetRecent } from "./LocationSheetRecent.tsx";
import { LocationSheetSaved } from "./LocationSheetSaved.tsx";

type LocationPickerContentProps = {
    /** When the host sheet is open; drives recents/saved refresh behavior */
    active: boolean;
    className?: string;
};

/**
 * Search, GPS current location, recents, and saved addresses — shared body for
 * landing flow, “change address” sheet, and any other delivery-location picker.
 */
export const LocationPickerContent: React.FC<LocationPickerContentProps> = ({ active, className }) => (
    <div className={className ?? "flex flex-col gap-4"}>
        <LocationSearch />
        <LocationSheetCurrentLocation />
        <LocationSheetRecent active={active} />
        <LocationSheetSaved active={active} />
    </div>
);
