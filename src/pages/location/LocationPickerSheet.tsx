import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LocationSearch from "../../components/LocationSearch.tsx";
import { LocationSheetCurrentLocation } from "../../components/LocationSheetCurrentLocation.tsx";
import { LocationSheetRecent } from "../../components/LocationSheetRecent.tsx";
import { LocationSheetSaved } from "../../components/LocationSheetSaved.tsx";
import { useLocation as useDeliveryLocation, type LocationData } from "../../context/LocationContext.tsx";

export interface LocationPickerSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    subtitle?: string;
    primaryAction?: { label: string; onClick: () => void };
    /** When true (e.g. landing flow), choosing a location navigates to /menu; context already holds the coords. */
    navigateToMenuOnSelect?: boolean;
}

function locationKey(data: LocationData | null): string | null {
    if (!data) return null;
    return `${data.latitude},${data.longitude},${data.displayName}`;
}

/** Overlay + desktop modal / mobile bottom sheet for choosing delivery location. */
export const LocationPickerSheet: React.FC<LocationPickerSheetProps> = ({
    isOpen,
    onClose,
    title = "Change address",
    subtitle = "Search for city/locality or use GPS",
    primaryAction,
    navigateToMenuOnSelect = false,
}) => {
    const navigate = useNavigate();
    const { locationData } = useDeliveryLocation();
    const locationAtOpenRef = useRef<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        locationAtOpenRef.current = locationKey(locationData);
        // Intentionally only when sheet opens — do not depend on locationData or we reset after each pick.
    }, [isOpen]);

    useEffect(() => {
        if (!navigateToMenuOnSelect || !isOpen) return;
        const now = locationKey(locationData);
        if (now == null) return;
        if (now === locationAtOpenRef.current) return;
        navigate("/menu");
        onClose();
    }, [locationData, isOpen, navigateToMenuOnSelect, navigate, onClose]);

    if (!isOpen) return null;

    const handlePrimary = () => {
        primaryAction?.onClick();
        onClose();
    };

    const scrollable = (
        <>
            <LocationSearch />
            <LocationSheetCurrentLocation />
            <LocationSheetRecent active={isOpen} />
            <LocationSheetSaved active={isOpen} />
        </>
    );

    return (
        <>
            <button
                type="button"
                aria-label="Close location picker"
                onClick={onClose}
                className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm"
            />

            <div className="pointer-events-none fixed inset-0 z-[130] hidden md:block">
                <div className="pointer-events-auto absolute inset-0 flex items-center justify-center px-6 py-8">
                    <div className="flex max-h-[min(92vh,880px)] min-h-[min(58vh,560px)] w-full max-w-[640px] flex-col overflow-hidden rounded-[22px] border border-[#E5E7EB] bg-white shadow-[0_24px_60px_rgba(0,0,0,0.25)]">
                        <div className="flex shrink-0 items-center justify-between border-b border-[#E5E7EB] px-6 py-5">
                            <div>
                                <p className="text-[14px] font-bold text-[#111827]">{title}</p>
                                <p className="mt-1 text-[12px] text-[#6B7280]">{subtitle}</p>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto p-6">{scrollable}</div>
                        {primaryAction && (
                            <div className="shrink-0 border-t border-[#E5E7EB] px-6 py-4">
                                <button
                                    type="button"
                                    onClick={handlePrimary}
                                    className="h-[50px] w-full rounded-xl bg-neutral-950 text-[15px] font-semibold text-white transition-transform active:scale-[0.98]"
                                >
                                    {primaryAction.label}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[130] flex justify-center px-3 pb-[max(10px,calc(env(safe-area-inset-bottom)+10px))] md:hidden">
                <div
                    className="pointer-events-auto flex max-h-[min(90dvh,880px)] min-h-[58vh] w-full max-w-lg flex-col overflow-hidden rounded-[40px] border border-black/[0.08] bg-white shadow-[0_12px_48px_rgba(15,23,42,0.14)] box-border"
                    style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
                >
                    <div className="flex-shrink-0 px-5 pb-3 pt-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[18px] font-semibold text-[#111827]">{title}</h2>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <p className="mt-1 text-[12px] text-[#6B7280]">{subtitle}</p>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2">{scrollable}</div>
                    {primaryAction && (
                        <div className="flex-shrink-0 border-t border-[#E5E7EB] px-5 pt-3">
                            <button
                                type="button"
                                onClick={handlePrimary}
                                className="h-[50px] w-full rounded-xl bg-neutral-950 text-[16px] font-semibold text-white transition-transform active:scale-[0.98]"
                            >
                                {primaryAction.label}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default LocationPickerSheet;
