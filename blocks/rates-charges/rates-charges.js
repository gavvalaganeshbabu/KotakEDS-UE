import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
  const rows = [...block.children];

  // An item row is the one carrying an icon picture. Everything else is a
  // block-level "chrome" row (title / see-all link), which may render as one
  // row of several cells or as separate rows.
  const itemRows = rows.filter((r) => r.querySelector('picture'));
  const chromeRows = rows.filter((r) => !r.querySelector('picture'));

  // pull title + see-all link from the chrome rows, scanning every cell
  let title = '';
  let seeAllHref = '';
  let seeAllText = '';
  chromeRows.forEach((r) => {
    [...r.children].forEach((cell) => {
      const link = cell.querySelector('a');
      const txt = cell.textContent.trim();
      if (link && link.getAttribute('href')) {
        seeAllHref = link.getAttribute('href');
        if (link.textContent.trim()) seeAllText = link.textContent.trim();
      } else if (txt && /^https?:\/\/\S+$/.test(txt)) {
        seeAllHref = txt;
      } else if (txt) {
        if (!title) title = txt;
        else if (!seeAllText) seeAllText = txt;
      }
    });
  });

  const wrapper = document.createElement('div');
  wrapper.className = 'rates-charges-inner';

  const header = document.createElement('div');
  header.className = 'rates-charges-header';
  header.textContent = title || 'Rates & Charges';
  wrapper.append(header);

  const list = document.createElement('div');
  list.className = 'rates-charges-list';

  itemRows.forEach((row) => {
    const cells = [...row.children];
    const iconCell = cells.find((c) => c.querySelector('picture'));
    const rest = cells.filter((c) => c !== iconCell);
    // first text-only cell is the label; the rest (rich content) is the panel
    const labelCell = rest.find((c) => c.textContent.trim());
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
    const pic = iconCell ? iconCell.querySelector('picture') : null;
    if (pic) icon.append(pic);

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
      // a panel cell may wrap its rich content in an extra div; unwrap it
      const inner = c.querySelector(':scope > div') || c;
      while (inner.firstChild) panel.append(inner.firstChild);
    });

    head.addEventListener('click', () => {
      const open = head.getAttribute('aria-expanded') === 'true';
      list.querySelectorAll('.rates-charges-item-head[aria-expanded="true"]').forEach((h) => {
        h.setAttribute('aria-expanded', 'false');
        const p = h.nextElementSibling;
        if (p) p.hidden = true;
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
