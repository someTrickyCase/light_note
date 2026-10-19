import { Fragment, useRef } from "react";
import { useT } from "../i18n/I18nProvider.jsx";
import { useDispatch, useProject } from "../state/ProjectProvider.jsx";
import { Textarea } from "../components/Field.jsx";
import { GroupTitle } from "./GroupTitle.jsx";

// Одно описание форматов — и для кнопок тулбара, и для подсказки под полем.
// glyph — значок кнопки; если его нет, подпись берётся из словаря (md.<key>.label).
// inToolbar: false — только в подсказке. sepAfter — разделитель после кнопки.
const FORMATS = [
  { key: "bold", before: "**", after: "**", wrap: "b" },
  { key: "italic", before: "_", after: "_", wrap: "i", sepAfter: true },
  { key: "h3", before: "\n### ", after: "" },
  { key: "ul", before: "\n- ", after: "", glyph: "•" },
  { key: "quote", before: "\n> ", after: "", glyph: "”", sepAfter: true },
  { key: "link", before: "[", after: "](https://)", glyph: "↗" },
  { key: "code", before: "`", after: "`", inToolbar: false },
];

function ToolbarLabel({ format }) {
  const { t } = useT();
  if (format.glyph) { return format.glyph; }
  const label = t(`md.${format.key}.label`);
  if (format.wrap === "b") { return <b>{label}</b>; }
  if (format.wrap === "i") { return <i>{label}</i>; }
  return label;
}

// Markdown-тулбар. Работает через controlled-input: вызывает onChange
// напрямую, без хаков с DOM-мутациями.
function MarkdownToolbar({ value, onChange, textareaRef }) {
  const { t } = useT();
  const apply = ({ before, after, key }) => {
    const ta = textareaRef.current;
    const start = ta ? ta.selectionStart : value.length;
    const end = ta ? ta.selectionEnd : value.length;
    const selected = value.slice(start, end) || t(`md.${key}.ph`);
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    // восстановим выделение после React-обновления
    requestAnimationFrame(() => {
      if (!ta) { return; }
      const cursor = start + before.length;
      ta.focus();
      ta.setSelectionRange(cursor, cursor + selected.length);
    });
  };
  return (
    <div className="md-toolbar" role="toolbar" aria-label={t("md.toolbar")}>
      {FORMATS.filter((format) => format.inToolbar !== false).map((format) => (
        <Fragment key={format.key}>
          <button
            type="button"
            className="md-toolbar__btn"
            title={t(`md.${format.key}.title`)}
            onClick={() => apply(format)}
          >
            <ToolbarLabel format={format} />
          </button>
          {format.sepAfter ? <span className="md-toolbar__sep" /> : null}
        </Fragment>
      ))}
    </div>
  );
}

function MarkdownHint() {
  const { t } = useT();
  return (
    <div className="field__hint field__hint--top">
      {t("md.hint")}{" "}
      {FORMATS.map((format, index) => (
        <Fragment key={format.key}>
          {index > 0 ? ", " : null}
          <code>{`${format.before}${t(`md.${format.key}.ph`)}${format.after}`.trim()}</code>
        </Fragment>
      ))}
    </div>
  );
}

export function CommentarySection() {
  const { t } = useT();
  const p = useProject();
  const d = useDispatch();
  const ref = useRef(null);
  const update = (value) => d({ type: "COMMENTARY", value });

  return (
    <div className="editor__group">
      <GroupTitle num="7">{t("editor.commentary")}</GroupTitle>
      <MarkdownToolbar value={p.commentary} onChange={update} textareaRef={ref} />
      <Textarea
        ref={ref}
        className="md-textarea--with-toolbar"
        rows={10}
        value={p.commentary}
        onChange={(event) => update(event.target.value)}
        placeholder={t("commentary.ph")}
      />
      <MarkdownHint />
    </div>
  );
}
