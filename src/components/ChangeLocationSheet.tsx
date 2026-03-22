import React from "react";
import { LocationPickerSheet, type LocationPickerSheetProps } from "./LocationPickerSheet.tsx";

export type ChangeLocationSheetProps = Pick<
    LocationPickerSheetProps,
    "isOpen" | "onClose" | "title" | "subtitle" | "primaryAction"
>;

/**
 * Menu / navbar “change address” — same shared location body as landing, without auth gate or auto-navigate.
 */
export const ChangeLocationSheet: React.FC<ChangeLocationSheetProps> = ({
    isOpen,
    onClose,
    title,
    subtitle,
    primaryAction,
}) => (
    <LocationPickerSheet
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        subtitle={subtitle}
        primaryAction={primaryAction}
    />
);
