// =====================================================================
// UTILS · ПАРСЕР grandMA2 (onPC XML export)
// Принимает текст XML, возвращает { cues, fixtures, warnings, foundInfoTag }.
//
// Извлекаем из <Cue>:
//   - id:      <Number number>
//   - name:    <CuePart name="...">      (preset: multicolor, green, red, blue)
//   - info:    <CueInfo>...</CueInfo>    ⚠️ TODO: точное имя тега — проверить
//   - fadeIn:  <CuePart basic_fade>
//   - trigger: <LoopDestination> → "Loop N", иначе "Go"
//
// fixtures: собираем по первому cue — список fixture_id с их атрибутами.
// =====================================================================

const NS_MA = "http://schemas.malighting.de/grandma2/xml/MA";

// Тег, в котором MA2 хранит текстовое "info" для cue.
// ⚠️ TODO: проверить точное название в реальном MA2 XML —
// может быть <Info>, <CueNote> и т.д. Поменяй INFO_TAG ниже.
const INFO_TAG = "CueInfo";

function getCueInfo(cueEl) {
  const els = cueEl.getElementsByTagNameNS(NS_MA, INFO_TAG);
  if (els.length === 0) return "";
  const el = els[0];
  const direct = Array.from(el.childNodes)
    .filter((n) => n.nodeType === 3)
    .map((n) => n.textContent.trim())
    .filter(Boolean)
    .join(" ");
  return direct || (el.textContent || "").trim();
}

/**
 * @param {string} xmlText
 * @returns {{ cues: Array, fixtures: Array, warnings: string[], foundInfoTag: string|null }}
 */
export function parseMA2(xmlText) {
  const warnings = [];
  if (!xmlText || typeof xmlText !== "string") {
    return { cues: [], fixtures: [], warnings: ["Пустой ввод"], foundInfoTag: null };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");
  const parseErr = doc.querySelector("parsererror");
  if (parseErr) {
    return { cues: [], fixtures: [], warnings: ["Невалидный XML: " + parseErr.textContent.slice(0, 200)], foundInfoTag: null };
  }

  const cueEls = Array.from(doc.getElementsByTagNameNS(NS_MA, "Cue"));
  const cues = [];
  const fixtureMap = new Map();
  let foundInfoTag = null;

  for (const cueEl of cueEls) {
    if (cueEl.getAttribute("xsi:nil") === "true") continue;

    const numEl = cueEl.getElementsByTagNameNS(NS_MA, "Number")[0];
    const num = numEl ? Number(numEl.getAttribute("number")) : null;
    if (num == null) {
      warnings.push(`Cue без <Number>: index=${cueEl.getAttribute("index")}`);
      continue;
    }

    const partEl = cueEl.getElementsByTagNameNS(NS_MA, "CuePart")[0];
    const name = partEl ? (partEl.getAttribute("name") || "") : "";

    const info = getCueInfo(cueEl);
    if (info) foundInfoTag = INFO_TAG;

    let fadeIn = "";
    if (partEl) {
      const f = partEl.getAttribute("basic_fade");
      if (f) fadeIn = String(Number(f));
    }

    let trigger = "Go";
    const loopEl = cueEl.getElementsByTagNameNS(NS_MA, "LoopDestination")[0];
    if (loopEl) {
      trigger = `Loop ${loopEl.getAttribute("number")}`;
    }

    cues.push({ num, name, info, fadeIn, fadeOut: "", trigger });

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
      fixtureMap.get(fid).channels.set(attr, value);
    }
  }

  cues.sort((a, b) => a.num - b.num);

  const fixtures = Array.from(fixtureMap.values())
    .sort((a, b) => Number(a.id) - Number(b.id))
    .map((f) => ({
      id: f.id,
      channels: Array.from(f.channels.entries()).map(([attr, value]) => ({ attr, value })),
    }));

  if (cueEls.length > 0 && !foundInfoTag) {
    warnings.push(`Тег <${INFO_TAG}> не найден ни в одном cue. Проверь точное имя тега в MA2 XML.`);
  }

  return { cues, fixtures, warnings, foundInfoTag };
}
