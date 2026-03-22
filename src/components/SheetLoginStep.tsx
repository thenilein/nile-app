import React from "react";
import { Loader2 } from "lucide-react";
import { PhoneOtpAuthFlow } from "./PhoneOtpAuthFlow.tsx";
import type { ToastFn } from "../lib/msg91Otp.ts";

export type SheetLoginStepProps = {
    /** When false, PhoneOtpAuthFlow resets internal state */
    active: boolean;
    /** Session bootstrap: show spinner instead of the OTP UI */
    authLoading: boolean;
    showToast: ToastFn;
    onAuthenticated: () => void;
    onGuestSkip?: () => void;
    syncPendingCheckoutEvent?: boolean;
    /** Passed through to PhoneOtpAuthFlow */
    otpFlowVariant?: "embedded" | "sheet";
    loadingMessage?: string;
};

/**
 * Shared sign-in panel for bottom sheets: session check spinner + phone OTP flow.
 * Use from landing location sheet (auth gate), checkout step 0, profile/login sheet, etc.
 */
export const SheetLoginStep: React.FC<SheetLoginStepProps> = ({
    active,
    authLoading,
    showToast,
    onAuthenticated,
    onGuestSkip,
    syncPendingCheckoutEvent = false,
    otpFlowVariant = "embedded",
    loadingMessage = "Checking your session…",
}) => {
    if (authLoading) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-green-600" />
                <p className="text-sm font-medium text-gray-600">{loadingMessage}</p>
            </div>
        );
    }

    return (
        <PhoneOtpAuthFlow
            active={active && !authLoading}
            showToast={showToast}
            variant={otpFlowVariant}
            syncPendingCheckoutEvent={syncPendingCheckoutEvent}
            onAuthenticated={onAuthenticated}
            onGuestSkip={onGuestSkip}
        />
    );
};
