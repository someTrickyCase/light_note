import { useT } from "../i18n/I18nProvider.jsx";
import { useDispatch, useProject } from "../state/ProjectProvider.jsx";
import { Field, Input } from "../components/Field.jsx";
import { GroupTitle } from "./GroupTitle.jsx";

export function TimesSection() {
	const { t } = useT();
	const p = useProject();
	const d = useDispatch();
	const set = (patch) => d({ type: "TIMES", patch });

	return (
		<div className="editor__group">
			<GroupTitle num="2">{t("editor.times")}</GroupTitle>
			<div className="editor__stack">
				<Field
					label={t("times.installation")}
					hint={t("times.installation.note")}
				>
					<Input
						value={p.times.installation}
						onChange={(e) => set({ installation: e.target.value })}
						placeholder={t("times.installation.ph")}
					/>
				</Field>
				<Field label={t("times.focus")} hint={t("times.focus.note")}>
					<Input
						value={p.times.focus}
						onChange={(e) => set({ focus: e.target.value })}
						placeholder={t("times.focus.ph")}
					/>
				</Field>
				<Field label={t("times.runtime")}>
					<Input
						value={p.times.runtime}
						onChange={(e) => set({ runtime: e.target.value })}
						placeholder={t("times.runtime.ph")}
					/>
				</Field>
			</div>
		</div>
	);
}
