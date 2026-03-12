/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
    readonly VITE_MSG91_WIDGET_ID: string
    readonly VITE_MSG91_TOKEN_AUTH?: string
    readonly VITE_MSG91_AUTH_KEY: string
    // more env variables...
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

// MSG91 OTP Web SDK globals
interface MSG91OtpConfig {
    widgetId: string
    tokenAuth: string
    identifier?: string
    exposeMethods?: boolean
    captchaRenderId?: string
    numeric?: string
    success?: (data: { message: string; [key: string]: unknown }) => void
    failure?: (error: unknown) => void
}

interface MSG91SendOtpFn {
    (
        identifier: string,
        onSuccess?: (data: unknown) => void,
        onError?: (error: unknown) => void,
        reqId?: string
    ): void
    retryOtp?: (
        channel?: string | null,
        onSuccess?: (data: unknown) => void,
        onError?: (error: unknown) => void,
        reqId?: string
    ) => void
    verifyOtp?: (
        otp: string | number,
        onSuccess?: (data: unknown) => void,
        onError?: (error: unknown) => void,
        reqId?: string
    ) => void
}

interface Window {
    initSendOTP?: (config: MSG91OtpConfig) => void
    isCaptchaVerified?: () => boolean
    getWidgetData?: () => unknown
    // Web SDK custom UI helpers (see MSG91 docs)
    sendOtp?: MSG91SendOtpFn
    retryOtp?: (
        channel: string | null,
        onSuccess?: (data: unknown) => void,
        onError?: (error: unknown) => void,
        reqId?: string
    ) => void
    verifyOtp?: (
        otp: string | number,
        onSuccess?: (data: unknown) => void,
        onError?: (error: unknown) => void,
        reqId?: string
    ) => void
}
