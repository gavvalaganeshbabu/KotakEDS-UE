import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
  block.classList.add('columns-feature-2-cols');

  const row = block.firstElementChild;
  if (!row) return;
  const cells = [...row.children];

  // EDS renders a single-item block model as one cell per field, in model
  // order: 0 = image, 1 = imageAlt, 2 = video link, 3 = text (richtext).
  const imageCell = cells[0];
  const altCell = cells[1];
  const videoCell = cells[2];
  const textCell = cells[3];

  // media column: the thumbnail wrapped in the video link (play overlay via CSS)
  const media = document.createElement('div');
  media.className = 'columns-feature-img-col';
  const picture = imageCell ? imageCell.querySelector('picture') : null;
  const altText = altCell ? altCell.textContent.trim() : '';
  if (picture) {
    if (altText) {
      const img = picture.querySelector('img');
      if (img) img.alt = altText;
    }
    const videoLink = videoCell ? videoCell.querySelector('a') : null;
    const videoHref = videoLink
      ? videoLink.getAttribute('href')
      : (videoCell && videoCell.textContent.trim());
    if (videoHref) {
      const link = document.createElement('a');
      link.href = videoHref;
      link.setAttribute('aria-label', altText || 'Play video');
      link.append(picture);
      media.append(link);
    } else {
      media.append(picture);
    }
  }

  // text column: the rich body (heading + description)
  const text = document.createElement('div');
  text.className = 'columns-feature-text-col';
  if (textCell) {
    while (textCell.firstChild) text.append(textCell.firstChild);
  }

  const newRow = document.createElement('div');
  moveInstrumentation(row, newRow);
  newRow.append(media, text);

  block.textContent = '';
  block.append(newRow);
}
