// =====================================================================
// UTILS · ПАРСЕР grandMA2 (onPC XML export)
// Принимает текст XML, возвращает { cues, fixtures, warnings }.
//
// Извлекаем из <Cue>:
//   - num:   <Number number>
//   - name:  <Info> внутри <InfoItems> (это «название» — ремарка художника)
//   - info:  то же содержимое <Info> (полный текст, описание)
//   - cmd:   <macro_text> внутри <CuePart> (макросы onPC)
//   - fade:  <CuePart basic_fade>
//   - trigger: <Trigger type="...">  → Follow/Time/etc, иначе "Go"
//
// fixtures: собираем по первому cue — список fixture_id с их атрибутами.
// =====================================================================

const NS_MA = "http://schemas.malighting.de/grandma2/xml/MA";

// Достаём текст из <Info>...</Info> внутри <InfoItems>.
// В MA2 это структура:
//   <InfoItems><Info date="...">текст ремарки</Info></InfoItems>
function getCueInfoText(cueEl) {
	const itemsEl = cueEl.getElementsByTagNameNS(NS_MA, "InfoItems")[0];
	if (!itemsEl) return "";
	const infoEl = itemsEl.getElementsByTagNameNS(NS_MA, "Info")[0];
	if (!infoEl) return "";
	// текст может быть размазан по дочерним узлам (text + entity refs),
	// собираем все text-ноды
	const parts = [];
	for (const n of infoEl.childNodes) {
		if (n.nodeType === 3) {
			const t = (n.textContent || "").trim();
			if (t) parts.push(t);
		}
	}
	return parts.join(" ").trim();
}

// Достаём содержимое <macro_text> внутри первого <CuePart>.
// У cue может быть несколько CuePart — берём первый непустой.
function getCueCmd(cueEl) {
	const parts = cueEl.getElementsByTagNameNS(NS_MA, "CuePart");
	for (const partEl of parts) {
		const mt = partEl.getElementsByTagNameNS(NS_MA, "macro_text")[0];
		if (mt && (mt.textContent || "").trim()) {
			return mt.textContent.trim();
		}
	}
	return "";
}

/**
 * @param {string} xmlText
 * @returns {{ cues: Array, fixtures: Array, warnings: string[] }}
 */
export function parseMA2(xmlText) {
	const warnings = [];
	if (!xmlText || typeof xmlText !== "string") {
		return { cues: [], fixtures: [], warnings: ["Пустой ввод"] };
	}

	const parser = new DOMParser();
	const doc = parser.parseFromString(xmlText, "application/xml");
	const parseErr = doc.querySelector("parsererror");
	if (parseErr) {
		return { cues: [], fixtures: [], warnings: ["Невалидный XML: " + parseErr.textContent.slice(0, 200)] };
	}

	const cueEls = Array.from(doc.getElementsByTagNameNS(NS_MA, "Cue"));
	const cues = [];
	const fixtureMap = new Map();

	for (const cueEl of cueEls) {
		if (cueEl.getAttribute("xsi:nil") === "true") continue;

		const numEl = cueEl.getElementsByTagNameNS(NS_MA, "Number")[0];
		const num = numEl ? Number(numEl.getAttribute("number")) : null;
		if (num == null || Number.isNaN(num)) continue;

		// В вашем XML <CuePart> не имеет атрибута name, поэтому name берём из <Info>:
		// первая строка или весь текст — практически вся ремарка идёт в name.
		// В reducer/project мы храним оба поля; в редактор выведем name (=info целиком)
		// и оставим info как расширенное описание (=тот же текст для совместимости).
		const info = getCueInfoText(cueEl);
		const cmd = getCueCmd(cueEl);

		// fade
		let fade = "";
		const partEl = cueEl.getElementsByTagNameNS(NS_MA, "CuePart")[0];
		if (partEl) {
			const f = partEl.getAttribute("basic_fade");
			if (f) fade = String(Number(f));
		}

		// trigger
		let trigger = "Go";
		const trigEl = cueEl.getElementsByTagNameNS(NS_MA, "Trigger")[0];
		if (trigEl) {
			const type = trigEl.getAttribute("type");
			if (type === "Follow") trigger = "Follow";
			else if (type === "Time") {
				const data = trigEl.getAttribute("data_f") || "";
				trigger = data ? `Time ${data}` : "Time";
			} else if (type) trigger = type;
		}

		cues.push({ num, name: info, info, cmd, fade, trigger });

		// fixtures — собираем каналы по всем cue (получаем полный набор атрибутов)
		const dataEls = cueEl.getElementsByTagNameNS(NS_MA, "CueData");
		for (const dataEl of dataEls) {
			const chEl = dataEl.getElementsByTagNameNS(NS_MA, "Channel")[0];
			const valEl = dataEl.getElementsByTagNameNS(NS_MA, "Value")[0];
			if (!chEl || !valEl) continue;
			const fid = chEl.getAttribute("fixture_id");
			const attr = chEl.getAttribute("attribute_name");
			const value = (valEl.textContent || "").trim();
			if (!fid || !attr) continue;
			if (!fixtureMap.has(fid)) fixtureMap.set(fid, { id: fid, channels: new Map() });
			const f = fixtureMap.get(fid);
			if (!f.channels.has(attr)) f.channels.set(attr, value);
		}
	}

	cues.sort((a, b) => a.num - b.num);

	const fixtures = Array.from(fixtureMap.values())
		.sort((a, b) => Number(a.id) - Number(b.id))
		.map((f) => ({
			id: f.id,
			channels: Array.from(f.channels.entries()).map(([attr, value]) => ({ attr, value })),
		}));

	if (cueEls.length === 0) {
		warnings.push("В XML не найдено ни одного <Cue>. Проверь, что это экспорт sequence, а не fixture library.");
	}

	return { cues, fixtures, warnings };
}
