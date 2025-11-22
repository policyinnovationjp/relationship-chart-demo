import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	// GitHub Pages hosts the app under /relationship-chart-demo, so we need that as the build base
	base: "/relationship-chart-demo/",
});
