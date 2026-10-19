// Стабильные ключи картинок проекта. Одни и те же имена используют:
// IDB (state/storage.js), разметка документа (data-ln-ref в doc/*) и данные
// внутри экспорта (utils/projectFile.js). Чистый модуль — его можно импортировать из doc/.
export const imageKey = {
	photo: (id) => `photo:${id}`,
	plot: (which) => `plot:${which}`,
	logo: "logo",
};
