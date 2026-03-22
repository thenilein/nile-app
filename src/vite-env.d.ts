/// <reference types="vite/client" />

/** Injected in vite.config (CI + .env aliases). */
declare const __MAPBOX_BUNDLE_TOKEN__: string;

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
    readonly VITE_MAPBOX_ACCESS_TOKEN?: string
    readonly VITE_MAPBOX_TOKEN?: string
    // more env variables...
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
