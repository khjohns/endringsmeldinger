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
      const html = p.replace(
        /\{\{(\w+):([^:}]+):([^}]+)\}\}/g,
        (_, type: string, value: string, display: string) =>
          `<span data-locked-value="${escapeAttr(value)}" data-locked-type="${escapeAttr(type)}" class="locked-value locked-value--${escapeAttr(type)}" contenteditable="false">${escapeHtml(display)}</span>`
      );
      return `<p>${html}</p>`;
    })
    .join('');
}
