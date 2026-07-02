import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * CC Steps — "Apply online in 3 simple steps".
 * Heading + sub-heading + a row of step cards (icon + title + description)
 * and a CTA button. Step items carry an icon image; the container's own
 * heading/subtitle/CTA are icon-free rows.
 *
 * Child rows keep their data-aue-* instrumentation via moveInstrumentation so
 * they remain editable in Universal Editor (rebuilding from textContent would
 * drop the instrumentation and the child would disappear from the editor).
 * @param {Element} block the block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const itemRows = rows.filter((r) => r.querySelector('picture'));
  const chromeRows = rows.filter((r) => !r.querySelector('picture'));

  // chrome: heading, sub-heading, then the CTA (a link) + its label
  let heading = '';
  let subtitle = '';
  let ctaHref = '';
  let ctaText = '';
  chromeRows.forEach((r) => {
    const cell = r.querySelector(':scope > div') || r;
    const link = cell.querySelector('a');
    const txt = cell.textContent.trim();
    if (link) {
      ctaHref = link.getAttribute('href');
      if (link.textContent.trim()) ctaText = link.textContent.trim();
    } else if (txt) {
      if (!heading) heading = txt;
      else if (!subtitle) subtitle = txt;
      else if (!ctaText) ctaText = txt;
    }
  });

  const wrapper = document.createElement('div');
  wrapper.className = 'cc-steps-inner';

  if (heading) {
    const h = document.createElement('h2');
    h.className = 'cc-steps-title';
    h.textContent = heading;
    wrapper.append(h);
  }
  if (subtitle) {
    const p = document.createElement('p');
    p.className = 'cc-steps-subtitle';
    p.textContent = subtitle;
    wrapper.append(p);
  }

  const list = document.createElement('ul');
  list.className = 'cc-steps-list';
  itemRows.forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cc-steps-item';
    // preserve instrumentation and MOVE the authored cells into the <li>
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);

    // classify the moved cells: icon (picture) vs title vs description
    [...li.children].forEach((cell) => {
      if (cell.querySelector('picture')) {
        cell.className = 'cc-steps-icon';
      } else if (cell.querySelector('p, ul, ol')) {
        cell.className = 'cc-steps-item-desc';
      } else if (cell.textContent.trim()) {
        cell.className = 'cc-steps-item-title';
      }
    });

    list.append(li);
  });
  wrapper.append(list);

  // optimise icon images while preserving their instrumentation
  list.querySelectorAll('picture > img').forEach((img) => {
    const opt = createOptimizedPicture(img.src, img.alt, false, [{ width: '80' }]);
    moveInstrumentation(img, opt.querySelector('img'));
    img.closest('picture').replaceWith(opt);
  });

  if (ctaHref && ctaText) {
    const actions = document.createElement('div');
    actions.className = 'cc-steps-actions';
    const a = document.createElement('a');
    a.href = ctaHref;
    a.className = 'cc-steps-btn';
    a.textContent = ctaText;
    actions.append(a);
    wrapper.append(actions);
  }

  block.textContent = '';
  block.append(wrapper);
}
