import { getMetadata } from '../../scripts/aem.js';

/**
 * Fetch and parse the footer fragment HTML for the given path.
 * @param {string} footerPath footer document path without the .plain.html suffix
 * @returns {Promise<Document|null>} parsed fragment document
 */
const IMG_EXT = /\.(?:png|jpe?g|webp|gif|svg)(?:\?|$)/i;

async function fetchFooter(footerPath) {
  const resp = await fetch(`${footerPath}.plain.html`);
  if (!resp.ok) return null;
  const html = await resp.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const baseDir = footerPath.replace(/[^/]+$/, '');
  doc.querySelectorAll('img[src]').forEach((img) => {
    const src = img.getAttribute('src');
    if (src && !/^(https?:|\/|data:)/.test(src)) {
      img.setAttribute('src', `${baseDir}${src}`);
    }
  });
  // Authors may paste image asset paths as link text instead of inserting an
  // image. Convert any link whose href OR text is an image path into an <img>.
  doc.querySelectorAll('a').forEach((a) => {
    const href = a.getAttribute('href') || '';
    const txt = a.textContent.trim();
    let path = '';
    if (IMG_EXT.test(href)) path = href;
    else if (IMG_EXT.test(txt)) path = txt;
    if (path) {
      const img = document.createElement('img');
      img.src = path;
      img.alt = '';
      img.loading = 'lazy';
      a.replaceWith(img);
    }
  });
  // Authors may also paste literal "<img ...>" tags as text (sometimes with
  // spaces stripped, e.g. "<imgsrc=..."). Find any element whose own text
  // contains such markup and replace it with the real image(s).
  doc.querySelectorAll('li, p, div, span').forEach((el) => {
    // only act on elements that directly hold the img-markup text
    if (!/<img/i.test(el.textContent || '')) return;
    if (![...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && /<img/i.test(n.textContent))) return;
    const raw = el.textContent;
    const imgTags = raw.match(/<img[^>]*>/gi);
    if (!imgTags) return;
    const frag = doc.createDocumentFragment();
    imgTags.forEach((tag) => {
      const srcMatch = tag.match(/src\s*=\s*["']([^"']+)["']/i);
      if (!srcMatch) return;
      const altMatch = tag.match(/alt\s*=\s*["']([^"']*)["']/i);
      const img = document.createElement('img');
      const [, srcVal] = srcMatch;
      img.src = srcVal;
      img.alt = altMatch ? altMatch[1] : '';
      img.loading = 'lazy';
      frag.append(img);
    });
    if (frag.childNodes.length) {
      el.textContent = '';
      el.append(frag);
    }
  });
  return doc;
}

/**
 * Build the link-columns section: a sequence of heading + <ul> of links.
 * @param {Element} section the first fragment section
 * @returns {Element} columns element
 */
function buildLinkColumns(section) {
  const wrap = document.createElement('div');
  wrap.className = 'footer-columns';
  // Headings/lists may be nested inside a content wrapper div, so find the
  // headings anywhere in the section and pair each with the next list.
  section.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((node) => {
    const col = document.createElement('div');
    col.className = 'footer-col';
    const title = document.createElement('p');
    title.className = 'footer-col-title';
    title.textContent = node.textContent.trim();
    col.append(title);
    const list = node.nextElementSibling;
    if (list && list.tagName === 'UL') {
      list.classList.add('footer-col-links');
      col.append(list);
    }
    wrap.append(col);
  });
  return wrap;
}

/**
 * Build the connect/app/trust section.
 * @param {Element} section the second fragment section
 * @returns {Element} connect element
 */
const SOCIAL_NAMES = ['facebook', 'twitter', 'youtube', 'linkedin', 'instagram'];

function buildConnect(section) {
  const wrap = document.createElement('div');
  wrap.className = 'footer-connect';

  // --- Social: structure-independent. Find every element whose text is a
  // known social name and rebuild a clean icon list, regardless of nesting. ---
  const social = document.createElement('div');
  social.className = 'footer-social';

  // pick a label heading for the social group if one is present
  const labelEl = [...section.querySelectorAll('h1, h2, h3, h4, h5, h6, p')]
    .find((el) => /connect|follow|social/i.test(el.textContent || ''));
  if (labelEl) {
    const t = document.createElement('p');
    t.className = 'footer-col-title';
    t.textContent = labelEl.textContent.trim();
    social.append(t);
  }

  const socialList = document.createElement('ul');
  socialList.className = 'footer-social-list';
  const seen = new Set();
  section.querySelectorAll('a, li').forEach((el) => {
    if (el.querySelector('a, li, ul')) return; // only leaf nodes
    const name = el.textContent.trim();
    const key = name.toLowerCase();
    if (!SOCIAL_NAMES.includes(key) || seen.has(key)) return;
    seen.add(key);
    const href = el.tagName === 'A' ? el.getAttribute('href') : (el.querySelector('a')?.getAttribute('href'));
    const a = document.createElement('a');
    a.href = href || '#';
    a.className = `footer-social-${key}`;
    a.setAttribute('aria-label', name);
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener');
    const li = document.createElement('li');
    li.append(a);
    socialList.append(li);
  });
  if (socialList.children.length) social.append(socialList);
  wrap.append(social);

  // --- App: QR + store badges from loose images ---
  const looseImages = [...section.querySelectorAll('img')];
  const app = document.createElement('div');
  app.className = 'footer-app';
  const appLabel = [...section.querySelectorAll('h1, h2, h3, h4, h5, h6, p')]
    .find((el) => /install|app|download/i.test(el.textContent || ''));
  if (appLabel) {
    const t = document.createElement('p');
    t.className = 'footer-col-title';
    t.textContent = appLabel.textContent.trim();
    app.append(t);
  }
  if (looseImages[0]) {
    const qrWrap = document.createElement('div');
    qrWrap.className = 'footer-qr';
    qrWrap.append(looseImages[0]);
    app.append(qrWrap);
  }
  const badgeImgs = looseImages.slice(1);
  if (badgeImgs.length) {
    const badges = document.createElement('div');
    badges.className = 'footer-badges';
    badgeImgs.forEach((img) => badges.append(img));
    app.append(badges);
  }
  wrap.append(app);

  return wrap;
}

/**
 * Build the bottom copyright bar.
 * @param {Element} section the third fragment section
 * @returns {Element} copyright element
 */
function buildCopyright(section) {
  const bar = document.createElement('div');
  bar.className = 'footer-copyright';
  const text = section.querySelector('p');
  if (text) bar.append(text);
  const links = section.querySelector('ul');
  if (links) {
    links.classList.add('footer-legal-links');
    bar.append(links);
  }
  return bar;
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await fetchFooter(footerPath);

  block.textContent = '';
  if (!fragment) return;

  const sections = [...fragment.body.children];
  const footer = document.createElement('div');
  footer.className = 'footer-inner';

  // Classify each section by content rather than position:
  // - connect: mentions "connect with us" or "install the" app, or has images
  // - copyright: has a paragraph starting with "copyright"/"©"
  // - columns: everything else (heading + link-list groups)
  let connectSection = null;
  let copyrightSection = null;
  const columnSections = [];
  sections.forEach((sec) => {
    const text = (sec.textContent || '').toLowerCase();
    if (/connect with us|install the/.test(text)) {
      connectSection = connectSection || sec;
    } else if (/copyright|©/.test(text)) {
      copyrightSection = copyrightSection || sec;
    } else {
      columnSections.push(sec);
    }
  });

  const columnsWrap = document.createElement('div');
  columnsWrap.className = 'footer-columns';
  columnSections.forEach((sec) => {
    const built = buildLinkColumns(sec);
    while (built.firstChild) columnsWrap.append(built.firstChild);
  });
  if (columnsWrap.children.length) footer.append(columnsWrap);

  if (connectSection) footer.append(buildConnect(connectSection));
  block.append(footer);

  if (copyrightSection) block.append(buildCopyright(copyrightSection));
}
