/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
    readonly VITE_MSG91_AUTH_KEY: string
    readonly VITE_MSG91_TEMPLATE_ID: string
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
    numeric?: string
    success?: (data: { message: string; [key: string]: unknown }) => void
    failure?: (error: unknown) => void
}

interface MSG91SendOtp {
    send: (mobile: string, success: (data: any) => void, failure: (error: any) => void) => void
    verify: (otp: string, success: (data: any) => void, failure: (error: any) => void) => void
    retry: (success: (data: any) => void, failure: (error: any) => void) => void
}

interface Window {
    initSendOTP?: (config: MSG91OtpConfig) => void
    sendOtp?: MSG91SendOtp
}
