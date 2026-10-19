// =====================================================================
// UTILS · ЭКСПОРТ ДОКУМЕНТА В STANDALONE HTML
// =====================================================================

import { renderToStaticMarkup } from "react-dom/server";
import { I18nProvider } from "../i18n/I18nProvider.jsx";
import { DocumentView } from "../doc/DocumentView.jsx";
import { escapeHtml } from "./files.js";
import { pushToast } from "./toast.js";
import { resolveReferences } from "../state/storage.js";
import { makeTranslator } from "../i18n/translate.js";
import { EXPORT_RUNTIME_JS } from "./exportScript.js";

// Достаём CSS, который сейчас в документе (включая токены).
// Используем document.styleSheets — сработает только если приложение
// уже загрузилось. На случай если CSS ещё не прогрузился — fallback
// на window.__INJECTED_CSS__, который main.jsx заполняет.
function getTokensCSS() {
	if (
		typeof globalThis.__INJECTED_CSS__ === "string" &&
		globalThis.__INJECTED_CSS__.length > 0
	) {
		return globalThis.__INJECTED_CSS__;
	}
	// fallback: парсим <style> + <link rel="stylesheet">
	let css = "";
	for (const sheet of document.styleSheets) {
		try {
			for (const rule of sheet.cssRules) {
				css += `${rule.cssText}\n`;
			}
		} catch {
			// cross-origin sheet — пропускаем
		}
	}
	return css;
}

// Экспорт пока только на русском. При добавлении языков — передавать текущую локаль.
const EXPORT_LOCALE = "ru";

export async function exportDocument(project) {
	if (!project) { return; }
	if (typeof renderToStaticMarkup !== "function") {
		pushToast({
			tone: "err",
			msg: makeTranslator(EXPORT_LOCALE).t("export.unavailable"),
		});
		return;
	}
	// Если часть бинарников лежит в IndexedDB — подтянем их в base64,
	// иначе экспорт получит "src=__idbRef:..." и картинки не отобразятся.
	let resolved = project;
	try { resolved = await resolveReferences(project); } catch { /* fallback к project */ }

	const html = renderToStaticMarkup(
		<I18nProvider initialLocale={EXPORT_LOCALE}>
			<DocumentView project={resolved} />
		</I18nProvider>,
	);
	const full = buildExportHTML(html, resolved);
	const blob = new Blob([full], { type: "text/html;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download =
		`${(resolved.meta.showName || "light-note").replaceAll(
			/[^\wа-яА-ЯёЁ0-9_-]+/gi,
			"_",
		)}.html`;
	document.body.append(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildExportHTML(body, project) {
	const { tn } = makeTranslator(EXPORT_LOCALE);
	const title = tn("export.title", project.meta.showName || "Light Note");
	return `<!doctype html>
<html lang="${EXPORT_LOCALE}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
${getTokensCSS()}
body { padding: 0; background: #fff; }
</style>
</head>
<body>
${body}
<script>${EXPORT_RUNTIME_JS}</script>
</body>
</html>`;
}
