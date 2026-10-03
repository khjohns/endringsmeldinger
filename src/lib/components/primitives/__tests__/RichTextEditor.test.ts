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
});
