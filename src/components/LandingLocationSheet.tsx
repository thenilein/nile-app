import React from "react";
import { LocationPickerSheet } from "./LocationPickerSheet.tsx";

export type LandingLocationSheetProps = {
    isOpen: boolean;
    onClose: () => void;
};

/** Landing “Order now”: auth gate + location (`LocationPickerSheet` → `SheetLoginStep` + `LocationPickerContent`). */
export const LandingLocationSheet: React.FC<LandingLocationSheetProps> = ({ isOpen, onClose }) => (
    <LocationPickerSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Delivery location"
        subtitle="Search, pick an address, or use GPS"
        navigateToMenuOnSelect
        authGate
    />
);
