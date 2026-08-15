import { useRef } from "react";
import { useT } from "../i18n/I18nProvider.jsx";
import { useDispatch, useProject } from "../state/ProjectProvider.jsx";
import { Textarea } from "../components/Field.jsx";
import { GroupTitle } from "./GroupTitle.jsx";

// Markdown-тулбар. Работает через controlled-input: вызывает onChange
// напрямую, без хаков с DOM-мутациями.
function MarkdownToolbar({ value, onChange, textareaRef }) {
  const apply = (before, after, placeholder) => {
    const ta = textareaRef.current;
    const start = ta ? ta.selectionStart : value.length;
    const end   = ta ? ta.selectionEnd   : value.length;
    const selected = value.slice(start, end) || (placeholder || "");
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    // восстановим выделение после React-обновления
    requestAnimationFrame(() => {
      if (!ta) return;
      const cursor = start + before.length;
      ta.focus();
      ta.setSelectionRange(cursor, cursor + selected.length);
    });
  };
  return (
    <div className="md-toolbar" role="toolbar" aria-label="Форматирование">
      <button type="button" className="md-toolbar__btn" title="Жирный: **текст**"
              onClick={() => apply("**", "**", "жирный")}><b>B</b></button>
      <button type="button" className="md-toolbar__btn" title="Курсив: _текст_"
              onClick={() => apply("_", "_", "курсив")}><i>I</i></button>
      <span className="md-toolbar__sep" />
      <button type="button" className="md-toolbar__btn" title="Заголовок: ### текст (с новой строки)"
              onClick={() => apply("\n### ", "", "заголовок")}>H3</button>
      <button type="button" className="md-toolbar__btn" title="Маркированный список: - пункт (с новой строки)"
              onClick={() => apply("\n- ", "", "пункт")}>•</button>
      <button type="button" className="md-toolbar__btn" title="Цитата: > текст (с новой строки)"
              onClick={() => apply("\n> ", "", "цитата")}>”</button>
      <span className="md-toolbar__sep" />
      <button type="button" className="md-toolbar__btn" title="Ссылка: [текст](https://...)"
              onClick={() => apply("[", "](https://)", "текст")}>↗</button>
    </div>
  );
}

export function CommentarySection() {
  const { t } = useT();
  const p = useProject();
  const d = useDispatch();
  const ref = useRef(null);
  const update = (v) => d({ type: "COMMENTARY", value: v });

  return (
    <div className="editor__group">
      <GroupTitle num="7">{t("editor.commentary")}</GroupTitle>
      <MarkdownToolbar value={p.commentary} onChange={update} textareaRef={ref} />
      <Textarea
        ref={ref}
        className="md-textarea--with-toolbar"
        rows={10}
        value={p.commentary}
        onChange={(e) => update(e.target.value)}
        placeholder={t("commentary.ph")}
      />
      <div className="field__hint" style={{ marginTop: 6 }}>
        Markdown: <code>**жирный**</code>, <code>_курсив_</code>, <code>### заголовок</code>, <code>- список</code>, <code>&gt; цитата</code>, <code>[текст](url)</code>, <code>`код`</code>.
      </div>
    </div>
  );
}
