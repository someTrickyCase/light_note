// Пост-обработка dist/index.html:
// 1) убираем type="module" и crossorigin (для file:// в Chrome/Brave)
// 2) убираем <link rel="stylesheet" ...> (CSS уже инлайнится в <style>)
// 3) удаляем отдельный light-note.css (если остался)
import fs from "node:fs";
import path from "node:path";

const distribution = path.resolve("dist");
const indexPath = path.join(distribution, "index.html");
const cssPath = path.join(distribution, "light-note.css");

let html = fs.readFileSync(indexPath, "utf8");

// 1) <script type="module" crossorigin src="./light-note.js"></script> → <script defer src="./light-note.js"></script>
const moduleScript = /<script type="module" crossorigin src="\.\/light-note\.js"><\/script>/;
if (!moduleScript.test(html)) {
	// Vite поменял формат тега — без замены сборка сломается на file://
	console.warn("  postbuild: module <script> tag not found, check dist/index.html");
}
html = html.replace(moduleScript, '<script defer src="./light-note.js"></script>');

// 2) <link rel="stylesheet" crossorigin href="./light-note.css"> → убираем (CSS уже inline в <style>)
html = html.replace(/<link rel="stylesheet"[^>]*light-note\.css[^>]*>/, "");

fs.writeFileSync(indexPath, html);

// 3) удаляем лишний CSS-файл
if (fs.existsSync(cssPath)) {
	fs.unlinkSync(cssPath);
	console.log("  removed", cssPath);
}

console.log("postbuild ok");
