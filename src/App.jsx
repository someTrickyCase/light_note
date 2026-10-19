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
import { useSpaceWarning } from "./utils/useSpaceWarning.js";

import { Button } from "./components/Button.jsx";
import { ConfirmButton } from "./components/ConfirmButton.jsx";
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
				{t("app.logo.left")}<b>·</b>{t("app.logo.right")}
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
				<ConfirmButton
					variant="ghost"
					size="sm"
					title={t("common.confirmNew")}
					confirmLabel={t("app.actions.new.confirm")}
					onConfirm={() => d({ type: "RESET" })}
				>
					{t("app.actions.new")}
				</ConfirmButton>
				<Button variant="ghost" size="sm" onClick={() => globalThis.print()}>
					🖨 {t("app.actions.print")}
				</Button>
				<Button variant="primary" size="sm" onClick={() => exportDocument(p)}>
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
		return <aside className="editor editor__loading">{t("app.loading")}</aside>;
	}
	return (
		<aside className="editor">
			<h1 className="doc__title editor__heading">{t("editor.heading")}</h1>
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
	const { t, tn } = useT();
	const p = useProject();
	const loading = useProjectLoading();
	useSpaceWarning(p, t, tn);
	if (!p || loading) {
		return (
			<main className="preview-wrap">
				<div className="preview-frame preview-frame--loading">{t("app.loading")}</div>
			</main>
		);
	}
	return (
		<main className="preview-wrap">
			<div className="preview-frame">
				<div className="preview-frame__bar">
					<span className="u">{tn("app.frame.title", p.meta.showName)}</span>
				</div>
				<DocumentView project={p} />
			</div>
		</main>
	);
}

// Сообщение для тоста по ошибке storage (см. state/storage.js); kind: "quota" | "error" | "load"
function storageToast(tn, kind, error) {
	if (kind === "quota") {
		return { tone: "err", ttl: 0, msg: tn("storage.toast.quota") };
	}
	if (kind === "load") {
		return { tone: "err", ttl: 0, msg: tn("storage.toast.loadFailed", error.message || error) };
	}
	return { tone: "warn", msg: tn("storage.toast.error", error.message || error) };
}

function Shell() {
	const { tn } = useT();
	// ошибки storage → pushToast (переполнение, сбой записи или чтения)
	useEffect(() => {
		storage.setErrorHandler((kind, error) => pushToast(storageToast(tn, kind, error)));
		return () => storage.setErrorHandler(null);
	}, [tn]);

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
