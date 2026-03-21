import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { getMapboxAccessToken } from "../lib/mapboxGeocoding.ts";

/** Perambalur area default when no location yet */
export const DEFAULT_CHECKOUT_MAP_CENTER = { lat: 11.2333, lng: 78.8667 };

export interface CheckoutDeliveryMapProps {
    centerLat: number;
    centerLng: number;
    onCenterChange: (lat: number, lng: number) => void;
    flyTo?: { lat: number; lng: number } | null;
    onFlyToComplete?: () => void;
    className?: string;
}

/**
 * Center pin is fixed on screen; delivery point = map center.
 * Map pans only after "Adjust Pin"; "Done" locks the map again.
 */
export const CheckoutDeliveryMap: React.FC<CheckoutDeliveryMapProps> = ({
    centerLat,
    centerLng,
    onCenterChange,
    flyTo,
    onFlyToComplete,
    className = "",
}) => {
    const token = getMapboxAccessToken();
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const flyAppliedKeyRef = useRef<string | null>(null);
    /** When false, map is locked; when true, user can pan/zoom to move the point under the center pin. */
    const [adjustPin, setAdjustPin] = useState(false);

    const onCenterChangeRef = useRef(onCenterChange);
    onCenterChangeRef.current = onCenterChange;

    const flyToRef = useRef(flyTo);
    flyToRef.current = flyTo;

    const onFlyToCompleteRef = useRef(onFlyToComplete);
    onFlyToCompleteRef.current = onFlyToComplete;

    const adjustPinRef = useRef(adjustPin);
    adjustPinRef.current = adjustPin;

    const applyFlyIfNeeded = (map: mapboxgl.Map) => {
        const ft = flyToRef.current;
        if (!ft) return;
        const key = `${ft.lat.toFixed(6)},${ft.lng.toFixed(6)}`;
        if (flyAppliedKeyRef.current === key) return;
        flyAppliedKeyRef.current = key;

        setAdjustPin(false);

        map.flyTo({
            center: [ft.lng, ft.lat],
            zoom: Math.max(map.getZoom(), 15),
            duration: 500,
            essential: true,
        });
        map.once("moveend", () => onFlyToCompleteRef.current?.());
    };

    useLayoutEffect(() => {
        adjustPinRef.current = adjustPin;
    }, [adjustPin]);

    useEffect(() => {
        if (!token || !containerRef.current) return;

        mapboxgl.accessToken = token;
        const map = new mapboxgl.Map({
            container: containerRef.current,
            style: "mapbox://styles/mapbox/streets-v12",
            center: [centerLng, centerLat],
            zoom: 15,
            attributionControl: true,
        });
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
        mapRef.current = map;

        const onMoveEnd = () => {
            const c = map.getCenter();
            onCenterChangeRef.current(c.lat, c.lng);
        };
        map.on("moveend", onMoveEnd);

        map.once("load", () => {
            onMoveEnd();
            applyFlyIfNeeded(map);
        });

        const el = containerRef.current;
        const ro = new ResizeObserver(() => map.resize());
        ro.observe(el);

        return () => {
            ro.disconnect();
            map.off("moveend", onMoveEnd);
            map.remove();
            mapRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- init center only on mount; pan updates via moveend
    }, [token]);

    useEffect(() => {
        flyToRef.current = flyTo;
        if (!flyTo) {
            flyAppliedKeyRef.current = null;
            return;
        }
        const map = mapRef.current;
        if (!map?.isStyleLoaded()) return;
        applyFlyIfNeeded(map);
    }, [flyTo]);

    // Locked until Adjust: no pan/zoom. While adjusting: pan/zoom to place the center pin.
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const syncInteraction = () => {
            const m = mapRef.current;
            if (!m?.isStyleLoaded()) return;
            if (adjustPinRef.current) {
                m.dragPan.enable();
                m.scrollZoom.enable();
                m.boxZoom.enable();
                m.keyboard.enable();
                m.touchZoomRotate.enable();
            } else {
                m.dragPan.disable();
                m.scrollZoom.disable();
                m.boxZoom.disable();
                m.keyboard.disable();
                m.touchZoomRotate.disable();
            }
        };

        if (map.isStyleLoaded()) syncInteraction();
        else map.once("load", syncInteraction);

        return () => {
            map.off("load", syncInteraction);
            const m = mapRef.current;
            if (m?.isStyleLoaded()) {
                m.dragPan.enable();
                m.scrollZoom.enable();
                m.boxZoom.enable();
                m.keyboard.enable();
                m.touchZoomRotate.enable();
            }
        };
    }, [adjustPin]);

    if (!token) {
        return (
            <div
                className={`flex min-h-[200px] items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-4 py-8 text-center text-sm font-medium text-amber-900 ${className}`}
            >
                Add <code className="rounded bg-amber-100 px-1">VITE_MAPBOX_ACCESS_TOKEN</code> to show the map.
            </div>
        );
    }

    return (
        <div className={`relative isolate overflow-hidden rounded-xl border border-gray-200 bg-gray-100 ${className}`}>
            <div ref={containerRef} className="z-0 h-full min-h-[200px] w-full" style={{ minHeight: 200 }} />
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full">
                <div className="flex flex-col items-center">
                    <svg width="36" height="44" viewBox="0 0 24 32" aria-hidden className="drop-shadow-md">
                        <path
                            fill="#16a34a"
                            d="M12 0C7.03 0 3 4.13 3 9.23c0 6.35 9 15.77 9 15.77s9-9.42 9-15.77C21 4.13 16.97 0 12 0z"
                        />
                        <circle cx="12" cy="9" r="3.5" fill="white" />
                    </svg>
                    <div className="h-2 w-2 rounded-full bg-black/25 blur-[1px]" />
                </div>
            </div>
            <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-20 flex flex-col gap-2 bg-gradient-to-t from-white via-white/95 to-transparent px-3 pb-3 pt-10">
                <p className="text-center text-[11px] font-medium text-gray-600">
                    {adjustPin
                        ? "Pan or zoom the map — the pin stays in the center — tap Done when finished"
                        : "Tap Adjust Pin, then drag the map to set your delivery location"}
                </p>
                <button
                    type="button"
                    onClick={() => setAdjustPin((v) => !v)}
                    className="w-full rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-green-700 active:scale-[0.99]"
                >
                    {adjustPin ? "Done" : "Adjust Pin"}
                </button>
            </div>
        </div>
    );
};
