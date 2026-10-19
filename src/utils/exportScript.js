// =====================================================================
// UTILS · VANILLA-JS ДЛЯ STANDALONE HTML ЭКСПОРТА
// =====================================================================
// После renderToStaticMarkup кнопки prev/next галереи и lightbox не работают
// (нет JS). Этот скрипт встраивается инлайн в каждый экспорт и возвращает
// интерактивность. Без зависимостей, ~2 KB.

export const EXPORT_RUNTIME_JS = `
(function(){
  function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  ready(function(){
    // ----- gallery scroll buttons -----
    document.querySelectorAll('.doc__gallery-wrap').forEach(function(wrap){
      var gallery = wrap.querySelector('.doc__gallery');
      var prev = wrap.querySelector('.doc__gallery-btn--prev');
      var next = wrap.querySelector('.doc__gallery-btn--next');
      if (!gallery) return;
      function scrollBy(dir){
        var photo = gallery.querySelector('.doc__photo');
        var w = photo ? photo.getBoundingClientRect().width + 12 : gallery.clientWidth * 0.8;
        gallery.scrollBy({ left: dir * w, behavior: 'smooth' });
      }
      function update(){
        if (!prev || !next) return;
        var max = gallery.scrollWidth - gallery.clientWidth - 1;
        prev.disabled = gallery.scrollLeft <= 0;
        next.disabled = gallery.scrollLeft >= max;
      }
      if (prev) prev.addEventListener('click', function(){ scrollBy(-1); });
      if (next) next.addEventListener('click', function(){ scrollBy(1); });
      gallery.addEventListener('scroll', update);
      window.addEventListener('resize', update);
      update();
    });

    // ----- lightbox: the React <Lightbox> renders an empty <dialog>; img + caption are created on first open -----
    var lb = document.querySelector('.lightbox');

    function ensureChild(cls, tag){
      var el = lb.querySelector('.' + cls);
      if (!el) { el = document.createElement(tag); el.className = cls; lb.appendChild(el); }
      return el;
    }
    function closeLb(){ if (lb && lb.open) lb.close(); }
    function openLb(src, cap){
      if (!lb) return;
      var img = ensureChild('lightbox__img', 'img');
      img.src = src;
      img.alt = cap || '';
      var capEl = ensureChild('lightbox__cap', 'div');
      capEl.textContent = cap || '';
      capEl.hidden = !cap;
      if (typeof lb.showModal === 'function') lb.showModal(); else lb.setAttribute('open','');
    }
    if (lb) {
      var lbClose = lb.querySelector('.lightbox__close');
      if (lbClose) lbClose.addEventListener('click', function(e){ e.preventDefault(); closeLb(); });
      lb.addEventListener('click', function(e){ if (e.target === lb) closeLb(); });
    }

    // .doc__zoom wraps each image (doc/ZoomImage.jsx); caption is in data-caption
    document.querySelectorAll('.doc__zoom').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.preventDefault();
        var img = btn.querySelector('img');
        var src = img ? img.getAttribute('src') : '';
        if (!src) return;
        openLb(src, btn.getAttribute('data-caption'));
      });
    });

    // Esc closes the lightbox
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape') closeLb();
    });
  });
})();
`;
