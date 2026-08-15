import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: './' — относительные пути, чтобы работало через file:// и в подпапке.
//
// build.rollupOptions.output.format: 'iife' — ВСЁ в одном JS, без ES modules.
// (Chrome/Brave блокируют import'ы на file://, но обычные <script> — нет.)
//
// html-plugin inline CSS: собираем весь CSS в <style> прямо в <head>.
// В build не будет отдельного .css файла → нет внешних запросов →
// работает через file:// надёжно.
function inlineCssPlugin() {
	return {
		name: "inline-css",
		apply: "build",
		transformIndexHtml: {
			order: "post",
			handler(html, ctx) {
				// собираем все chunk'и которые являются CSS
				const css = Object.values(ctx.bundle || {})
					.filter((c) => c.type === "asset" && /\.css$/.test(c.fileName))
					.map((c) => c.source)
					.join("\n");
				// убираем <link rel="stylesheet" href="..."> вставляем <style>...</style>
				return html
					.replace(/<link[^>]+rel="stylesheet"[^>]*>/g, "")
					.replace("</head>", `<style>${css}</style></head>`);
			},
		},
	};
}

export default defineConfig({
	plugins: [react(), inlineCssPlugin()],
	base: "./",
	server: { port: 5173 },
	build: {
		outDir: "dist",
		sourcemap: false,
		assetsDir: "assets",
		assetsInlineLimit: 100 * 1024 * 1024,
		cssCodeSplit: false,
		rollupOptions: {
			output: {
				format: "iife",
				inlineDynamicImports: true,
				assetFileNames: "light-note.[ext]",
				entryFileNames: "light-note.js",
				chunkFileNames: "light-note.[ext]",
			},
		},
	},
});
