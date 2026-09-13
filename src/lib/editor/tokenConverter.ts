/**
 * Converts begrunnelse generator output (plain text with {{tokens}})
 * to TipTap-ready HTML with locked value spans.
 *
 * Input:  "Kravet på {{belop:500000:kr 500 000,-}} godkjennes.\n\nAvvises."
 * Output: "<p>Kravet på <span data-locked-value="500000" ...>kr 500 000,-</span> godkjennes.</p><p>Avvises.</p>"
 */

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function tokensToHtml(tokenString: string): string {
  if (!tokenString) return '';

  const paragraphs = tokenString.split('\n\n');
  return paragraphs
    .map((p) => {
      let html = '';
      let offset = 0;
      for (const match of p.matchAll(/\{\{(\w+):([^:}]+):([^}]+)\}\}/g)) {
        const [token, type, value, display] = match;
        html += escapeHtml(p.slice(offset, match.index));
        html += `<span data-locked-value="${escapeAttr(value)}" data-locked-type="${escapeAttr(type)}" class="locked-value locked-value--${escapeAttr(type)}" contenteditable="false">${escapeHtml(display)}</span>`;
        offset = match.index + token.length;
      }
      html += escapeHtml(p.slice(offset));
      return `<p>${html}</p>`;
    })
    .join('');
}
