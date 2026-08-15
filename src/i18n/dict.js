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
		"app.actions.export": "Скачать HTML",
		"app.actions.print": "Печать / PDF",
		"app.actions.new": "Новый",
		"app.status.saved": "Сохранено локально",
		"app.status.unsaved": "Не сохранено",

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
			"Capture · JPG · плoт пустой сцены для понимания геометрии",
		"plots.show": "Развес спектакля",
		"plots.show.help": "Capture · JPG · размеченный плoт с расстановкой",
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
		"cues.import.ok": "Импортировано {n} сцен из MA2 XML",
		"cues.import.warn": "Импорт выполнен с предупреждениями: {n}",
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
		"cues.search.empty": "Ничего не найдено по запросу «{q}»",
		"cues.summary": (n, total) => `Показано ${n} из ${total}`,
		"cues.expand": "Развернуть",
		"cues.collapse": "Свернуть",

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

		"quota.aria": "Индикатор занятого места в браузере",
		"quota.tip.ok.idle": "Запас места в браузере (зелёный)",
		"quota.tip.warn.idle": "Места в браузере становится меньше (жёлтый)",
		"quota.tip.err.idle": "Место в браузере почти исчерпано (красный)",
		"quota.tip.ok.active": "Места достаточно — всё ок",
		"quota.tip.warn.active": "Места становится меньше — стоит удалить старые фото",
		"quota.tip.err.active": "Место почти исчерпано — следующая загрузка может не сохраниться",
		"quota.toast.warn":
			"⚠ В браузере осталось меньше половины места для фото. Удалите лишние или сделайте экспорт.",
		"quota.toast.err":
			"🔴 Место в браузере почти исчерпано. Сохранение следующих фото может не удаться. Сделайте экспорт.",
		"common.moveUp": "Выше",
		"common.moveDown": "Ниже",
		"common.confirmNew":
			"Начать новое шоу? Текущие данные будут заменены пустыми.",
	},
};
