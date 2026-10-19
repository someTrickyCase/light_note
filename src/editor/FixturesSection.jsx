import { useState } from "react";
import { useT } from "../i18n/I18nProvider.jsx";
import { useDispatch, useProject } from "../state/ProjectProvider.jsx";
import { Button, IconButton } from "../components/Button.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { GrowTextarea } from "../components/GrowTextarea.jsx";
import { Input } from "../components/Field.jsx";
import { GroupTitle } from "./GroupTitle.jsx";

// Краткое превью в свёрнутом состоянии — только название прибора.
function fixturePreview(f) {
	return f.type || "—";
}

function FixtureRow({ fixture, expanded, onToggle, onPatch, onDelete, onMoveUp, onMoveDown, canUp, canDown }) {
	const { t } = useT();
	return (
		<div className={`fixture-row${expanded ? " is-expanded" : ""}`}>
			<button type="button" className="fixture-row__head" onClick={onToggle} aria-expanded={expanded}>
				<span className="fixture-row__qty">×{fixture.qty}</span>
				<span className="fixture-row__preview">{fixturePreview(fixture)}</span>
				<span className="fixture-row__chev" aria-hidden="true">{expanded ? "▾" : "▸"}</span>
			</button>
			{expanded ? <div className="fixture-row__body">
					<div className="fixture-row__grid">
						<Field label={t("fixtures.col.type")} wide>
							<Input
								value={fixture.type}
								onChange={(event) => onPatch({ type: event.target.value })}
								placeholder={t("fixtures.type.ph")}
							/>
						</Field>
						<Field label={t("fixtures.col.qty")}>
							<Input
								type="number" min="0"
								value={fixture.qty}
								onChange={(event) => onPatch({ qty: event.target.value })}
								placeholder={t("fixtures.qty.ph")}
							/>
						</Field>
					</div>
					<Field label={t("fixtures.col.info")}>
						<GrowTextarea
							value={fixture.info}
							onChange={(event) => onPatch({ info: event.target.value })}
							placeholder={t("fixtures.info.ph")}
						/>
					</Field>
					<div className="fixture-row__actions">
						<IconButton label={t("common.moveUp")} onClick={onMoveUp} disabled={!canUp}>↑</IconButton>
						<IconButton label={t("common.moveDown")} onClick={onMoveDown} disabled={!canDown}>↓</IconButton>
						<IconButton label={t("common.delete")} onClick={onDelete}>✕</IconButton>
					</div>
				</div> : null}
		</div>
	);
}

function Field({ label, children, wide }) {
	return (
		<label className={`fixture-row__field${wide ? " fixture-row__field--wide" : ""}`}>
			<span className="fixture-row__label">{label}</span>
			{children}
		</label>
	);
}

export function FixturesSection() {
	const { t, tn } = useT();
	const p = useProject();
	const d = useDispatch();
	const [expandedId, setExpandedId] = useState(null);

	const total = p.fixtures.reduce((s, f) => s + (Number(f.qty) || 0), 0);

	const move = (id, direction) => {
		const index = p.fixtures.findIndex((f) => f.id === id);
		const target = p.fixtures[index + direction];
		if (index === -1 || !target) { return; }
		d({ type: "FIX_REORDER", fromId: id, toId: target.id });
	};

	return (
		<div className="editor__group">
			<GroupTitle num="5">
				{t("editor.fixtures")}
				{p.fixtures.length > 0 && (
					<span className="editor__title-meta">{tn("fixtures.total", total)}</span>
				)}
			</GroupTitle>
			<div className="editor__stack">
				{p.fixtures.length === 0 ? (
					<EmptyState glyph="▣" title={t("fixtures.empty")} />
				) : (
					<div className="fixture-list" role="list">
						{p.fixtures.map((f, index) => (
							<FixtureRow
								key={f.id}
								fixture={f}
								expanded={expandedId === f.id}
								onToggle={() => setExpandedId(expandedId === f.id ? null : f.id)}
								onPatch={(patch) => d({ type: "FIX_UPDATE", id: f.id, patch })}
								onDelete={() => d({ type: "FIX_DELETE", id: f.id })}
								onMoveUp={() => move(f.id, -1)}
								onMoveDown={() => move(f.id, 1)}
								canUp={index > 0}
								canDown={index < p.fixtures.length - 1}
							/>
						))}
					</div>
				)}
				<Button variant="ghost" onClick={() => d({ type: "FIX_ADD" })}>+ {t("fixtures.add")}</Button>
			</div>
		</div>
	);
}
