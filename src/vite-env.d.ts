/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
    // more env variables...
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

// MSG91 OTP Web SDK globals
interface MSG91OtpConfig {
    widgetId: string
    tokenAuth: string
    identifier: string
    exposeMethods?: boolean
    success?: (data: { message: string; [key: string]: unknown }) => void
    failure?: (error: unknown) => void
}

interface MSG91SendOtp {
    verifyOtp: (otp: string) => void
    retryOtp: () => void
}

interface Window {
    initSendOTP?: (config: MSG91OtpConfig) => void
    sendOtp?: MSG91SendOtp
}
