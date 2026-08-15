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

    // ----- lightbox (zoom по клику на фото) -----
    var lb = document.querySelector('.lightbox');
    var lbImg = lb ? lb.querySelector('.lightbox__img') : null;
    var lbCap = lb ? lb.querySelector('.lightbox__cap') : null;
    var lbClose = lb ? lb.querySelector('.lightbox__close') : null;

    function closeLb(){ if (lb && lb.open) lb.close(); }
    function openLb(src, cap){
      if (!lb) return;
      if (lbImg) lbImg.src = src;
      if (lbCap) lbCap.textContent = cap || '';
      // в <dialog> нет <img> если не было открыто раньше — создаём на лету
      if (lbImg && !lbImg.parentNode) lb.appendChild(lbImg);
      if (lbCap && !lbCap.parentNode) lb.appendChild(lbCap);
      if (typeof lb.showModal === 'function') lb.showModal(); else lb.setAttribute('open','');
    }
    if (lbClose) lbClose.addEventListener('click', function(e){ e.preventDefault(); closeLb(); });
    if (lb) lb.addEventListener('click', function(e){ if (e.target === lb) closeLb(); });

    document.querySelectorAll('.doc__photo a').forEach(function(a){
      a.addEventListener('click', function(e){
        e.preventDefault();
        var img = a.querySelector('img');
        var src = img ? img.getAttribute('src') : a.getAttribute('href');
        if (!src) return;
        var meta = a.parentElement && a.parentElement.querySelector('.doc__photo-meta');
        var tag = meta && meta.querySelector('.doc__photo-tag');
        var cap = tag ? tag.textContent : (meta ? meta.textContent : '');
        openLb(src, cap);
      });
    });

    // Esc закрывает lightbox
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape') closeLb();
    });
  });
})();
`;
