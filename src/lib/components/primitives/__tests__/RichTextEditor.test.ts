import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import { userEvent } from '@testing-library/user-event';
import RichTextEditor from '../RichTextEditor.svelte';

describe('RichTextEditor', () => {
  it('melder nytt tegnantall mens brukeren skriver (#118)', async () => {
    const oncharcount = vi.fn();
    const user = userEvent.setup();
    const { container } = render(RichTextEditor, { props: { oncharcount } });
    const flate = container.querySelector('.tiptap') as HTMLElement;
    flate.focus();
    await user.keyboard('Begrunnelse');
    expect(flate.textContent).toBe('Begrunnelse');
    expect(oncharcount).toHaveBeenLastCalledWith(11);
  });

  it('viser aktiv formatering og angre-tilstand mens brukeren skriver (#126)', async () => {
    const user = userEvent.setup();
    const screen = render(RichTextEditor);
    const flate = screen.container.querySelector('.tiptap') as HTMLElement;
    const fet = screen.getByRole('button', { name: 'Fet' });
    const angre = screen.getByRole('button', { name: 'Angre' });
    expect(fet).not.toHaveClass('active');
    expect(angre).toBeDisabled();

    flate.focus();
    await user.keyboard('{Control>}b{/Control}fet');

    expect(flate.innerHTML).toContain('<strong>fet</strong>');
    expect(fet).toHaveClass('active');
    expect(angre).toBeEnabled();
  });

  // Kilde: uu-sjekk og MM-U32. Feilen står ved feltet, er koblet til det, og forsvinner med feilen (#1264).
  it('kobler feilmeldingen til feltet mens feilen står (#1264)', async () => {
    const melding = 'Brevet kan ikke sendes ennå. Svaret må ha en begrunnelse.';
    const screen = render(RichTextEditor, { props: { navn: 'Begrunnelse', feil: melding } });
    const felt = screen.getByRole('textbox', { name: 'Begrunnelse' });
    expect(felt).toHaveAttribute('aria-invalid', 'true');
    expect(felt).toHaveAccessibleDescription(melding);
    expect(screen.getByRole('alert')).toHaveTextContent(melding);

    await screen.rerender({ navn: 'Begrunnelse', feil: null });
    expect(felt).not.toHaveAttribute('aria-invalid');
    expect(felt).not.toHaveAttribute('aria-describedby');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  // WCAG 2.1 4.1.2: et redigerbart felt har et tilgjengelig navn (axe aria-input-field-name, #1235).
  it('navngir feltet med navn når ledeteksten står utenfor komponenten (#1235)', () => {
    const screen = render(RichTextEditor, { props: { navn: 'Redegjørelse' } });
    expect(screen.getByRole('textbox', { name: 'Redegjørelse' })).toHaveClass('tiptap');
  });

  it('navngir feltet med den synlige label-en (#1235)', () => {
    const screen = render(RichTextEditor, { props: { label: 'Utdypende begrunnelse' } });
    const flate = screen.getByRole('textbox', { name: 'Utdypende begrunnelse' });
    expect(flate).toHaveAttribute('aria-labelledby');
  });
});
