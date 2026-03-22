import React from "react";
import { LocationPickerSheet } from "./LocationPickerSheet.tsx";
import { SheetBottomShell } from "./SheetBottomShell.tsx";
import { useAuth } from "../context/AuthContext.tsx";

export type AccountSheetProps = {
    isOpen: boolean;
    onClose: () => void;
};

/**
 * Profile sheet: guests use the same `LocationPickerSheet` auth stack as landing (embedded `SheetLoginStep`);
 * signed-in → `SheetBottomShell`.
 */
export const AccountSheet: React.FC<AccountSheetProps> = ({ isOpen, onClose }) => {
    const { user, signOut } = useAuth();

    return (
        <>
            <LocationPickerSheet
                isOpen={Boolean(isOpen && !user)}
                onClose={onClose}
                authGate
                authOnly
                authSubtitle="Use your phone number to continue"
            />

            <SheetBottomShell
                isOpen={Boolean(isOpen && user)}
                onClose={onClose}
                header="title-row"
                title="Account"
                panelClassName="shadow-[0_-18px_48px_rgba(15,23,42,0.18)]"
            >
                <p className="text-[14px] text-[#6B7280]">
                    Signed in as{" "}
                    <span className="font-medium text-[#111827]">
                        {user?.phone ||
                            (user?.user_metadata?.phone as string | undefined) ||
                            user?.email ||
                            "Member"}
                    </span>
                </p>
                <button
                    type="button"
                    onClick={async () => {
                        await signOut();
                        onClose();
                    }}
                    className="w-full rounded-xl border border-red-200 bg-red-50 py-3.5 text-[15px] font-semibold text-red-700 transition-colors hover:bg-red-100"
                >
                    Sign out
                </button>
            </SheetBottomShell>
        </>
    );
};
