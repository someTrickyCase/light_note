import { useT } from "../i18n/I18nProvider.jsx";

export function DocStaff({ project }) {
	const { t } = useT();
	const list = project.times.staff.filter((s) => s.role);
	if (list.length === 0) return null;
	const total = list.reduce((s, x) => s + (Number(x.qty) || 0), 0);
	return (
		<section className="doc__section">
			<h2 className="doc__h2">{t("doc.times.staff")}</h2>
			<table className="doc__table">
				<thead>
					<tr>
						<th>{t("doc.times.staff.role")}</th>
						<th className="doc__num">{t("doc.times.staff.qty")}</th>
					</tr>
				</thead>
				<tbody>
					{list.map((s) => (
						<tr key={s.id}>
							<td>{s.role}</td>
							<td className="doc__num">{s.qty}</td>
						</tr>
					))}
				</tbody>
				<tfoot>
					<tr>
						<td>{t("doc.times.staff.total")}</td>
						<td className="doc__num">{total}</td>
					</tr>
				</tfoot>
			</table>
		</section>
	);
}
