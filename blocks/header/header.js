import { getMetadata } from '../../scripts/aem.js';

// media query match that indicates desktop width
const isDesktop = window.matchMedia('(min-width: 900px)');

/**
 * Fetch the nav fragment HTML, trying the local content path first
 * (localhost / aem up) then the metadata-driven path (DA/EDS production).
 * @param {string} navPath nav document path without the .plain.html suffix
 * @returns {Promise<Document|null>} parsed fragment document
 */
async function fetchNav(navPath) {
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) resp = await fetch(`${navPath}.plain.html`);
  if (!resp.ok) return null;
  const html = await resp.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // The fragment lives under /content/, but its <img> srcs are authored relative
  // (e.g. "images/nav/..."). Without a fragment base URL the browser resolves them
  // against the current page, 404-ing. Re-root relative nav image paths to /content/.
  doc.querySelectorAll('img[src]').forEach((img) => {
    const src = img.getAttribute('src');
    if (src && !/^(https?:|\/|data:)/.test(src)) {
      img.setAttribute('src', `/content/${src}`);
    }
  });
  return doc;
}

/**
 * Close every open top-level menu.
 * @param {Element} menu the nav menu list
 */
function closeAllMenus(menu) {
  menu.querySelectorAll(':scope > li[aria-expanded="true"]').forEach((li) => {
    li.setAttribute('aria-expanded', 'false');
  });
}

/**
 * Build the brand block (logo link) from the first fragment section.
 * @param {Element} section the first fragment section
 * @returns {Element} brand element
 */
function buildBrand(section) {
  const brand = document.createElement('div');
  brand.className = 'nav-brand';
  const logoLink = section.querySelector('a img')?.closest('a');
  if (logoLink) brand.append(logoLink);
  return brand;
}

/**
 * Build the tools block (search + login) from the first fragment section.
 * @param {Element} section the first fragment section
 * @returns {Element} tools element
 */
function buildTools(section) {
  const tools = document.createElement('div');
  tools.className = 'nav-tools';
  const links = [...section.querySelectorAll('a')].filter((a) => !a.querySelector('img'));
  links.forEach((a) => {
    const label = a.textContent.trim();
    if (/login/i.test(label)) {
      a.className = 'nav-login';
      a.setAttribute('aria-label', 'Login');
      tools.append(a);
    } else if (/search/i.test(label)) {
      // Replace the static search link with an expanding search control:
      // clicking the icon reveals an input; submitting navigates to the
      // search page with the query. The page path comes from the authored
      // link href (e.g. /en/search.html), normalised to its clean URL.
      const searchPath = (a.getAttribute('href') || '/en/search').replace(/\.html$/, '');
      const wrapper = document.createElement('div');
      wrapper.className = 'nav-search';

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'nav-search-toggle';
      toggle.setAttribute('aria-label', 'Search');
      toggle.setAttribute('aria-expanded', 'false');

      const form = document.createElement('form');
      form.className = 'nav-search-form';
      form.action = searchPath;
      form.setAttribute('role', 'search');
      const input = document.createElement('input');
      input.type = 'search';
      input.name = 'q';
      input.className = 'nav-search-input';
      input.placeholder = 'Search';
      input.setAttribute('aria-label', 'Search');
      form.append(input);

      toggle.addEventListener('click', () => {
        const open = wrapper.classList.toggle('nav-search-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) input.focus();
      });
      form.addEventListener('submit', (e) => {
        if (!input.value.trim()) e.preventDefault();
      });

      wrapper.append(toggle, form);
      tools.append(wrapper);
    } else {
      tools.append(a);
    }
  });
  return tools;
}

/**
 * Build the main menu list from the navigation fragment section.
 * @param {Element} section the navigation fragment section
 * @returns {Element} menu element
 */
function buildMenu(section) {
  const menu = section.querySelector('ul');
  menu.className = 'nav-menu';

  // Extract the leading text label of a list item and remove its source node.
  // Handles both shapes: a bare text node (local plain.html) and a leading
  // <p> wrapper that does not contain a link (DA/markdown-processed nav).
  const takeLabel = (li) => {
    const textNode = [...li.childNodes]
      .find((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (textNode) {
      const txt = textNode.textContent.trim();
      textNode.remove();
      return txt;
    }
    const labelP = [...li.children]
      .find((c) => c.tagName === 'P' && !c.querySelector('a') && c.textContent.trim());
    if (labelP) {
      const txt = labelP.textContent.trim();
      labelP.remove();
      return txt;
    }
    return '';
  };

  menu.querySelectorAll(':scope > li').forEach((li) => {
    const panel = li.querySelector(':scope > ul');
    if (panel) {
      li.classList.add('nav-has-panel');
      li.setAttribute('aria-expanded', 'false');
      // wrap the leading text label in a button-like span
      const label = document.createElement('span');
      label.className = 'nav-label';
      label.textContent = takeLabel(li);
      label.setAttribute('role', 'button');
      label.setAttribute('tabindex', '0');
      li.prepend(label);
      panel.className = 'nav-panel';
      // mark icon panels (those containing images) for grid layout
      if (panel.querySelector('img')) {
        panel.classList.add('nav-panel-icons');
        // wrap each category group's leading label (text node or <p>) in a
        // heading span so it can be styled as a mega-menu column title
        panel.querySelectorAll(':scope > li').forEach((groupLi) => {
          if (!groupLi.querySelector(':scope > ul')) return;
          const headTxt = takeLabel(groupLi);
          if (headTxt) {
            const heading = document.createElement('span');
            heading.className = 'nav-panel-heading';
            heading.textContent = headTxt;
            groupLi.prepend(heading);
          }
        });
      }
    }
  });
  return menu;
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await fetchNav(navPath);

  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-expanded', 'false');

  if (!fragment) {
    block.append(nav);
    return;
  }

  const sections = [...fragment.body.children];
  const brand = buildBrand(sections[0]);
  const tools = buildTools(sections[0]);
  const menu = sections[1] ? buildMenu(sections[1]) : document.createElement('ul');

  // hamburger (mobile)
  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = '<button type="button" aria-controls="nav" aria-label="Open navigation"><span class="nav-hamburger-icon"></span></button>';
  hamburger.addEventListener('click', () => {
    const expanded = nav.getAttribute('aria-expanded') === 'true';
    nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    hamburger.querySelector('button').setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
    document.body.style.overflowY = expanded || isDesktop.matches ? '' : 'hidden';
  });

  // panel open/close behavior — hover on desktop, click/tap on mobile
  menu.querySelectorAll(':scope > li.nav-has-panel').forEach((li) => {
    const label = li.querySelector(':scope > .nav-label');

    li.addEventListener('mouseenter', () => {
      if (isDesktop.matches) {
        closeAllMenus(menu);
        li.setAttribute('aria-expanded', 'true');
      }
    });
    li.addEventListener('mouseleave', () => {
      if (isDesktop.matches) li.setAttribute('aria-expanded', 'false');
    });
    const toggle = () => {
      const expanded = li.getAttribute('aria-expanded') === 'true';
      if (!isDesktop.matches) {
        li.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      }
    };
    label.addEventListener('click', toggle);
    label.addEventListener('keydown', (e) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        toggle();
      }
    });
  });

  // close desktop menus on outside click / escape
  document.addEventListener('click', (e) => {
    if (isDesktop.matches && !nav.contains(e.target)) closeAllMenus(menu);
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') closeAllMenus(menu);
  });

  nav.append(hamburger, brand, menu, tools);

  // reset state when crossing the desktop/mobile breakpoint
  isDesktop.addEventListener('change', () => {
    closeAllMenus(menu);
    nav.setAttribute('aria-expanded', 'false');
    document.body.style.overflowY = '';
    hamburger.querySelector('button').setAttribute('aria-label', 'Open navigation');
  });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
