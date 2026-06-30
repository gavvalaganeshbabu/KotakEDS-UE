import { getMetadata } from '../../scripts/aem.js';

/**
 * Fetch and parse the footer fragment HTML for the given path.
 * @param {string} footerPath footer document path without the .plain.html suffix
 * @returns {Promise<Document|null>} parsed fragment document
 */
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
function buildConnect(section) {
  const wrap = document.createElement('div');
  wrap.className = 'footer-connect';
  const headings = [...section.querySelectorAll('h2, h3, h4, h5, h6')];
  const lists = [...section.querySelectorAll('ul')];

  // Connect With Us — social links become icon buttons
  const social = document.createElement('div');
  social.className = 'footer-social';
  if (headings[0]) {
    const t = document.createElement('p');
    t.className = 'footer-col-title';
    t.textContent = headings[0].textContent.trim();
    social.append(t);
  }
  if (lists[0]) {
    lists[0].classList.add('footer-social-list');
    lists[0].querySelectorAll('a').forEach((a) => {
      a.classList.add(`footer-social-${a.textContent.trim().toLowerCase()}`);
      a.setAttribute('aria-label', a.textContent.trim());
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    });
    social.append(lists[0]);
  }
  wrap.append(social);

  // Install the Kotak Bank App — QR + badges
  const app = document.createElement('div');
  app.className = 'footer-app';
  if (headings[1]) {
    const t = document.createElement('p');
    t.className = 'footer-col-title';
    t.textContent = headings[1].textContent.trim();
    app.append(t);
  }
  const qr = section.querySelector('p img');
  if (qr) {
    const qrWrap = document.createElement('div');
    qrWrap.className = 'footer-qr';
    qrWrap.append(qr.closest('p'));
    app.append(qrWrap);
  }
  const badgeList = lists.find((ul) => ul.querySelector('a img'));
  if (badgeList) {
    badgeList.classList.add('footer-badges');
    app.append(badgeList);
  }
  wrap.append(app);

  // Trust seals — the UL with bare <img> (no anchor)
  const sealList = lists.find((ul) => ul.querySelector('img') && !ul.querySelector('a img') && ul !== lists[0]);
  if (sealList) {
    sealList.classList.add('footer-seals');
    wrap.append(sealList);
  }
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

  // Columns come from the first section; connect/copyright from the next two
  // when present. With only one authored section, just render the columns.
  if (sections[0]) footer.append(buildLinkColumns(sections[0]));
  if (sections[1]) footer.append(buildConnect(sections[1]));
  block.append(footer);

  if (sections[2]) block.append(buildCopyright(sections[2]));
}
