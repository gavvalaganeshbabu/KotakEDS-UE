import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
  block.classList.add('columns-feature-2-cols');

  const row = block.firstElementChild;
  if (!row) return;
  const cells = [...row.children];

  // identify cells by content: picture = thumbnail, lone link = video URL,
  // short text-only = alt, the rich block = body text
  const imageCell = cells.find((c) => c.querySelector('picture'));
  const videoCell = cells.find((c) => c !== imageCell && c.querySelector('a'));
  const altCell = cells.find((c) => c !== imageCell && c !== videoCell
    && !c.querySelector('*') && c.textContent.trim() && c.textContent.trim().length < 80);
  const textCell = cells.find((c) => c !== imageCell && c !== videoCell && c !== altCell);

  // media column: thumbnail wrapped in the video link (play overlay via CSS)
  const media = document.createElement('div');
  media.className = 'columns-feature-img-col';
  const picture = imageCell?.querySelector('picture');
  const videoLink = videoCell?.querySelector('a');
  if (picture && videoLink) {
    const altText = altCell?.textContent.trim();
    if (altText) {
      const img = picture.querySelector('img');
      if (img) img.alt = altText;
    }
    const link = document.createElement('a');
    link.href = videoLink.getAttribute('href');
    link.setAttribute('aria-label', videoLink.textContent.trim() || altText || 'Play video');
    link.append(picture);
    media.append(link);
  } else if (picture) {
    media.append(picture);
  }

  // text column: the rich body
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
