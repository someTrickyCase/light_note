// =====================================================================
// UTILS · VANILLA-JS ДЛЯ STANDALONE HTML ЭКСПОРТА
// =====================================================================
// После renderToStaticMarkup в файле нет React, поэтому карусель (Lightbox)
// не работает. Этот скрипт встраивается инлайн в каждый экспорт и повторяет
// поведение components/Lightbox.jsx на той же разметке:
//   [data-zoom-group]  — группа (галерея, плоты), в ней свой .lightbox
//   .doc__zoom         — картинка-кнопка (data-title, data-caption), порядок = порядок в карусели
//   .lightbox__img / __count / __title / __caption / __close / __nav--prev / __nav--next
// Листание по кругу, ← →, свайп; Esc закрывает нативный <dialog> сам.
// Без зависимостей, старый синтаксис (var, function) — откроется в любом браузере.
// Комментарии внутри строки — по-английски: они попадают в экспортированный файл.

export const EXPORT_RUNTIME_JS = `
(function(){
  var SWIPE_PX = 50; // same as SWIPE_PX in components/Lightbox.jsx

  function ready(fn){ if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  function setupGroup(group){
    var lb = group.querySelector('.lightbox');
    var buttons = Array.prototype.slice.call(group.querySelectorAll('.doc__zoom'));
    if (!lb || buttons.length === 0) return;
    var img = lb.querySelector('.lightbox__img');
    var countEl = lb.querySelector('.lightbox__count');
    var titleEl = lb.querySelector('.lightbox__title');
    var captionEl = lb.querySelector('.lightbox__caption');
    var n = buttons.length;
    var current = 0;
    var startX = null;
    var swiped = false;

    function show(i){
      current = (i + n) % n;
      var btn = buttons[current];
      var thumb = btn.querySelector('img');
      var title = btn.getAttribute('data-title') || '';
      img.setAttribute('src', thumb ? thumb.getAttribute('src') : '');
      img.setAttribute('alt', title);
      lb.setAttribute('aria-label', title);
      titleEl.textContent = title;
      captionEl.textContent = btn.getAttribute('data-caption') || '';
      // same format as "lightbox.count" in i18n/dict.js
      countEl.textContent = n > 1 ? (current + 1) + ' / ' + n : '';
    }
    function open(i){
      show(i);
      if (lb.open) return;
      if (typeof lb.showModal === 'function') lb.showModal(); else lb.setAttribute('open', '');
    }
    function close(){
      if (typeof lb.close === 'function') lb.close(); else lb.removeAttribute('open');
    }

    buttons.forEach(function(btn, i){
      btn.addEventListener('click', function(e){ e.preventDefault(); open(i); });
    });
    var prev = lb.querySelector('.lightbox__nav--prev');
    var next = lb.querySelector('.lightbox__nav--next');
    var closeBtn = lb.querySelector('.lightbox__close');
    if (prev) prev.addEventListener('click', function(){ show(current - 1); });
    if (next) next.addEventListener('click', function(){ show(current + 1); });
    if (closeBtn) closeBtn.addEventListener('click', function(e){ e.preventDefault(); close(); });

    // backdrop click closes, but not right after a swipe (click fires after pointerup)
    lb.addEventListener('click', function(e){
      if (e.target === lb && !swiped) close();
      swiped = false;
    });
    lb.addEventListener('keydown', function(e){
      if (n < 2) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(current - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); show(current + 1); }
    });
    lb.addEventListener('pointerdown', function(e){ startX = e.clientX; swiped = false; });
    lb.addEventListener('pointerup', function(e){
      if (startX === null) return;
      var dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) <= SWIPE_PX) return;
      // a long drag is a swipe even with one photo: the click after it must not close
      swiped = true;
      if (n > 1) show(current + (dx < 0 ? 1 : -1));
    });
  }

  ready(function(){
    Array.prototype.forEach.call(document.querySelectorAll('[data-zoom-group]'), setupGroup);
  });
})();
`;
