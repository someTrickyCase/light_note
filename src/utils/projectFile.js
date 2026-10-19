// =====================================================================
// UTILS · ДАННЫЕ ПРОЕКТА ВНУТРИ ЭКСПОРТИРОВАННОГО HTML
// =====================================================================
// Экспорт — это «картинка» документа. Чтобы его можно было открыть и
// редактировать снова, в него кладётся сам проект:
//   <script type="application/json" id="light-note-project">{ … }</script>
// Браузер такой блок не показывает и не выполняет — это просто данные.
//
// Картинки не дублируются: в данных вместо dataURL стоит "__ref:<key>",
// а сама картинка уже есть в документе — <img data-ln-ref="<key>" src="data:…">.
// Если картинки в разметке нет (документ её не показал), она остаётся в данных как есть.
//
// Чтение: DOMParser разбирает текст файла в документ, НЕ выполняя его скрипты,
// так что чужой файл ничего не может сделать внутри приложения. Берём только
// JSON-блок и src картинок (только data:image/…), потом — та же санитизация,
// что и при загрузке из браузера (state/storage.js).

import { SCHEMA_VERSION } from "../state/model.js";
import { addPhotoSizes, mapBinaries, migrateProject } from "../state/storage.js";

export const DATA_ELEMENT_ID = "light-note-project";
// Версия формата контейнера (обёртки). Версия самого проекта — project.version.
export const FILE_FORMAT = 1;
const REF_PREFIX = "__ref:";

// Причины, по которым файл нельзя открыть. code → текст в словаре (open.error.<code>).
export class ProjectFileError extends Error {
	constructor(code) {
		super(`project file: ${code}`);
		this.name = "ProjectFileError";
		this.code = code;
	}
}

// JSON, безопасный внутри <script>: "</script>" в тексте пользователя иначе
// закрыл бы блок раньше времени. < — тот же «<» для JSON.parse.
function scriptSafeJSON(value) {
	return JSON.stringify(value).replaceAll("<", String.raw`\u003c`);
}

// Блок с данными проекта для экспорта. markup — уже отрендеренный документ:
// картинки, которые в нём есть (data-ln-ref), заменяются ссылками.
export async function renderProjectData(project, markup) {
	const packed = await mapBinaries(project, (value, key) =>
		(markup.includes(`data-ln-ref="${key}"`) ? REF_PREFIX + key : value));
	const data = { app: "light-note", format: FILE_FORMAT, project: packed };
	return `<script type="application/json" id="${DATA_ELEMENT_ID}">${scriptSafeJSON(data)}</script>`;
}

// Только встроенные картинки: никаких http://, javascript: и т.п. из чужого файла
const isImageDataURL = (value) => typeof value === "string" && value.startsWith("data:image/");

function readData(html) {
	const parsed = new DOMParser().parseFromString(html, "text/html");
	const element = parsed.querySelector(`#${DATA_ELEMENT_ID}`);
	if (!element) { throw new ProjectFileError("noData"); }
	let data;
	try {
		data = JSON.parse(element.textContent);
	} catch {
		throw new ProjectFileError("broken");
	}
	if (data?.app !== "light-note" || typeof data.project !== "object" || data.project === null) {
		throw new ProjectFileError("broken");
	}
	if (data.format > FILE_FORMAT || data.project.version > SCHEMA_VERSION) {
		throw new ProjectFileError("newer");
	}
	return { parsed, project: data.project };
}

// Текст экспортированного HTML → проект, готовый для REPLACE.
// Бросает ProjectFileError("noData" | "broken" | "newer").
export async function readProjectFromHTML(html) {
	const { parsed, project } = readData(html);
	const images = new Map();
	for (const img of parsed.querySelectorAll("img[data-ln-ref]")) {
		const key = img.dataset.lnRef;
		const source = img.getAttribute("src");
		if (!images.has(key) && isImageDataURL(source)) { images.set(key, source); }
	}
	// сначала санитизация (битые записи), потом картинки, потом размеры фото
	const resolved = await mapBinaries(migrateProject(project), (value, _key, missing) => {
		if (typeof value === "string" && value.startsWith(REF_PREFIX)) {
			return images.get(value.slice(REF_PREFIX.length)) ?? missing;
		}
		return isImageDataURL(value) ? value : missing;
	});
	return addPhotoSizes({ ...resolved, version: SCHEMA_VERSION });
}
