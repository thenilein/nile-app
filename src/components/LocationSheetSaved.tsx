import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Home, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext.tsx";
import { useLocation, type LocationData } from "../context/LocationContext.tsx";
import { supabase } from "../lib/supabase.ts";
import { LocationSheetInsetList } from "./LocationSheetInsetList.tsx";

type SavedAddressRow = {
    id: string;
    formatted_address: string | null;
    latitude: number | null;
    longitude: number | null;
    street: string | null;
    locality: string | null;
    city: string | null;
    state: string | null;
    address_type: string | null;
};

function savedRowToLocation(row: SavedAddressRow): LocationData | null {
    if (row.latitude == null || row.longitude == null) return null;
    const displayName =
        row.formatted_address?.trim() ||
        [row.street, row.locality, row.city, row.state].filter(Boolean).join(", ") ||
        "Saved address";
    return {
        latitude: row.latitude,
        longitude: row.longitude,
        city: row.city ?? "",
        state: row.state ?? "",
        displayName,
    };
}

function addressTypeLabel(t: string | null): string {
    if (t === "home") return "Home";
    if (t === "work") return "Work";
    return "Saved";
}

/** Saved addresses from Supabase when user is signed in. */
export const LocationSheetSaved: React.FC<{ active: boolean }> = ({ active }) => {
    const { user } = useAuth();
    const { setLocationData } = useLocation();
    const [savedAddresses, setSavedAddresses] = useState<SavedAddressRow[]>([]);
    const [loadingSaved, setLoadingSaved] = useState(false);

    useEffect(() => {
        if (!active || !user?.id) {
            setSavedAddresses([]);
            return;
        }
        let cancelled = false;
        (async () => {
            setLoadingSaved(true);
            const { data, error } = await supabase
                .from("addresses")
                .select(
                    "id, formatted_address, latitude, longitude, street, locality, city, state, address_type"
                )
                .or(`user_id.eq.${user.id},profile_id.eq.${user.id}`)
                .order("created_at", { ascending: false })
                .limit(12);
            if (!cancelled && !error && data) setSavedAddresses(data as SavedAddressRow[]);
            if (!cancelled) setLoadingSaved(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [active, user?.id]);

    const pickLocation = useCallback(
        (data: LocationData) => {
            setLocationData(data);
        },
        [setLocationData]
    );

    const listItems = useMemo(() => {
        return savedAddresses
            .map((row) => {
                const loc = savedRowToLocation(row);
                if (!loc) return null;
                return {
                    id: row.id,
                    title: loc.displayName,
                    subtitle: addressTypeLabel(row.address_type),
                    icon: <Home className="size-4" strokeWidth={2} aria-hidden />,
                    onSelect: () => pickLocation(loc),
                };
            })
            .filter((x): x is NonNullable<typeof x> => x != null);
    }, [savedAddresses, pickLocation]);

    if (!user) return null;

    if (loadingSaved) {
        return (
            <div className="mt-6 flex items-center gap-2 py-3 text-[13px] text-neutral-500">
                <Loader2 className="size-4 shrink-0 animate-spin text-neutral-400" aria-hidden />
                Loading…
            </div>
        );
    }

    if (listItems.length > 0) {
        return <LocationSheetInsetList heading="Saved addresses" items={listItems} />;
    }

    return (
        <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    Saved addresses
                </span>
            </div>
            <p className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-3 py-3 text-[13px] text-neutral-500">
                No saved addresses yet. Search or use GPS, then save at checkout.
            </p>
        </div>
    );
};
