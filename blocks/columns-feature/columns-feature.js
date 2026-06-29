import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
  block.classList.add('columns-feature-2-cols');

  // EDS renders a multi-field block model as one ROW per field, in model
  // order: row 0 = image, 1 = imageAlt, 2 = video link, 3 = text (richtext).
  const rows = [...block.children];
  const cellOf = (r) => (r ? r.querySelector(':scope > div') || r : null);
  const imageRow = cellOf(rows[0]);
  const altRow = cellOf(rows[1]);
  const videoRow = cellOf(rows[2]);
  const textRow = cellOf(rows[3]);

  // media column: the thumbnail wrapped in the video link (play overlay via CSS)
  const media = document.createElement('div');
  media.className = 'columns-feature-img-col';
  const picture = imageRow ? imageRow.querySelector('picture') : null;
  const altText = altRow ? altRow.textContent.trim() : '';
  if (picture) {
    if (altText) {
      const img = picture.querySelector('img');
      if (img) img.alt = altText;
    }
    const videoLink = videoRow ? videoRow.querySelector('a') : null;
    const videoHref = videoLink
      ? videoLink.getAttribute('href')
      : (videoRow && videoRow.textContent.trim());
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
  if (textRow) {
    while (textRow.firstChild) text.append(textRow.firstChild);
  }

  const newRow = document.createElement('div');
  moveInstrumentation(rows[0] || block, newRow);
  newRow.append(media, text);

  block.textContent = '';
  block.append(newRow);
}
