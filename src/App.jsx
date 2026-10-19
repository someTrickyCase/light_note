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
import { ConfirmButton } from "./components/ConfirmButton.jsx";
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
	const { level, usedBytes } = useQuotaWatch(p, t);
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
					<QuotaLights level={level} usedBytes={usedBytes} />
					<span className="u">{tn("app.frame.title", p.meta.showName)}</span>
				</div>
				<DocumentView project={p} />
			</div>
		</main>
	);
}

// Сообщение для тоста по результату storage.save (см. state/storage.js)
function storageToast(tn, isQuota, error, info) {
	if (isQuota && info?.offloaded) {
		return { tone: "ok", ttl: 8000, msg: tn("storage.toast.offloaded") };
	}
	if (isQuota) {
		return { tone: "err", ttl: 0, msg: tn("storage.toast.quota") };
	}
	return { tone: "warn", msg: tn("storage.toast.error", error.message || error) };
}

function Shell() {
	const { tn } = useT();
	// связываем storage._onError → pushToast (для quota-уведомлений)
	useEffect(() => {
		storage._onError = (isQuota, error, info) => pushToast(storageToast(tn, isQuota, error, info));
		return () => {
			storage._onError = null;
		};
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
