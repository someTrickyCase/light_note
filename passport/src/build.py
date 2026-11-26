"""Сборка passport.html: стили и шрифты Light Note + app.css + app.js в один файл.

Запуск: python build.py [путь к Light-note/index.html]
"""
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
LIGHT_NOTE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("../dist/index.html")
OUT = HERE.parent / "passport.html"

base = LIGHT_NOTE.read_text(encoding="utf-8")
style = re.search(r"<style>(.*?)</style>", base, re.S).group(1)
css = (HERE / "app.css").read_text(encoding="utf-8")
js = (HERE / "app.js").read_text(encoding="utf-8")

# pdf.js (Apache-2.0) встраивается как текст и подключается при первом импорте PDF
pdf_lib = (HERE / "vendor/pdf.min.js").read_text(encoding="utf-8")
pdf_worker = (HERE / "vendor/pdf.worker.min.js").read_text(encoding="utf-8")
assert "</script" not in pdf_lib + pdf_worker

head_script ="""(function(){function pick(k,v,f){try{var x=localStorage.getItem(k);return v.indexOf(x)>=0?x:f}catch(e){return f}}
var r=document.documentElement;r.dataset.theme=pick("tld.theme.v1",["graphite","midnight","tungsten","light","paper"],"graphite");
r.dataset.font=pick("tld.font.v1",["sans","serif"],"sans");r.lang="ru"})();"""

html = f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Паспорт спектакля</title>
<script>{head_script}</script>
<style>{style}
[hidden]{{display:none!important}}
{css}</style>
</head>
<body>
<div id="root"></div>
<script type="text/plain" id="pdfjs-lib">{pdf_lib}</script>
<script type="text/plain" id="pdfjs-worker">{pdf_worker}</script>
<script>{js}</script>
</body>
</html>
"""
OUT.write_text(html, encoding="utf-8")
print(f"{OUT} — {OUT.stat().st_size // 1024} КБ")
