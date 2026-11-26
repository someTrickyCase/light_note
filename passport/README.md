# Theatre passport

A separate single-file offline editor for a show passport (light, video, sound and rigging sections).
It is written in plain JS and reuses the Light Note look (CSS tokens, themes, fonts) and its
"export = project file" idea. It does not share code with the React app in `src/`.

- `passport.html`: the built app, open it from `file://`.
- `src/app.js`, `src/app.css`: the sources.
- `src/build.py`: builds `passport.html` (`python -I src/build.py <path to dist/index.html of Light Note>`).
  The styles and fonts are taken from the built Light Note `index.html`.
- `src/vendor/`: pdf.js 3.11 (Apache-2.0), used to turn PDF plots into images.

Features: Capture "Fixture Groups Report" import (fixtures, channels, patch, auto "focus needed"
guess), PDF/JPG/PNG plots shown full-page, photos per table row, MA2 XML import for the light score,
HTML/JSON export that can be opened again, print/PDF.
