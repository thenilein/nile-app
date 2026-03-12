import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
    return {
        base: './',
        plugins: [react()],
        build: {
            outDir: 'dist',
            sourcemap: mode === 'development' || mode === 'test',
        },
    };
});