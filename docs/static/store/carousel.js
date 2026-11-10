(() => {
  'use strict';

  const carousel = document.querySelector('[data-carousel]');
  const controls = carousel?.querySelector('[data-slide-controls]');
  if (!controls) return;

  const arrows = carousel.querySelector('[data-slide-arrows]');
  const viewport = carousel.querySelector('.showcase-viewport');
  const track = viewport.querySelector('.showcase-track');
  const slides = [...track.querySelectorAll('[data-slide]')];
  const dots = [...controls.querySelectorAll('[data-slide-to]')];
  const count = controls.querySelector('[data-slide-current]');
  const status = controls.querySelector('[data-slide-status]');
  const formatNumber = new Intl.NumberFormat('fa-IR');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const direction = getComputedStyle(track).direction === 'rtl' ? 1 : -1;
  let active = 0;
  let visible;
  let animation;
  let timer;
  let gestureStart;
  let dragged = false;

  function wrap(index) {
    return (index + slides.length) % slides.length;
  }

  function syncSlides(focused, announce = false) {
    const cardsPerView = Number(getComputedStyle(carousel).getPropertyValue('--cards-per-view'));
    visible = Math.min(cardsPerView, slides.length);
    controls.hidden = arrows.hidden = visible === slides.length;

    slides.forEach((slide, index) => {
      const position = wrap(index - active);
      slide.inert = position >= visible;
      if (position <= visible || position === slides.length - 1) {
        for (const image of slide.querySelectorAll('img')) image.loading = 'eager';
      }
      if (index === active) dots[index].setAttribute('aria-current', 'true');
      else dots[index].removeAttribute('aria-current');
    });
    count.textContent = formatNumber.format(active + 1);
    if (announce) status.textContent = slides[active].getAttribute('aria-label');
    if (focused && focused.closest('[data-slide]').inert && !controls.hidden &&
        (document.activeElement === focused || document.activeElement === document.body)) {
      dots[active].focus({preventScroll: true});
    }
  }

  function scheduleSlide() {
    clearTimeout(timer);
    if (visible === slides.length || reducedMotion.matches || document.hidden) return;
    timer = setTimeout(() => {
      if (gestureStart || track.querySelector(':focus-visible') || document.querySelector('dialog[open]')) {
        scheduleSlide();
        return;
      }
      move(1);
    }, 5000);
  }

  function move(step, announce = false) {
    if (visible === slides.length || animation) return;
    clearTimeout(timer);

    const focused = track.querySelector(':focus-visible');
    const first = track.firstElementChild;
    const distance = first.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap);
    // Rotate the original cards at the edge of the window to keep the loop continuous.
    if (step < 0) track.prepend(track.lastElementChild);

    function finish() {
      if (step > 0) track.append(first);
      animation?.cancel();
      animation = null;
      active = wrap(active + step);
      syncSlides(focused, announce);
      scheduleSlide();
    }

    if (reducedMotion.matches) {
      finish();
      return;
    }
    const start = 'translateX(0)';
    const shifted = `translateX(${direction * distance}px)`;
    animation = track.animate(
      {transform: step > 0 ? [start, shifted] : [shifted, start]},
      {duration: 340, easing: 'cubic-bezier(.2, .75, .25, 1)', fill: 'both'}
    );
    animation.onfinish = finish;
  }

  function jumpTo(index) {
    if (animation || active === index) return;
    active = index;
    track.append(...slides.slice(index), ...slides.slice(0, index));
    syncSlides(null, true);
    scheduleSlide();
  }

  arrows.querySelector('[data-slide-next]').addEventListener('click', () => move(1, true));
  arrows.querySelector('[data-slide-previous]').addEventListener('click', () => move(-1, true));
  dots.forEach((dot, index) => dot.addEventListener('click', () => jumpTo(index)));

  carousel.addEventListener('keydown', event => {
    if (visible === slides.length || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    move(event.key === 'ArrowLeft' ? direction : -direction, true);
  });

  track.addEventListener('pointerdown', event => {
    if (visible === slides.length || !event.isPrimary || event.button !== 0) return;
    dragged = false;
    gestureStart = {id: event.pointerId, x: event.clientX, y: event.clientY};
  });
  track.addEventListener('pointerup', event => {
    if (gestureStart?.id !== event.pointerId) return;
    const dx = event.clientX - gestureStart.x;
    const dy = event.clientY - gestureStart.y;
    gestureStart = undefined;
    if (Math.abs(dx) < 44 || Math.abs(dx) <= Math.abs(dy)) return;
    dragged = true;
    move(dx > 0 ? direction : -direction, true);
  });
  function endGesture(event) {
    if (gestureStart?.id === event.pointerId) gestureStart = undefined;
  }
  track.addEventListener('pointercancel', endGesture);
  track.addEventListener('pointerleave', endGesture);
  track.addEventListener('click', event => {
    if (!dragged || !event.detail) return;
    dragged = false;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  document.addEventListener('visibilitychange', scheduleSlide);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches && animation) animation.finish();
    else scheduleSlide();
  });
  carousel.setAttribute('data-carousel-ready', '');
  syncSlides();
  scheduleSlide();
  new ResizeObserver(() => {
    if (animation) {
      animation.finish();
      return;
    }
    syncSlides(track.querySelector(':focus-visible'));
    scheduleSlide();
  }).observe(viewport);
})();
