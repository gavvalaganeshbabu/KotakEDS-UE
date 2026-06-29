import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
  block.classList.add('columns-feature-2-cols');

  // Collect the leaf content cell of every field row. Empty fields may not
  // produce rows, so identify each cell by its content rather than position.
  const rows = [...block.children];
  const cells = rows.map((r) => r.querySelector(':scope > div') || r).filter(Boolean);

  const pictureCell = cells.find((c) => c.querySelector('picture'));
  // the video cell holds only a URL string (or a bare link), no rich markup
  const isUrl = (s) => /^https?:\/\/|youtu/.test(s.trim());
  const videoCell = cells.find((c) => c !== pictureCell
    && !c.querySelector('h1, h2, h3, h4, h5, h6, p, ul, ol')
    && (c.querySelector('a') || isUrl(c.textContent || '')));
  // the text cell carries the heading/paragraph rich content
  const textCell = cells.find((c) => c !== pictureCell && c !== videoCell
    && c.querySelector('h1, h2, h3, h4, h5, h6, p'));

  // resolve the video URL from either a link href or the plain text
  let videoHref = '';
  if (videoCell) {
    const a = videoCell.querySelector('a');
    videoHref = a ? a.getAttribute('href') : videoCell.textContent.trim();
  }

  // media column: thumbnail wrapped in the video link (play overlay via CSS)
  const media = document.createElement('div');
  media.className = 'columns-feature-img-col';
  const picture = pictureCell ? pictureCell.querySelector('picture') : null;
  if (picture) {
    // a stray URL must not remain as the img alt
    const img = picture.querySelector('img');
    if (img && isUrl(img.getAttribute('alt') || '')) img.setAttribute('alt', '');
    if (videoHref) {
      const link = document.createElement('a');
      link.href = videoHref;
      link.setAttribute('aria-label', 'Play video');
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
  moveInstrumentation(rows[0] || block, newRow);
  newRow.append(media, text);

  block.textContent = '';
  block.append(newRow);
}
