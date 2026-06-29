import { moveInstrumentation } from '../../scripts/scripts.js';

function updateActiveSlide(slide) {
  const block = slide.closest('.carousel-hero');
  const slideIndex = parseInt(slide.dataset.slideIndex, 10);
  block.dataset.activeSlide = slideIndex;

  const slides = block.querySelectorAll('.carousel-hero-slide');

  slides.forEach((aSlide, idx) => {
    aSlide.setAttribute('aria-hidden', idx !== slideIndex);
    aSlide.querySelectorAll('a').forEach((link) => {
      if (idx !== slideIndex) {
        link.setAttribute('tabindex', '-1');
      } else {
        link.removeAttribute('tabindex');
      }
    });
  });

  const indicators = block.querySelectorAll('.carousel-hero-slide-indicator');
  indicators.forEach((indicator, idx) => {
    if (idx !== slideIndex) {
      indicator.querySelector('button').removeAttribute('disabled');
    } else {
      indicator.querySelector('button').setAttribute('disabled', 'true');
    }
  });
}

export function showSlide(block, slideIndex = 0) {
  const slides = block.querySelectorAll('.carousel-hero-slide');
  let realSlideIndex = slideIndex < 0 ? slides.length - 1 : slideIndex;
  if (slideIndex >= slides.length) realSlideIndex = 0;
  const activeSlide = slides[realSlideIndex];

  activeSlide.querySelectorAll('a').forEach((link) => link.removeAttribute('tabindex'));
  block.querySelector('.carousel-hero-slides').scrollTo({
    top: 0,
    left: activeSlide.offsetLeft,
    behavior: 'smooth',
  });
}

function bindEvents(block) {
  const slideIndicators = block.querySelector('.carousel-hero-slide-indicators');
  if (!slideIndicators) return;

  slideIndicators.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', (e) => {
      const slideIndicator = e.currentTarget.parentElement;
      showSlide(block, parseInt(slideIndicator.dataset.targetSlide, 10));
    });
  });

  block.querySelector('.slide-prev').addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide, 10) - 1);
  });
  block.querySelector('.slide-next').addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide, 10) + 1);
  });

  const slideObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) updateActiveSlide(entry.target);
    });
  }, { threshold: 0.5 });
  block.querySelectorAll('.carousel-hero-slide').forEach((slide) => {
    slideObserver.observe(slide);
  });

  // auto-advance every 5s; pause on hover/focus and when the tab is hidden
  const AUTOPLAY_MS = 5000;
  let timer = null;
  const advance = () => showSlide(block, parseInt(block.dataset.activeSlide || '0', 10) + 1);
  const start = () => {
    if (timer || document.hidden) return;
    timer = window.setInterval(advance, AUTOPLAY_MS);
  };
  const stop = () => {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  };

  block.addEventListener('mouseenter', stop);
  block.addEventListener('mouseleave', start);
  block.addEventListener('focusin', stop);
  block.addEventListener('focusout', start);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  start();
}

function createSlide(row, slideIndex, carouselId) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = slideIndex;
  slide.setAttribute('id', `carousel-hero-${carouselId}-slide-${slideIndex}`);
  slide.classList.add('carousel-hero-slide');

  const columns = [...row.querySelectorAll(':scope > div')];

  // the cell holding the picture/img is the background image
  const imageCol = columns.find((c) => c.querySelector('picture, img')) || columns[0];
  imageCol.classList.add('carousel-hero-slide-image');
  slide.append(imageCol);

  // Find the theme cell: a short, link/image-free cell whose text is the
  // authored colour choice. The select may render the bare value ("light")
  // or the full label ("Light text (dark background)"), so match the leading
  // word. Note the dark label also contains "light" ("Dark text (light
  // background)"), so we must test the START of the string, not includes().
  const remaining = columns.filter((c) => c !== imageCol);
  let themeCol = null;
  let theme = '';
  remaining.forEach((c) => {
    if (themeCol || c.querySelector('a, picture, img, h1, h2, h3, h4, h5, h6')) return;
    const txt = c.textContent.trim().toLowerCase();
    if (txt.length > 40) return;
    if (/^light\b/.test(txt)) {
      theme = 'light';
      themeCol = c;
    } else if (/^dark\b/.test(txt)) {
      theme = 'dark';
      themeCol = c;
    }
  });
  if (theme) {
    slide.classList.add(`carousel-hero-slide-theme-${theme}`);
    themeCol.remove();
  }

  // merge ALL remaining content cells into a single content container.
  // The Universal Editor emits one cell per model field (text, cta, ...);
  // without merging, each becomes its own absolutely-positioned layer and
  // they overlap. Consolidating restores the single-content-block layout
  // the CSS is written for.
  const content = document.createElement('div');
  content.classList.add('carousel-hero-slide-content');
  remaining
    .filter((c) => c !== themeCol)
    .forEach((c) => {
      while (c.firstChild) content.append(c.firstChild);
    });
  slide.append(content);

  const labeledBy = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (labeledBy) {
    slide.setAttribute('aria-labelledby', labeledBy.getAttribute('id'));
  }

  return slide;
}

let carouselId = 0;
export default async function decorate(block) {
  carouselId += 1;
  block.setAttribute('id', `carousel-hero-${carouselId}`);
  const rows = block.querySelectorAll(':scope > div');
  const isSingleSlide = rows.length < 2;

  const placeholders = {};

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', placeholders.carousel || 'Carousel');

  const container = document.createElement('div');
  container.classList.add('carousel-hero-slides-container');

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add('carousel-hero-slides');
  block.prepend(slidesWrapper);

  let slideIndicators;
  if (!isSingleSlide) {
    const slideIndicatorsNav = document.createElement('nav');
    slideIndicatorsNav.setAttribute('aria-label', placeholders.carouselSlideControls || 'Carousel Slide Controls');
    slideIndicators = document.createElement('ol');
    slideIndicators.classList.add('carousel-hero-slide-indicators');
    slideIndicatorsNav.append(slideIndicators);
    block.append(slideIndicatorsNav);

    const slideNavButtons = document.createElement('div');
    slideNavButtons.classList.add('carousel-hero-navigation-buttons');
    slideNavButtons.innerHTML = `
      <button type="button" class= "slide-prev" aria-label="${placeholders.previousSlide || 'Previous Slide'}"></button>
      <button type="button" class="slide-next" aria-label="${placeholders.nextSlide || 'Next Slide'}"></button>
    `;

    container.append(slideNavButtons);
  }

  rows.forEach((row, idx) => {
    const slide = createSlide(row, idx, carouselId);
    moveInstrumentation(row, slide);
    slidesWrapper.append(slide);

    if (slideIndicators) {
      const indicator = document.createElement('li');
      indicator.classList.add('carousel-hero-slide-indicator');
      indicator.dataset.targetSlide = idx;
      indicator.innerHTML = `<button type="button" aria-label="${placeholders.showSlide || 'Show Slide'} ${idx + 1} ${placeholders.of || 'of'} ${rows.length}"></button>`;
      slideIndicators.append(indicator);
    }
    row.remove();
  });

  container.append(slidesWrapper);
  block.prepend(container);

  // Prioritise the first slide's image as the LCP candidate and defer the rest.
  const slideImages = block.querySelectorAll('.carousel-hero-slide-image img');
  slideImages.forEach((img, idx) => {
    if (idx === 0) {
      img.setAttribute('loading', 'eager');
      img.setAttribute('fetchpriority', 'high');
    } else {
      img.setAttribute('loading', 'lazy');
      img.removeAttribute('fetchpriority');
    }
  });

  if (!isSingleSlide) {
    bindEvents(block);
  }
}
