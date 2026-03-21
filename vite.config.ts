import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Mapbox token for client bundle. Vite only exposes `VITE_*` from .env into import.meta.env.
 * Hosting CI often sets MAPBOX_ACCESS_TOKEN without the prefix — merge here so production builds work.
 */
function resolveMapboxTokenForBundle(mode: string): string {
    const fromFile = loadEnv(mode, process.cwd(), "");
    const pick = (v: string | undefined) => (typeof v === "string" ? v.trim() : "");
    return (
        pick(process.env.VITE_MAPBOX_ACCESS_TOKEN) ||
        pick(process.env.VITE_MAPBOX_TOKEN) ||
        pick(process.env.MAPBOX_ACCESS_TOKEN) ||
        pick(fromFile.VITE_MAPBOX_ACCESS_TOKEN) ||
        pick(fromFile.VITE_MAPBOX_TOKEN) ||
        pick(fromFile.MAPBOX_ACCESS_TOKEN) ||
        ""
    );
}

export default defineConfig(({ mode }) => {
    const mapboxToken = resolveMapboxTokenForBundle(mode);
    return {
        define: {
            __MAPBOX_BUNDLE_TOKEN__: JSON.stringify(mapboxToken),
        },
        base: './',
        plugins: [react()],
        build: {
            outDir: 'dist',
            /** mapbox-gl minifies to ~1.7MB; lazy-loaded but still one chunk */
            chunkSizeWarningLimit: 1800,
            sourcemap: mode === 'development' || mode === 'test',
            rollupOptions: {
                output: {
                    manualChunks(id) {
                        if (!id.includes("node_modules")) return;

                        if (id.includes("react") || id.includes("react-dom") || id.includes("scheduler")) {
                            return "vendor-react";
                        }

                        if (id.includes("react-router")) {
                            return "vendor-router";
                        }

                        if (id.includes("framer-motion")) {
                            return "vendor-motion";
                        }

                        if (id.includes("@supabase")) {
                            return "vendor-supabase";
                        }

                        if (id.includes("mapbox-gl")) {
                            return "vendor-maps";
                        }

                        if (id.includes("recharts")) {
                            return "vendor-charts";
                        }
                    },
                },
            },
        },
    };
});
