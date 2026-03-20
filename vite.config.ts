import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
    return {
        base: './',
        plugins: [react()],
        build: {
            outDir: 'dist',
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

                        if (id.includes("leaflet") || id.includes("react-leaflet")) {
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