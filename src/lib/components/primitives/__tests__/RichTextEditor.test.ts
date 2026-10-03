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
});
