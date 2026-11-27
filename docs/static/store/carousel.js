(() => {
  'use strict';

  const formatNumber = new Intl.NumberFormat('fa-IR');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const hoverPointer = matchMedia('(hover: hover)');
  const autoplayInterval = 5000;
  const transitionDuration = 430;
  const transitionEasing = 'cubic-bezier(.2, .75, .25, 1)';

  function setupCarousel(carousel) {
    const controls = carousel.querySelector('[data-slide-controls]');
    if (!controls) return;

    const arrows = carousel.querySelector('[data-slide-arrows]');
    const viewport = carousel.querySelector('.showcase-viewport');
    const track = viewport.querySelector('.showcase-track');
    const slides = [...track.querySelectorAll('[data-slide]')];
    const dots = [...controls.querySelectorAll('[data-slide-to]')];
    const count = controls.querySelector('[data-slide-current]');
    const status = controls.querySelector('[data-slide-status]');
    const direction = getComputedStyle(track).direction === 'rtl' ? 1 : -1;
    let active = 0;
    let visible;
    let inView = false;
    let hasEntered = false;
    let animation;
    let timer;
    let photoEntrance;
    let gestureStart;
    let dragged = false;

    function wrap(index) {
      return (index + slides.length) % slides.length;
    }

    function syncSlides(focused, announce = false) {
      const cardsPerView = Number(getComputedStyle(carousel).getPropertyValue('--cards-per-view'));
      visible = Math.min(cardsPerView, slides.length);
      controls.hidden = arrows.hidden = false;

      slides.forEach((slide, index) => {
        const position = wrap(index - active);
        slide.inert = position >= visible;
        if (index === active) dots[index].setAttribute('aria-current', 'true');
        else dots[index].removeAttribute('aria-current');
      });
      count.textContent = formatNumber.format(active + 1);
      preloadAdjacentImages();
      if (announce) status.textContent = slides[active].getAttribute('aria-label');
      if (focused && (document.activeElement === focused || document.activeElement === document.body)) {
        const focusTarget = focused.closest('[data-slide]').inert ? dots[active] : focused;
        if (focusTarget !== document.activeElement) focusTarget.focus({preventScroll: true});
      }
      syncAutoplay();
    }

    function preloadAdjacentImages() {
      if (!inView || visible === slides.length) return;
      const neighbors = new Set([slides[wrap(active + visible)], slides[wrap(active - 1)]]);
      for (const slide of neighbors) {
        for (const image of slide.querySelectorAll('img')) image.loading = 'eager';
      }
    }

    function syncAutoplay(reset = false) {
      const canPlay = inView && !reducedMotion.matches && !document.hidden;
      if (reset || !canPlay) {
        clearInterval(timer);
        timer = undefined;
      }
      if (!canPlay || timer !== undefined) return;
      timer = setInterval(() => {
        const hovering = hoverPointer.matches && carousel.matches(':hover');
        const interacting = gestureStart || hovering ||
          carousel.querySelector(':focus-visible') || document.querySelector('dialog[open]');
        if (!interacting) move(1);
      }, autoplayInterval);
    }

    function move(step, manual = false) {
      if (animation) return;
      if (manual) syncAutoplay(true);

      const focused = track.querySelector(':focus-visible');
      const first = track.firstElementChild;
      const last = track.lastElementChild;
      const distance = first.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap);
      const entering = step > 0 ? slides[wrap(active + visible)] : last;
      if (step < 0) track.prepend(last);

      let edgeCopy;
      if (!reducedMotion.matches && visible === slides.length) {
        // Fill the edge during the move when every original card already fits.
        edgeCopy = entering.cloneNode(true);
        edgeCopy.removeAttribute('data-slide');
        edgeCopy.inert = true;
        edgeCopy.setAttribute('aria-hidden', 'true');
        track.append(edgeCopy);
      }

      function finish() {
        edgeCopy?.remove();
        if (step > 0) track.append(first);
        animation?.cancel();
        animation = null;
        active = wrap(active + step);
        syncSlides(focused, manual);
      }

      if (reducedMotion.matches) {
        finish();
        return;
      }

      const photo = (step > 0 && edgeCopy ? edgeCopy : entering).querySelector('.showcase-visual');
      photoEntrance?.cancel();
      photoEntrance = photo.animate(
        [
          {opacity: .55, transform: 'scale(.92)'},
          {opacity: 1, transform: 'scale(1)'},
        ],
        {duration: transitionDuration, easing: transitionEasing}
      );
      const start = 'translateX(0)';
      const shifted = `translateX(${direction * distance}px)`;
      animation = track.animate(
        {transform: step > 0 ? [start, shifted] : [shifted, start]},
        {duration: transitionDuration, easing: transitionEasing, fill: 'both'}
      );
      animation.onfinish = finish;
    }

    function jumpTo(index) {
      if (animation || active === index) return;
      active = index;
      track.append(...slides.slice(index), ...slides.slice(0, index));
      syncSlides(null, true);
      syncAutoplay(true);
    }

    arrows.querySelector('[data-slide-next]').addEventListener('click', () => move(1, true));
    arrows.querySelector('[data-slide-previous]').addEventListener('click', () => move(-1, true));
    dots.forEach((dot, index) => dot.addEventListener('click', () => jumpTo(index)));

    carousel.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      move(event.key === 'ArrowLeft' ? direction : -direction, true);
    });

    track.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
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

    document.addEventListener('visibilitychange', () => syncAutoplay());
    reducedMotion.addEventListener('change', () => {
      if (reducedMotion.matches) photoEntrance?.cancel();
      if (reducedMotion.matches && animation) animation.finish();
      syncAutoplay();
    });
    carousel.setAttribute('data-carousel-ready', '');
    syncSlides();
    const visibleThreshold = 0.4;
    new IntersectionObserver(([entry]) => {
      inView = entry.intersectionRatio >= visibleThreshold;
      if (inView && !hasEntered) {
        hasEntered = true;
        if (!reducedMotion.matches) {
          carousel.classList.add('introducing');
          setTimeout(() => carousel.classList.remove('introducing'), 900);
        }
      }
      preloadAdjacentImages();
      syncAutoplay();
    }, {threshold: visibleThreshold}).observe(viewport);
    new ResizeObserver(() => {
      if (animation) {
        animation.finish();
        return;
      }
      syncSlides(track.querySelector(':focus-visible'));
    }).observe(viewport);
  }

  document.querySelectorAll('[data-carousel]').forEach(setupCarousel);
})();
