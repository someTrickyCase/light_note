// =====================================================================
// I18N · СЛОВАРЬ ПЕРЕВОДОВ
// Добавить язык: скопировать блок DICT.ru, переименовать ключ, перевести.
// Документация: docs/I18N.md
// =====================================================================

export const SUPPORTED_LOCALES = ["ru"];

export const DICT = {
	ru: {
		"app.name": "Light Note",
		"app.tagline": "редактор технической документации шоу",
		"app.status.saved": "Сохранено локально",
		"app.status.unsaved": "Не сохранено",

		"menu.main": "Меню",
		"menu.import": "Импорт",
		"menu.exportGroup": "Экспорт",
		"menu.theme": "Тема",
		"menu.font": "Шрифт",
		"appearance.theme.graphite": "Графит",
		"appearance.theme.midnight": "Полночь",
		"appearance.theme.tungsten": "Вольфрам",
		"appearance.theme.light": "Светлая",
		"appearance.theme.paper": "Бумага",
		"appearance.font.sans": "Без засечек",
		"appearance.font.serif": "С засечками",

		"menu.new": "Новый проект",
		"menu.open": "Открыть HTML…",
		"menu.export": "Скачать HTML",
		"menu.print": "Печать / PDF",

		"replace.title": "Заменить текущий проект?",
		"replace.unnamed": "без названия",
		"replace.text.new": (current) =>
			`Текущий проект «${current}» будет удалён из браузера. Скачайте его как HTML — потом его можно снова открыть и редактировать.`,
		"replace.text.open": (file, current) =>
			`Откроется «${file}». Текущий проект «${current}» будет заменён. Скачайте его как HTML, чтобы не потерять.`,
		"replace.save": "Скачать текущий и продолжить",
		"replace.discard": "Продолжить без сохранения",

		"open.ok": (file) => `Открыт проект из «${file}»`,
		"open.error.noData":
			"В этом файле нет данных проекта. Открыть можно только HTML, скачанный из Light Note (начиная с этой версии).",
		"open.error.broken": "Файл повреждён: данные проекта не читаются.",
		"open.error.newer": "Файл сделан более новой версией Light Note. Обновите приложение, чтобы открыть его.",
		"open.error.notHtml": "Это не HTML-файл. Чтобы открыть проект, перетащите .html, скачанный из Light Note. Фото добавляйте в разделе «Галерея».",
		"open.error.failed": (message) => `Не удалось открыть файл: ${message}`,
		"app.logo.left": "LIGHT",
		"app.logo.right": "NOTE",
		"app.loading": "Загружаем проект…",
		"app.frame.title": (name) => `light-note · ${name || "новое шоу"}`,

		"storage.toast.quota":
			"Не удалось сохранить в браузер: переполнение. Сократите число фото или их размер.",
		"storage.toast.error": (message) => `Ошибка сохранения: ${message}`,
		"storage.toast.loadFailed": (message) =>
			`Не удалось прочитать проект из браузера (${message}). Изменения НЕ сохраняются — сделайте экспорт HTML.`,

		"export.title": (name) => `${name} · техническая документация`,

		"editor.heading": "Параметры шоу",
		"editor.meta": "Общие сведения",
		"editor.times": "Время",
		"editor.plots": "Развес",
		"editor.gallery": "Фото приборов",
		"editor.fixtures": "Приборы для довеса",
		"editor.cues": "Список сцен",
		"editor.commentary": "Заметки художника",

		"meta.showName": "Название шоу",
		"meta.showName.ph": "например, «Северная сказка»",
		"meta.venue": "Площадка",
		"meta.venue.ph": "театр, зал, город",
		"meta.date": "Дата премьеры / прогона",
		"meta.ld": "Художник по свету",
		"meta.ld.ph": "ФИО",
		"meta.director": "Режиссёр",
		"meta.director.ph": "ФИО",
		"meta.console": "Пульт",
		"meta.console.ph": "grandMA2, ETC Eos, …",
		"meta.logo": "Логотип проката / театра",
		"meta.logo.help": "PNG / SVG · отображается в нижнем колонтитуле документа",
		"meta.logo.upload": "Загрузить логотип",
		"meta.logo.alt": "логотип",

		"drop.default": "Перетащите файлы сюда или нажмите для выбора",
		"drop.busy": "Обработка…",
		"drop.error": (message) => `Не удалось обработать файл: ${message}`,

		"times.installation": "Время на монтаж",
		"times.installation.ph": "например, 2 ч 30 мин",
		"times.focus": "Время на направку",
		"times.focus.ph": "например, 3 ч 20 мин",
		"times.runtime": "Хронометраж шоу",
		"times.runtime.ph": "например, 1 ч 45 мин",
		"times.staff": "Персонал по специальностям",
		"staff.add": "Добавить специальность",
		"staff.empty":
			"Список пуст. Добавьте специальности (видеограф, пушкарь, …) и количество людей.",
		"staff.role.ph": "Специальность (видеограф, пушкарь, …)",
		"staff.qty.ph": "Кол‑во",
		"staff.total": (n) => `Всего: ${n} чел.`,
		"times.installation.note":
			"при условии, что световой развес зала соответствует стандартному",
		"times.focus.note":
			"при указанном кол-ве персонала и соотвествию развеса, необходимому для на шоу",
		"plots.base": "Базовый развес площадки",
		"plots.base.help":
			"Capture · JPG · Стационарный развес площадки (без довешиваемого оборудования)",
		"plots.show": "Развес спектакля",
		"plots.show.help": "Capture · JPG · Развес, необходимый для шоу",
		"plots.replace": "Заменить",
		"plots.clear": "Удалить",

		"gallery.drop": "Перетащите фото сюда или нажмите для выбора",
		"gallery.drop.help":
			"JPG / PNG · несколько файлов · подписи и привязка к приборам задаются ниже",
		"gallery.empty": "Фото не загружены",
		"gallery.tag.ph":
			"Прибор / позиция (например, Mac Quantum #5, FOH truss 3)",
		"gallery.caption.ph": "Подпись (опционально)",
		"gallery.count": (n) => `${n} фото`,
		"gallery.clearAll": "Удалить все",
		"gallery.confirmClear": "Удалить все фотографии? Это действие нельзя отменить.",
		"gallery.clearAll.confirm": "Точно удалить все?",
		"lightbox.prev": "Предыдущее",
		"lightbox.next": "Следующее",
		// формат счётчика повторён в utils/exportScript.js — менять вместе
		"lightbox.count": (current, total) => `${current} / ${total}`,

		"fixtures.add": "Добавить прибор",
		"fixtures.type.ph": "Название / модель (Source Four 26°, Mac Quantum, …)",
		"fixtures.qty.ph": "Кол‑во",
		"fixtures.info.ph": "Гобо, ирис, лира, DMX-адрес, заметки…",
		"fixtures.empty": "Список пуст. Добавьте хотя бы один тип приборов.",
		"fixtures.total": (n) => `Всего: ${n} шт.`,
		"fixtures.col.type": "Название",
		"fixtures.col.qty": "Кол‑во",
		"fixtures.col.info": "Доп. информация",
		"fixtures.expand": "Развернуть",
		"fixtures.collapse": "Свернуть",

		"cues.add": "Добавить сцену",
		"cues.empty":
			"Список сцен пуст. Нажмите «Добавить сцену», чтобы внести первую запись.",
		"cues.import": "Импорт из MA2 XML",
		"cues.import.hint": "Выберите XML, экспортированный из grandMA2 onPC (Sequence → Export → XML).",
		"cues.import.ok": (n) => `Импортировано ${n} сцен из MA2 XML`,
		"cues.import.fail": (reason) => `Не удалось извлечь сцены из XML: ${reason || "пустой результат"}`,
		"cues.import.readError": (message) => `Ошибка чтения файла: ${message}`,
		"cues.hasCmd": "есть cmd",
		"cues.info.ph": "Описание сцены",
		"cues.col.num": "№",
		"cues.col.name": "Название",
		"cues.col.info": "Описание",
		"cues.col.cmd": "Cmd",
		"cues.col.trigger": "Триггер",
		"cues.name.ph": "например, Открытие",
		"cues.fade.ph": "0.0",
		"cues.cmd.ph": "On Executor 1.…; Executor 1.… At 100 Fade 3",
		"cues.trigger.ph": "Go / Follow / Time",
		"cues.search.ph": "Поиск по сценам (название, описание, cmd)",
		"cues.search.empty": (q) => `Ничего не найдено по запросу «${q}»`,
		"cues.summary": (n, total) => `Показано ${n} из ${total}`,
		"cues.expand": "Развернуть",
		"cues.collapse": "Свернуть",

		"ma2.warn.empty": "Пустой ввод",
		"ma2.warn.invalidXml": (detail) => `Невалидный XML: ${detail}`,
		"ma2.warn.noCues":
			"В XML не найдено ни одного <Cue>. Проверь, что это экспорт sequence, а не fixture library.",

		"md.toolbar": "Форматирование",
		"md.hint": "Markdown:",
		"md.bold.label": "B",
		"md.bold.title": "Жирный: **текст**",
		"md.bold.ph": "жирный",
		"md.italic.label": "I",
		"md.italic.title": "Курсив: _текст_",
		"md.italic.ph": "курсив",
		"md.h3.label": "H3",
		"md.h3.title": "Заголовок: ### текст (с новой строки)",
		"md.h3.ph": "заголовок",
		"md.ul.title": "Маркированный список: - пункт (с новой строки)",
		"md.ul.ph": "пункт",
		"md.quote.title": "Цитата: > текст (с новой строки)",
		"md.quote.ph": "цитата",
		"md.link.title": "Ссылка: [текст](https://...)",
		"md.link.ph": "текст",
		"md.code.ph": "код",

		"commentary.ph":
			"Свободный текст · переносы строк сохраняются. Можно описывать драматургию света, технические нюансы, согласования с режиссёром и т.п.",

		"doc.kick": "Техническая документация",
		"doc.showLabel": "Название шоу",
		"doc.times.focus": "Направка",
		"doc.times.installation": "Монтаж",
		"doc.times.runtime": "Хронометраж",
		"doc.times.staff": "Персонал",
		"doc.times.staff.role": "Специальность",
		"doc.times.staff.qty": "Кол‑во",
		"doc.times.staff.total": "Всего",
		"doc.section.plots": "Развес",
		"doc.section.gallery": "Галерея приборов",
		"doc.section.fixtures": "Приборы для довеса",
		"doc.section.cues": "Список сцен",
		"doc.section.commentary": "Заметки художника",
		"doc.foot.left": (name) => name || "Без названия",
		"doc.foot.right": "",

		"common.delete": "Удалить",
		"common.close": "Закрыть",
		"common.cancel": "Отмена",
		"common.replace": "Заменить",
		"common.zoom": "Увеличить",

		"unit.b": "Б",
		"unit.kb": "КБ",
		"unit.mb": "МБ",
		"unit.gb": "ГБ",

		"storage.lowSpace": (free) =>
			`Место в браузере заканчивается: осталось ${free}. Новые фото могут не сохраниться. Удалите лишние фото и сделайте экспорт HTML как резервную копию.`,
		"common.moveUp": "Выше",
		"common.moveDown": "Ниже",
	},
};
