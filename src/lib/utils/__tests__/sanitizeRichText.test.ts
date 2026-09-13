// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import { sanitizeRichText } from '../sanitizeRichText';
import { tokensToHtml } from '$lib/editor/tokenConverter';
import ExpandableReasoning from '$lib/components/patterns/ExpandableReasoning.svelte';

describe('untrusted rich text', () => {
  it.each([
    '<img src=x onerror="alert(1)"><script>alert(1)</script>',
    '<svg onload="alert(1)"><a href="javascript:alert(1)">x</a></svg>',
    '<math><mtext><img src=x onerror=alert(1)></mtext></math>',
    '<p onclick="alert(1)" style="position:fixed" id="app">Text</p>',
    '<iframe srcdoc="<script>alert(1)</script>"></iframe><form><input name=action></form>',
  ])('strips active content: %s', (html) => {
    const { container } = render(ExpandableReasoning, { label: 'Begrunnelse', html });
    expect(container.querySelector('img, script, svg, math, iframe, form, input')).toBeNull();
    expect(container.querySelector('[onclick], [onerror], [onload], [style], [srcdoc]')).toBeNull();
  });

  it('preserves supported formatting and readable locked values', () => {
    expect(
      sanitizeRichText(
        '<p><strong>Krav</strong> <em>tekst</em></p><ol start="2"><li>Punkt</li></ol>'
      )
    ).toBe('<p><strong>Krav</strong> <em>tekst</em></p><ol start="2"><li>Punkt</li></ol>');
    expect(sanitizeRichText(tokensToHtml('{{belop:100:kr 100}}'))).toBe(
      '<p><span>kr 100</span></p>'
    );
  });

  it('escapes generator text outside tokens and retains token attributes', () => {
    const html = tokensToHtml('<img src=x onerror=alert(1)> {{belop:100:kr 100}} & slutt');
    const element = document.createElement('div');
    element.innerHTML = html;
    expect(element.querySelector('img')).toBeNull();
    expect(element.textContent).toBe('<img src=x onerror=alert(1)> kr 100 & slutt');
    expect(element.querySelector('span')?.getAttribute('data-locked-value')).toBe('100');
  });
});
