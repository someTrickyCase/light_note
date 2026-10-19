import fs from "node:fs";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Тесты идут в настоящем браузере (Vitest browser mode + Playwright):
// IndexedDB, Blob, FileReader, DOMParser — настоящие, без jsdom/linkedom.
// Браузер: CHROMIUM_PATH, иначе Brave из snap, иначе Chromium самого Playwright
// (`npx playwright install chromium`).
const BRAVE = "/snap/brave/current/opt/brave.com/brave/brave";
const executablePath = process.env.CHROMIUM_PATH || (fs.existsSync(BRAVE) ? BRAVE : undefined);

export default defineConfig({
	plugins: [react()],
	test: {
		include: ["tests/**/*.test.{js,jsx}"],
		browser: {
			enabled: true,
			provider: "playwright",
			headless: true,
			screenshotFailures: false,
			instances: [
				{ browser: "chromium", launch: { executablePath, args: ["--no-sandbox"] } },
			],
		},
		coverage: {
			provider: "v8",
			// Пока покрыт слой хранения (этап 1). Новые модули добавлять сюда вместе с тестами.
			include: [
				"src/state/storage.js",
				"src/state/idb.js",
				"src/utils/storageQuota.js",
				"src/utils/useQuotaWatch.js",
				"src/components/QuotaLights.jsx",
			],
			reporter: ["text", "html"],
			thresholds: { lines: 95, functions: 95, branches: 95, statements: 95 },
		},
	},
});
