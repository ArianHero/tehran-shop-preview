(() => {
  'use strict';

  const carousel = document.querySelector('[data-carousel]');
  const controls = carousel?.querySelector('[data-slide-controls]');
  if (!controls) return;

  const track = carousel.querySelector('.showcase-track');
  const slides = [...track.querySelectorAll('[data-slide]')];
  const dots = [...controls.querySelectorAll('[data-slide-to]')];
  const toggle = controls.querySelector('[data-slide-toggle]');
  const count = controls.querySelector('[data-slide-current]');
  const status = controls.querySelector('[data-slide-status]');
  const formatNumber = new Intl.NumberFormat('fa-IR');
  let active = 0;
  let timer;
  let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let gestureStart;
  let dragged = false;

  function prepareNextImage() {
    for (const image of slides[(active + 1) % slides.length].querySelectorAll('img')) {
      image.loading = 'eager';
    }
  }

  function showSlide(index, announce = false) {
    const next = (index + slides.length) % slides.length;
    if (next === active) return;
    const focusedSlide = slides[active].contains(document.activeElement);
    slides[active].hidden = true;
    dots[active].removeAttribute('aria-current');
    active = next;
    slides[active].hidden = false;
    dots[active].setAttribute('aria-current', 'true');
    count.textContent = formatNumber.format(active + 1);
    prepareNextImage();
    if (announce) {
      status.textContent = slides[active].getAttribute('aria-label');
      if (focusedSlide) dots[active].focus({preventScroll: true});
    }
  }

  function scheduleSlide() {
    clearTimeout(timer);
    if (paused || document.hidden) return;
    timer = setTimeout(() => {
      if (!gestureStart && !track.querySelector(':focus-visible') && !document.querySelector('dialog[open]')) {
        showSlide(active + 1);
      }
      scheduleSlide();
    }, 5000);
  }

  function navigate(index) {
    showSlide(index, true);
    scheduleSlide();
  }

  function updatePlaybackButton() {
    const label = paused ? 'شروع پخش خودکار' : 'توقف پخش خودکار';
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
    toggle.querySelector('use').setAttribute('href', paused ? '#i-play' : '#i-pause');
  }

  controls.querySelector('[data-slide-next]').addEventListener('click', () => navigate(active + 1));
  controls.querySelector('[data-slide-previous]').addEventListener('click', () => navigate(active - 1));
  dots.forEach((dot, index) => dot.addEventListener('click', () => navigate(index)));
  toggle.addEventListener('click', () => {
    paused = !paused;
    updatePlaybackButton();
    scheduleSlide();
  });

  carousel.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    navigate(active + (event.key === 'ArrowLeft' ? 1 : -1));
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
    navigate(active + (dx > 0 ? 1 : -1));
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
  updatePlaybackButton();
  controls.hidden = false;
  prepareNextImage();
  scheduleSlide();
})();
