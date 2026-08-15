import { useT } from "../i18n/I18nProvider.jsx";

export function DocFixtures({ project }) {
	const { t, tn } = useT();
	const list = project.fixtures.filter((f) => f.type);
	if (list.length === 0) return null;
	const total = list.reduce((s, f) => s + (Number(f.qty) || 0), 0);
	return (
		<section className="doc__section">
			<h2 className="doc__h2">{t("doc.section.fixtures")}</h2>
			<table className="doc__table doc__table--fixtures">
				<colgroup>
					<col className="col-type" />
					<col className="col-qty" />
					<col className="col-info" />
				</colgroup>
				<thead>
					<tr>
						<th>{t("fixtures.col.type")}</th>
						<th className="doc__num">{t("fixtures.col.qty")}</th>
						<th>{t("fixtures.col.info")}</th>
					</tr>
				</thead>
				<tbody>
					{list.map((f) => (
						<tr key={f.id}>
							<td>{f.type}</td>
							<td className="doc__num">{f.qty}</td>
							<td>{f.info || ""}</td>
						</tr>
					))}
				</tbody>
				{total > 0 && (
					<tfoot>
						<tr>
							<td colSpan={2}>{tn("fixtures.total", total).replace(/:\s*/, " · ")}</td>
							<td className="doc__num">{total}</td>
						</tr>
					</tfoot>
				)}
			</table>
		</section>
	);
}
