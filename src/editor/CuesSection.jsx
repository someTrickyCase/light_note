import { useMemo, useRef, useState } from "react";
import { useT } from "../i18n/I18nProvider.jsx";
import { useDispatch, useProject } from "../state/ProjectProvider.jsx";
import { Button, IconButton } from "../components/Button.jsx";
import { GrowTextarea } from "../components/GrowTextarea.jsx";
import { Input } from "../components/Field.jsx";
import { Toast } from "../components/Toast.jsx";
import { GroupTitle } from "./GroupTitle.jsx";
import { parseMA2 } from "../utils/ma2.js";
import { pushToast } from "../utils/toast.js";

// Краткое превью одной строки (для свёрнутого списка).
// Берёт первый непустой фрагмент описания или имени.
function cuePreview(c) {
	const txt = (c.info || c.name || c.cmd || "").trim();
	if (!txt) { return "—"; }
	// первая непустая «строка» (по \n или по .)
	const firstLine = txt.split(/\n|\.\s+/, 1)[0].trim();
	const snippet = firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine;
	return snippet;
}

function CueRow({ cue, expanded, onToggle, onPatch, onDelete, onMoveUp, onMoveDown, canUp, canDown }) {
	const { t } = useT();
	return (
		<div className={`cue-row${expanded ? " is-expanded" : ""}`}>
			<button type="button" className="cue-row__head" onClick={onToggle} aria-expanded={expanded}>
				<span className="cue-row__num">{cue.num}</span>
				<span className="cue-row__preview">{cuePreview(cue)}</span>
				{cue.cmd && !expanded ? <span className="cue-row__cmd-dot" title={t("cues.hasCmd")}>●</span> : null}
				{!expanded && cue.trigger && cue.trigger !== "Go" ? <span className="cue-row__trig">{cue.trigger}</span> : null}
				<span className="cue-row__chev" aria-hidden="true">{expanded ? "▾" : "▸"}</span>
			</button>
			{expanded ? <div className="cue-row__body">
					<div className="cue-row__grid">
						<Field label={t("cues.col.num")}>
							<Input
								value={String(cue.num)}
								onChange={(event) => onPatch({ num: event.target.value })}
							/>
						</Field>
						<Field label={t("cues.col.name")} wide>
							<Input
								value={cue.name}
								onChange={(event) => onPatch({ name: event.target.value })}
								placeholder={t("cues.name.ph")}
							/>
						</Field>
						<Field label={t("cues.col.trigger")}>
							<Input
								value={cue.trigger}
								onChange={(event) => onPatch({ trigger: event.target.value })}
								placeholder={t("cues.trigger.ph")}
							/>
						</Field>
					</div>
					<Field label={t("cues.col.info")}>
						<GrowTextarea
							value={cue.info}
							onChange={(event) => onPatch({ info: event.target.value })}
							placeholder={t("cues.info.ph")}
						/>
					</Field>
					<Field label={t("cues.col.cmd")}>
						<GrowTextarea
							value={cue.cmd}
							onChange={(event) => onPatch({ cmd: event.target.value })}
							placeholder={t("cues.cmd.ph")}
						/>
					</Field>
					<div className="cue-row__actions">
						<IconButton
							label={t("common.moveUp")}
							onClick={onMoveUp}
							disabled={!canUp}
						>↑</IconButton>
						<IconButton
							label={t("common.moveDown")}
							onClick={onMoveDown}
							disabled={!canDown}
						>↓</IconButton>
						<IconButton
							label={t("common.delete")}
							onClick={onDelete}
						>✕</IconButton>
					</div>
				</div> : null}
		</div>
	);
}

// Локальный Field — чтобы не зависеть от глобального импорта и не тащить hint.
function Field({ label, children, wide }) {
	return (
		<label className={`cue-row__field${wide ? " cue-row__field--wide" : ""}`}>
			<span className="cue-row__label">{label}</span>
			{children}
		</label>
	);
}

export function CuesSection() {
	const { t, tn } = useT();
	const p = useProject();
	const d = useDispatch();
	const fileRef = useRef(null);
	const [expandedId, setExpandedId] = useState(null);
	const [query, setQuery] = useState("");

	// parseMA2 возвращает коды предупреждений — переводим их здесь
	const describeWarning = (warning) => tn(`ma2.warn.${warning.code}`, warning.detail);

	const onImport = async (file) => {
		if (!file) { return; }
		try {
			const text = await file.text();
			const { cues, warnings } = parseMA2(text);
			if (cues.length === 0) {
				pushToast({ tone: "err", msg: tn("cues.import.fail", warnings[0] && describeWarning(warnings[0])) });
				return;
			}
			d({ type: "CUES_REPLACE", cues });
			setExpandedId(null);
			pushToast({ tone: "ok", ttl: 6000, msg: tn("cues.import.ok", cues.length) });
			if (warnings.length > 0) {
				pushToast({ tone: "warn", ttl: 0, msg: warnings.map((warning) => describeWarning(warning)).join("\n") });
			}
		} catch (error) {
			pushToast({ tone: "err", msg: tn("cues.import.readError", error.message || error) });
		}
	};

	// фильтрация
	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) { return p.cues; }
		return p.cues.filter((c) => {
			return (
				(c.name || "").toLowerCase().includes(q) ||
				(c.info || "").toLowerCase().includes(q) ||
				(c.cmd || "").toLowerCase().includes(q) ||
				String(c.num || "").includes(q)
			);
		});
	}, [p.cues, query]);

	const move = (id, direction) => {
		const index = p.cues.findIndex((c) => c.id === id);
		const target = index + direction;
		if (index === -1 || target < 0 || target >= p.cues.length) { return; }
		const list = [...p.cues];
		[list[index], list[target]] = [list[target], list[index]];
		// сохраняем порядок как номера (1..N) — стабильный и видимый
		d({ type: "CUES_REPLACE", cues: list.map((c, position) => ({ ...c, num: position + 1 })) });
	};

	return (
		<div className="editor__group">
			<GroupTitle num="6">{t("editor.cues")}</GroupTitle>
			<div className="editor__stack">
				{p.cues.length === 0 ? (
					<Toast tone="info">{t("cues.empty")}</Toast>
				) : (
					<>
						<Input
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder={t("cues.search.ph")}
						/>
						{filtered.length === 0 ? (
							<Toast tone="warn">{tn("cues.search.empty", query)}</Toast>
						) : (
							<>
								<div className="cue-list" role="list">
									{filtered.map((c) => {
										// индекс в полном массиве — для кнопок порядка
										const index = p.cues.findIndex((x) => x.id === c.id);
										return (
											<CueRow
												key={c.id}
												cue={c}
												expanded={expandedId === c.id}
												onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
												onPatch={(patch) => d({ type: "CUE_UPDATE", id: c.id, patch })}
												onDelete={() => d({ type: "CUE_DELETE", id: c.id })}
												onMoveUp={() => move(c.id, -1)}
												onMoveDown={() => move(c.id, 1)}
												canUp={index > 0}
												canDown={index < p.cues.length - 1}
											/>
										);
									})}
								</div>
								{query ? <div className="field__hint" style={{ margin: 0 }}>
										{tn("cues.summary", filtered.length, p.cues.length)}
									</div> : null}
							</>
						)}
					</>
				)}
				<div className="editor__actions">
					<Button variant="ghost" onClick={() => d({ type: "CUE_ADD" })}>+ {t("cues.add")}</Button>
					<Button variant="ghost" onClick={() => fileRef.current?.click()}>
						↑ {t("cues.import")}
					</Button>
					<input
						ref={fileRef}
						type="file"
						accept=".xml,text/xml"
						hidden
						onChange={(event) => {
							const file = event.target.files?.[0];
							if (file) { onImport(file); }
							// сброс, чтобы повторный выбор того же файла снова вызвал onChange
							fileRef.current.value = "";
						}}
					/>
				</div>
				<p className="field__hint" style={{ margin: 0 }}>{t("cues.import.hint")}</p>
			</div>
		</div>
	);
}
