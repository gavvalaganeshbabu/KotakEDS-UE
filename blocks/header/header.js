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
function buildSearchControl(searchHref) {
  const searchPath = (searchHref || '/en/search').replace(/\.html$/, '');
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
  return wrapper;
}

function buildTools(section) {
  const tools = document.createElement('div');
  tools.className = 'nav-tools';
  if (!section) return tools;

  // Detect search/login from real links first.
  const links = [...section.querySelectorAll('a')].filter((a) => !a.querySelector('img'));
  let hasSearch = false;
  let hasLogin = false;
  let searchHref = '';
  let loginLink = null;
  links.forEach((a) => {
    const label = a.textContent.trim();
    if (/login/i.test(label)) {
      hasLogin = true;
      loginLink = a;
    } else if (/search/i.test(label)) {
      hasSearch = true;
      searchHref = a.getAttribute('href');
    }
  });

  // Fall back to plain text tokens (e.g. authored ":search:" / "Login")
  // so the controls still appear when authors don't add real links.
  const rawText = section.textContent || '';
  if (!hasSearch && /search/i.test(rawText)) hasSearch = true;
  if (!hasLogin && /login/i.test(rawText)) hasLogin = true;

  if (hasSearch) tools.append(buildSearchControl(searchHref));
  if (hasLogin) {
    const a = loginLink || document.createElement('a');
    if (!loginLink) {
      a.href = 'https://www.kotak.bank.in/en/login.html';
      a.textContent = 'Login';
    }
    a.className = 'nav-login';
    a.setAttribute('aria-label', 'Login');
    tools.append(a);
  }
  return tools;
}

/**
 * Build the main menu list from the navigation fragment section.
 * @param {Element} section the navigation fragment section
 * @returns {Element} menu element
 */
function buildMenu(section) {
  const menu = section.querySelector('ul');
  if (!menu) return document.createElement('ul');
  menu.className = 'nav-menu';

  // Extract the leading text label of a top-level <li> and remove the source
  // node. UE may render the label as a bare text node, a <p>, or a <pre>.
  const takeLabel = (li) => {
    const textNode = [...li.childNodes]
      .find((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (textNode) {
      const txt = textNode.textContent.trim();
      textNode.remove();
      return txt;
    }
    const labelEl = [...li.children]
      .find((c) => (c.tagName === 'P' || c.tagName === 'PRE')
        && !c.querySelector('a') && c.textContent.trim());
    if (labelEl) {
      const txt = labelEl.textContent.trim();
      labelEl.remove();
      return txt;
    }
    return '';
  };

  menu.querySelectorAll(':scope > li').forEach((li) => {
    const panel = li.querySelector(':scope > ul');
    if (panel) {
      li.classList.add('nav-has-panel');
      li.setAttribute('aria-expanded', 'false');
      const label = document.createElement('span');
      label.className = 'nav-label';
      label.textContent = takeLabel(li);
      label.setAttribute('role', 'button');
      label.setAttribute('tabindex', '0');
      li.prepend(label);
      panel.className = 'nav-panel';
      if (panel.querySelector('img')) {
        panel.classList.add('nav-panel-icons');
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
