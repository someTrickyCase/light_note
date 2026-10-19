// =====================================================================
// ВЕРХНЯЯ ПАНЕЛЬ: одно меню справа — импорт (новый / открыть HTML),
// экспорт (скачать HTML / печать), тема и шрифт. Без значков в списке.
// =====================================================================
// Открыть проект можно из меню или бросив .html на окно. Порядок важен:
// сначала файл читается и проверяется (utils/projectFile.js), и только потом
// спрашиваем, заменять ли текущий проект — битый файл ничего не испортит.
// Пустой проект заменяется без вопросов.

import { useRef, useState } from "react";
import { useT } from "./i18n/I18nProvider.jsx";
import { useDispatch, useProject } from "./state/ProjectProvider.jsx";
import { emptyProject, isEmptyProject } from "./state/model.js";
import { pushToast } from "./utils/toast.js";
import { exportDocument } from "./utils/exportHtml.jsx";
import { ProjectFileError, readProjectFromHTML } from "./utils/projectFile.js";
import { isHtmlFile, useHtmlDrop } from "./utils/useHtmlDrop.js";
import { FONTS, THEMES, useAppearance } from "./utils/appearance.js";
import { ChoiceDialog } from "./components/ChoiceDialog.jsx";
import { Menu } from "./components/Menu.jsx";

function openErrorMessage(tn, error) {
	if (error instanceof ProjectFileError) { return tn(`open.error.${error.code}`); }
	return tn("open.error.failed", error.message || String(error));
}

// pending: что поставить вместо текущего проекта, пока пользователь решает.
// { project, fileName } — открытый файл; fileName = null — «Новый проект».
function useProjectReplace() {
	const { tn } = useT();
	const current = useProject();
	const dispatch = useDispatch();
	const [pending, setPending] = useState(null);

	const apply = ({ project, fileName }) => {
		setPending(null);
		dispatch({ type: "REPLACE", project });
		if (fileName) { pushToast({ tone: "ok", msg: tn("open.ok", fileName) }); }
	};
	const request = (next) => {
		if (isEmptyProject(current)) { apply(next); } else { setPending(next); }
	};
	const openFile = async (file) => {
		// в диалоге выбора можно переключить фильтр на «все файлы» — фото сюда не по адресу
		if (!isHtmlFile(file)) {
			pushToast({ tone: "err", msg: tn("open.error.notHtml") });
			return;
		}
		try {
			const project = await readProjectFromHTML(await file.text());
			request({ project, fileName: file.name });
		} catch (error) {
			pushToast({ tone: "err", ttl: 0, msg: openErrorMessage(tn, error) });
		}
	};
	const saveThenApply = async () => {
		await exportDocument(current);
		apply(pending);
	};
	return { current, pending, request, openFile, apply, saveThenApply, cancel: () => setPending(null) };
}

export function Topbar() {
	const { t, tn } = useT();
	const inputRef = useRef(null);
	const { current, pending, request, openFile, apply, saveThenApply, cancel } = useProjectReplace();
	const { theme, font, setTheme, setFont } = useAppearance();

	useHtmlDrop((file) => {
		if (file) { openFile(file); } else { pushToast({ tone: "err", msg: t("open.error.notHtml") }); }
	});

	const currentName = current.meta.showName || t("replace.unnamed");
	const menuItems = [
		{ heading: t("menu.import"), id: "h-import" },
		{ label: t("menu.new"), onSelect: () => request({ project: emptyProject(), fileName: null }) },
		{ label: t("menu.open"), onSelect: () => inputRef.current.click() },
		{ separator: true, id: "sep-export" },
		{ heading: t("menu.exportGroup"), id: "h-export" },
		{ label: t("menu.export"), onSelect: () => exportDocument(current) },
		{ label: t("menu.print"), onSelect: () => globalThis.print() },
		{ separator: true, id: "sep-theme" },
		{ heading: t("menu.theme"), id: "h-theme" },
		...THEMES.map((id) => ({ label: t(`appearance.theme.${id}`), checked: theme === id, onSelect: () => setTheme(id) })),
		{ separator: true, id: "sep-font" },
		{ heading: t("menu.font"), id: "h-font" },
		...FONTS.map((id) => ({ label: t(`appearance.font.${id}`), checked: font === id, onSelect: () => setFont(id) })),
	];

	return (
		<header className="topbar">
			<div className="topbar__logo">
				{t("app.logo.left")}<b>·</b>{t("app.logo.right")}
			</div>
			<span className="topbar__sep" />
			<span className="topbar__meta">{t("app.tagline")}</span>
			<span className="topbar__sep" />
			<span className="topbar__meta">
				{current.meta.showName ? `«${current.meta.showName}»` : t("app.status.unsaved")} ·{" "}
				{t("app.status.saved")}
			</span>
			<div className="topbar__spacer" />
			<div className="topbar__actions">
				<Menu label={t("menu.main")} items={menuItems} />
			</div>
			<input
				ref={inputRef}
				type="file"
				accept=".html,.htm,text/html"
				hidden
				aria-label={t("menu.open")}
				onChange={(event) => {
					const [file] = event.target.files;
					inputRef.current.value = ""; // тот же файл можно выбрать снова
					if (file) { openFile(file); }
				}}
			/>
			<ChoiceDialog
				open={pending !== null}
				title={t("replace.title")}
				cancelLabel={t("common.cancel")}
				onCancel={cancel}
				choices={[
					{ label: t("replace.save"), variant: "primary", onSelect: saveThenApply },
					{ label: t("replace.discard"), variant: "danger", onSelect: () => apply(pending) },
				]}
			>
				<p>
					{pending?.fileName
						? tn("replace.text.open", pending.fileName, currentName)
						: tn("replace.text.new", currentName)}
				</p>
			</ChoiceDialog>
		</header>
	);
}
