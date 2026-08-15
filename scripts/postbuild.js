// Пост-обработка dist/index.html:
// 1) убираем type="module" и crossorigin (для file:// в Chrome/Brave)
// 2) убираем <link rel="stylesheet" ...> (CSS уже инлайнится в <style>)
// 3) удаляем отдельный light-note.css (если остался)
import fs from "node:fs";
import path from "node:path";

const dist = path.resolve("dist");
const indexPath = path.join(dist, "index.html");
const cssPath = path.join(dist, "light-note.css");

let html = fs.readFileSync(indexPath, "utf8");

// 1) <script type="module" crossorigin src="./light-note.js"></script> → <script defer src="./light-note.js"></script>
const beforeScript = html.match(/<script[^>]*light-note\.js[^>]*><\/script>/);
html = html.replace(
	/<script type="module" crossorigin src="\.\/light-note\.js"><\/script>/,
	'<script defer src="./light-note.js"></script>',
);

// 2) <link rel="stylesheet" crossorigin href="./light-note.css"> → убираем (CSS уже inline в <style>)
html = html.replace(/<link rel="stylesheet"[^>]*light-note\.css[^>]*>/, "");

fs.writeFileSync(indexPath, html);

// 3) удаляем лишний CSS-файл
if (fs.existsSync(cssPath)) {
	fs.unlinkSync(cssPath);
	console.log("  removed", cssPath);
}

console.log("postbuild ok");
