import { getMetadata } from '../../scripts/aem.js';

// media query match that indicates desktop width
const isDesktop = window.matchMedia('(min-width: 900px)');

/**
 * Fetch and parse the nav fragment HTML for the given path.
 * @param {string} navPath nav document path without the .plain.html suffix
 * @returns {Promise<Document|null>} parsed fragment document
 */
async function fetchNav(navPath) {
  const resp = await fetch(`${navPath}.plain.html`);
  if (!resp.ok) return null;
  const html = await resp.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // re-root any relative image srcs against the nav document's directory so
  // they resolve regardless of the current page path
  const baseDir = navPath.replace(/[^/]+$/, '');
  doc.querySelectorAll('img[src]').forEach((img) => {
    const src = img.getAttribute('src');
    if (src && !/^(https?:|\/|data:)/.test(src)) {
      img.setAttribute('src', `${baseDir}${src}`);
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
  if (!section) return brand;
  // prefer a linked logo (<a><img></a>); fall back to a bare image/picture
  const logoLink = section.querySelector('a img')?.closest('a');
  if (logoLink) {
    brand.append(logoLink);
  } else {
    const pic = section.querySelector('picture, img');
    if (pic) brand.append(pic.closest('picture') || pic);
  }
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
      // search page with the query.
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
    }
    // any other links in the brand section are ignored here — the menu items
    // belong in the second section as a list, not in tools
  });
  return tools;
}

/**
 * Build the main menu list from the navigation fragment section.
 * @param {Element} section the navigation fragment section
 * @returns {Element} menu element
 */
function buildMenu(section) {
  const menu = document.createElement('ul');
  menu.className = 'nav-menu';

  // The menu is authored as a flat sequence: a heading (h2-h6) is a top-level
  // nav item; the bullet list that follows it becomes that item's dropdown
  // panel. This avoids needing nested lists in the UE rich-text editor.
  // A heading with no following list, or a standalone link, is a plain item.
  // gather the heading/list/link elements in document order
  const flow = [];
  section.querySelectorAll('h2, h3, h4, h5, h6, ul, ol, p').forEach((el) => {
    // skip lists/paragraphs that are nested inside another captured list
    if (el.closest('ul, ol') && (el.tagName === 'UL' || el.tagName === 'OL' || el.tagName === 'P')) return;
    flow.push(el);
  });

  const makeItem = (labelText, panelList) => {
    const li = document.createElement('li');
    if (panelList && panelList.querySelector('a, li')) {
      li.classList.add('nav-has-panel');
      li.setAttribute('aria-expanded', 'false');
      const label = document.createElement('span');
      label.className = 'nav-label';
      label.textContent = labelText;
      label.setAttribute('role', 'button');
      label.setAttribute('tabindex', '0');
      li.append(label);
      panelList.className = 'nav-panel';
      li.append(panelList);
      if (panelList.querySelector('img')) panelList.classList.add('nav-panel-icons');
    } else {
      // plain link item
      const a = document.createElement('a');
      a.textContent = labelText;
      li.append(a);
    }
    menu.append(li);
  };

  for (let i = 0; i < flow.length; i += 1) {
    const el = flow[i];
    if (/^H[2-6]$/.test(el.tagName)) {
      const next = flow[i + 1];
      if (next && (next.tagName === 'UL' || next.tagName === 'OL')) {
        makeItem(el.textContent.trim(), next);
        i += 1; // consume the list
      } else {
        // heading that itself wraps a link, or a label-only item
        const link = el.querySelector('a');
        const li = document.createElement('li');
        if (link) li.append(link);
        else {
          const a = document.createElement('a');
          a.textContent = el.textContent.trim();
          li.append(a);
        }
        menu.append(li);
      }
    }
  }

  // Fallback: if no headings were used but a top-level list exists, treat each
  // top-level <li> that contains a nested <ul> as a panel (legacy nested style)
  if (!menu.children.length) {
    const rootList = section.querySelector('ul');
    if (rootList) {
      rootList.className = 'nav-menu';
      return rootList;
    }
  }

  return menu;
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // Mirror the footer block's resolution: default to the bare "/nav" path,
  // which the delivery host maps to the site's nav page (same as "/footer").
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
