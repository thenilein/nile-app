import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Home, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext.tsx";
import { useLocation, type LocationData } from "../context/LocationContext.tsx";
import {
    fetchUserSavedAddresses,
    savedAddressToLocation,
    savedAddressTypeLabel,
    type SavedAddressRow,
} from "../lib/savedAddresses.ts";
import { LocationSheetInsetList } from "./LocationSheetInsetList.tsx";

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
            const data = await fetchUserSavedAddresses(user.id);
            if (!cancelled) setSavedAddresses(data);
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
                const loc = savedAddressToLocation(row);
                if (!loc) return null;
                return {
                    id: row.id,
                    title: loc.displayName,
                    subtitle: savedAddressTypeLabel(row.address_type, {
                        otherLabel: "Saved",
                        unknownLabel: "Saved",
                    }),
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
