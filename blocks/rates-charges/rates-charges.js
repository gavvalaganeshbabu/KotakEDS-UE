import { moveInstrumentation } from '../../scripts/scripts.js';

function isUrlOnly(el) {
  const t = (el.textContent || '').trim();
  return t.length > 0 && !/\s/.test(t) && /^https?:\/\/\S+$/.test(t);
}

export default function decorate(block) {
  const rows = [...block.children];
  const cellOf = (r) => r.querySelector(':scope > div') || r;

  // accordion item rows contain an icon picture; everything else is chrome
  const itemRows = rows.filter((r) => r.querySelector('picture'));
  const chromeRows = rows.filter((r) => !r.querySelector('picture'));

  // chrome: a lone link/URL is the "see all" link; a lone short text is the title
  let seeAllHref = '';
  let seeAllText = '';
  let title = '';
  chromeRows.forEach((r) => {
    const cell = cellOf(r);
    const link = cell.querySelector('a');
    if (link) {
      seeAllHref = link.getAttribute('href');
      seeAllText = link.textContent.trim();
    } else if (isUrlOnly(cell)) {
      seeAllHref = cell.textContent.trim();
    } else {
      const txt = cell.textContent.trim();
      if (txt) {
        // the longer non-url text is the see-all label if we already have a href
        if (seeAllHref && !seeAllText) seeAllText = txt;
        else if (!title) title = txt;
        else seeAllText = txt;
      }
    }
  });

  const wrapper = document.createElement('div');
  wrapper.className = 'rates-charges-inner';

  // header
  const header = document.createElement('div');
  header.className = 'rates-charges-header';
  header.textContent = title || 'Rates & Charges';
  wrapper.append(header);

  // accordion list
  const list = document.createElement('div');
  list.className = 'rates-charges-list';

  itemRows.forEach((row) => {
    const cells = [...row.children].map((c) => c.querySelector(':scope > div') || c);
    const iconCell = cells.find((c) => c.querySelector('picture'));
    const rest = cells.filter((c) => c !== iconCell);
    // label: first non-empty plain-text cell; remaining rich content = panel
    const labelCell = rest.find((c) => c.textContent.trim()
      && !c.querySelector('h1, h2, h3, h4, h5, h6, ul, ol'));
    const panelCells = rest.filter((c) => c !== labelCell && c.textContent.trim());

    const item = document.createElement('div');
    item.className = 'rates-charges-item';
    moveInstrumentation(row, item);

    const head = document.createElement('button');
    head.type = 'button';
    head.className = 'rates-charges-item-head';
    head.setAttribute('aria-expanded', 'false');

    const icon = document.createElement('span');
    icon.className = 'rates-charges-item-icon';
    if (iconCell) {
      const pic = iconCell.querySelector('picture');
      if (pic) icon.append(pic);
    }

    const label = document.createElement('span');
    label.className = 'rates-charges-item-label';
    label.textContent = labelCell ? labelCell.textContent.trim() : '';

    const chevron = document.createElement('span');
    chevron.className = 'rates-charges-item-chevron';

    head.append(icon, label, chevron);

    const panel = document.createElement('div');
    panel.className = 'rates-charges-item-panel';
    panel.hidden = true;
    panelCells.forEach((c) => {
      while (c.firstChild) panel.append(c.firstChild);
    });

    head.addEventListener('click', () => {
      const open = head.getAttribute('aria-expanded') === 'true';
      // close siblings
      list.querySelectorAll('.rates-charges-item-head[aria-expanded="true"]').forEach((h) => {
        h.setAttribute('aria-expanded', 'false');
        h.parentElement.querySelector('.rates-charges-item-panel').hidden = true;
      });
      if (!open) {
        head.setAttribute('aria-expanded', 'true');
        panel.hidden = false;
      }
    });

    item.append(head, panel);
    list.append(item);
  });

  wrapper.append(list);

  // footer see-all link
  if (seeAllHref) {
    const footer = document.createElement('div');
    footer.className = 'rates-charges-footer';
    const a = document.createElement('a');
    a.href = seeAllHref;
    a.className = 'rates-charges-seeall';
    a.textContent = seeAllText || 'See all rates';
    footer.append(a);
    wrapper.append(footer);
  }

  block.textContent = '';
  block.append(wrapper);
}
