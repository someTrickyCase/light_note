import { useT } from "../i18n/I18nProvider.jsx";
import { useDispatch, useProject } from "../state/ProjectProvider.jsx";
import { Button, IconButton } from "../components/Button.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { Input } from "../components/Field.jsx";
import { GroupTitle } from "./GroupTitle.jsx";

export function StaffSection() {
	const { t, tn } = useT();
	const p = useProject();
	const d = useDispatch();
	const total = p.times.staff.reduce((s, x) => s + (Number(x.qty) || 0), 0);

	return (
		<div className="editor__group">
			<GroupTitle num="3">
				{t("times.staff")}
				{p.times.staff.length > 0 && (
					<span
						style={{
							marginLeft: 8,
							color: "var(--c-soft)",
							fontFamily: "var(--ff-mono)",
							fontSize: 11,
						}}
					>
						{tn("staff.total", total)}
					</span>
				)}
			</GroupTitle>
			<div className="editor__stack">
				{p.times.staff.length === 0 ? (
					<EmptyState glyph="▣" title={t("staff.empty")} />
				) : (
					p.times.staff.map((s) => (
						<div key={s.id} className="fix-row">
							<Input
								value={s.role}
								placeholder={t("staff.role.ph")}
								onChange={(e) =>
									d({
										type: "STAFF_UPDATE",
										id: s.id,
										patch: { role: e.target.value },
									})
								}
							/>
							<Input
								type="number"
								min="0"
								value={s.qty}
								placeholder={t("staff.qty.ph")}
								onChange={(e) =>
									d({
										type: "STAFF_UPDATE",
										id: s.id,
										patch: { qty: e.target.value },
									})
								}
							/>
							<IconButton
								label={t("common.delete")}
								onClick={() => d({ type: "STAFF_DELETE", id: s.id })}
							>
								✕
							</IconButton>
						</div>
					))
				)}
				<Button variant="ghost" onClick={() => d({ type: "STAFF_ADD" })}>
					+ {t("staff.add")}
				</Button>
			</div>
		</div>
	);
}
