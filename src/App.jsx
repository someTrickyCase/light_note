import { useEffect } from "react";
import { I18nProvider, useT } from "./i18n/I18nProvider.jsx";
import {
	ProjectProvider,
	useDispatch,
	useProject,
	useProjectLoading,
} from "./state/ProjectProvider.jsx";
import { storage } from "./state/storage.js";
import { pushToast } from "./utils/toast.js";
import { exportDocument } from "./utils/exportHtml.jsx";
import { useQuotaWatch } from "./utils/useQuotaWatch.js";

import { Button } from "./components/Button.jsx";
import { QuotaLights } from "./components/QuotaLights.jsx";
import { Toaster } from "./components/Toaster.jsx";

import { MetaSection } from "./editor/MetaSection.jsx";
import { TimesSection } from "./editor/TimesSection.jsx";
import { PlotsSection } from "./editor/PlotsSection.jsx";
import { GallerySection } from "./editor/GallerySection.jsx";
import { FixturesSection } from "./editor/FixturesSection.jsx";
import { CuesSection } from "./editor/CuesSection.jsx";
import { CommentarySection } from "./editor/CommentarySection.jsx";
import { StaffSection } from "./editor/StaffSection.jsx";

import { DocumentView } from "./doc/DocumentView.jsx";

function Topbar() {
	const { t } = useT();
	const p = useProject();
	const d = useDispatch();
	return (
		<header className="topbar">
			<div className="topbar__logo">
				LIGHT<b>·</b>NOTE
			</div>
			<span className="topbar__sep" />
			<span className="topbar__meta">{t("app.tagline")}</span>
			<span className="topbar__sep" />
			<span className="topbar__meta">
				{p.meta.showName ? `«${p.meta.showName}»` : t("app.status.unsaved")} ·{" "}
				{t("app.status.saved")}
			</span>
			<div className="topbar__spacer" />
			<div className="topbar__actions">
				<Button
					variant="ghost"
					size="sm"
					onClick={() => {
						if (confirm(t("common.confirmNew"))) d({ type: "RESET" });
					}}
				>
					{t("app.actions.new")}
				</Button>
				<Button variant="ghost" size="sm" onClick={() => window.print()}>
					🖨 {t("app.actions.print")}
				</Button>
				<Button variant="primary" size="sm" onClick={() => { void exportDocument(p); }}>
					↓ {t("app.actions.export")}
				</Button>
			</div>
		</header>
	);
}

function Editor() {
	const { t } = useT();
	const loading = useProjectLoading();
	if (loading) {
		return (
			<aside className="editor" style={{ color: "var(--c-soft)", fontFamily: "var(--ff-mono)", fontSize: "var(--fs-sm)" }}>
				Загружаем проект…
			</aside>
		);
	}
	return (
		<aside className="editor">
			<h1 className="doc__title" style={{ fontSize: 22, marginBottom: 24 }}>
				{t("editor.heading")}
			</h1>
			<MetaSection />
			<TimesSection />
			<StaffSection />
			<PlotsSection />
			<GallerySection />
			<FixturesSection />
			<CuesSection />
			<CommentarySection />
		</aside>
	);
}

function Preview() {
	const { t } = useT();
	const p = useProject();
	const loading = useProjectLoading();
	const { level, usedBytes } = useQuotaWatch(p, t);
	if (!p || loading) {
		return (
			<main className="preview-wrap">
				<div className="preview-frame" style={{ minHeight: 200, display: "grid", placeItems: "center", color: "var(--c-soft)", fontFamily: "var(--ff-mono)", fontSize: "var(--fs-sm)" }}>
					Загружаем проект…
				</div>
			</main>
		);
	}
	return (
		<main className="preview-wrap">
			<div className="preview-frame">
				<div className="preview-frame__bar">
					<QuotaLights level={level} usedBytes={usedBytes} />
					<span className="u">
						light-note · {p.meta.showName || "новое шоу"}
					</span>
				</div>
				<DocumentView project={p} />
			</div>
		</main>
	);
}

function Shell() {
	// связываем storage._onError → pushToast (для quota-уведомлений)
	useEffect(() => {
		storage._onError = (isQuota, e, info) => {
			if (isQuota && info && info.offloaded) {
				pushToast({
					tone: "ok",
					ttl: 8000,
					msg: "✓ Большие файлы перенесены в надёжное хранилище браузера — проект сохранён.",
				});
			} else if (isQuota) {
				pushToast({
					tone: "err",
					ttl: 0,
					msg: "Не удалось сохранить в браузер: переполнение. Сократите число фото или их размер.",
				});
			} else {
				pushToast({
					tone: "warn",
					msg: "Ошибка сохранения: " + (e.message || e),
				});
			}
		};
		return () => {
			storage._onError = null;
		};
	}, []);

	return (
		<div className="app">
			<Topbar />
			<div className="work">
				<Editor />
				<Preview />
			</div>
			<Toaster />
		</div>
	);
}

export default function App() {
	return (
		<I18nProvider>
			<ProjectProvider>
				<Shell />
			</ProjectProvider>
		</I18nProvider>
	);
}
