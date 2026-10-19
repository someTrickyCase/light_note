// =====================================================================
// UTILS · ПАРСЕР grandMA2 (onPC XML export)
// Принимает текст XML, возвращает { cues, fixtures, warnings }.
// warnings — коды { code, detail? }; текст для них — в словаре (ma2.warn.<code>).
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

// Это идентификатор XML-namespace, а не ссылка: строка должна совпадать
// с xmlns в файлах MA2 символ в символ. С https ни один <Cue> не найдётся.
// eslint-disable-next-line unicorn/prefer-https -- namespace URI, не URL
const NS_MA = "http://schemas.malighting.de/grandma2/xml/MA";

// Достаём текст из <Info>...</Info> внутри <InfoItems>.
// В MA2 это структура:
//   <InfoItems><Info date="...">текст ремарки</Info></InfoItems>
function getCueInfoText(cueElement) {
	const itemsElement = cueElement.getElementsByTagNameNS(NS_MA, "InfoItems")[0];
	if (!itemsElement) { return ""; }
	const infoElement = itemsElement.getElementsByTagNameNS(NS_MA, "Info")[0];
	if (!infoElement) { return ""; }
	// текст может быть размазан по дочерним узлам (text + entity refs),
	// собираем все text-ноды
	const parts = [];
	for (const n of infoElement.childNodes) {
		if (n.nodeType === 3) {
			const t = (n.textContent || "").trim();
			if (t) { parts.push(t); }
		}
	}
	return parts.join(" ").trim();
}

// Достаём содержимое <macro_text> внутри первого <CuePart>.
// У cue может быть несколько CuePart — берём первый непустой.
function getCueCmd(cueElement) {
	const parts = cueElement.getElementsByTagNameNS(NS_MA, "CuePart");
	for (const partElement of parts) {
		const mt = partElement.getElementsByTagNameNS(NS_MA, "macro_text")[0];
		if (mt && (mt.textContent || "").trim()) {
			return mt.textContent.trim();
		}
	}
	return "";
}

// <Number number="…"> → число. null — если элемента нет или номер не число.
// (Пустой атрибут даёт 0 — так было всегда, сохраняем.)
function readCueNumber(cueElement) {
	const numberElement = cueElement.getElementsByTagNameNS(NS_MA, "Number")[0];
	if (!numberElement) { return null; }
	const cueNumber = Number(numberElement.getAttribute("number"));
	return Number.isNaN(cueNumber) ? null : cueNumber;
}

// <CuePart basic_fade="…"> первого CuePart → "3" (строкой), иначе "".
function readFade(cueElement) {
	const partElement = cueElement.getElementsByTagNameNS(NS_MA, "CuePart")[0];
	const fade = partElement ? partElement.getAttribute("basic_fade") : null;
	return fade ? String(Number(fade)) : "";
}

// <Trigger type="…"> → "Go" | "Follow" | "Time <data_f>" | другой type как есть.
function readTrigger(cueElement) {
	const triggerElement = cueElement.getElementsByTagNameNS(NS_MA, "Trigger")[0];
	const type = triggerElement ? triggerElement.getAttribute("type") : null;
	if (!type) { return "Go"; }
	if (type === "Time") {
		const data = triggerElement.getAttribute("data_f") || "";
		return data ? `Time ${data}` : "Time";
	}
	return type;
}

// Один <Cue> → объект cue или null, если cue пустой (xsi:nil) или без номера.
function parseCue(cueElement) {
	if (cueElement.getAttribute("xsi:nil") === "true") { return null; }
	const cueNumber = readCueNumber(cueElement);
	if (cueNumber === null) { return null; }
	// В вашем XML <CuePart> не имеет атрибута name, поэтому name берём из <Info>:
	// первая строка или весь текст — практически вся ремарка идёт в name.
	// В reducer/project мы храним оба поля; в редактор выведем name (=info целиком)
	// и оставим info как расширенное описание (=тот же текст для совместимости).
	const info = getCueInfoText(cueElement);
	return { num: cueNumber, name: info, info, cmd: getCueCmd(cueElement), fade: readFade(cueElement), trigger: readTrigger(cueElement) };
}

// fixtures — собираем каналы по всем cue (получаем полный набор атрибутов).
// Для каждого fixture_id + атрибута запоминается первое встреченное значение.
function collectChannels(cueElement, fixtureMap) {
	for (const dataElement of cueElement.getElementsByTagNameNS(NS_MA, "CueData")) {
		const channelElement = dataElement.getElementsByTagNameNS(NS_MA, "Channel")[0];
		const valueElement = dataElement.getElementsByTagNameNS(NS_MA, "Value")[0];
		const fid = channelElement?.getAttribute("fixture_id");
		const attribute = channelElement?.getAttribute("attribute_name");
		if (valueElement && fid && attribute) {
			if (!fixtureMap.has(fid)) { fixtureMap.set(fid, { id: fid, channels: new Map() }); }
			const channels = fixtureMap.get(fid).channels;
			if (!channels.has(attribute)) { channels.set(attribute, (valueElement.textContent || "").trim()); }
		}
	}
}

/**
 * @param {string} xmlText
 * @returns {{ cues: Array, fixtures: Array, warnings: Array<{ code: string, detail?: string }> }}
 */
export function parseMA2(xmlText) {
	if (!xmlText || typeof xmlText !== "string") {
		return { cues: [], fixtures: [], warnings: [{ code: "empty" }] };
	}

	const xml = new DOMParser().parseFromString(xmlText, "application/xml");
	const parseError = xml.querySelector("parsererror");
	if (parseError) {
		return { cues: [], fixtures: [], warnings: [{ code: "invalidXml", detail: parseError.textContent.slice(0, 200) }] };
	}

	const cueElements = [...xml.getElementsByTagNameNS(NS_MA, "Cue")];
	const cues = [];
	const fixtureMap = new Map();
	for (const cueElement of cueElements) {
		const cue = parseCue(cueElement);
		if (cue) {
			cues.push(cue);
			collectChannels(cueElement, fixtureMap);
		}
	}
	cues.sort((a, b) => a.num - b.num);

	const fixtures = [...fixtureMap.values()].map((f) => ({
		id: f.id,
		channels: [...f.channels.entries()].map(([attribute, value]) => ({ attr: attribute, value })),
	}));
	fixtures.sort((a, b) => Number(a.id) - Number(b.id));

	const warnings = cueElements.length === 0 ? [{ code: "noCues" }] : [];
	return { cues, fixtures, warnings };
}
