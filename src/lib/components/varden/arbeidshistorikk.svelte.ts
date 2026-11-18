import { goto } from '$app/navigation';
import { page } from '$app/state';
import { untrack } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';

type Steg<T> = { visning: T; forrige: string | undefined };

/** Nettleseren lagrer bare en nøkkel. Selve utkastet og brevkontrollen står i saksvisningen. */
export function arbeidshistorikk<T>(vis: (visning: T) => void) {
  const trinn = new SvelteMap<string, Steg<T>>();
  const sesjon = crypto.randomUUID();
  let nummer = 0;
  let rot: T | undefined;
  let aktiv: string | undefined;
  let tilbakeVenter = false;

  $effect(() => {
    const id = page.state?.vardenArbeid;
    untrack(() => {
      if (id === aktiv || (id && !trinn.has(id))) return;
      aktiv = id;
      tilbakeVenter = false;
      const visning = id ? trinn.get(id)?.visning : rot;
      if (visning) vis(visning);
    });
  });

  function lagre(forrige: T, neste: T, erstatt = false) {
    if (!page.route?.id || tilbakeVenter) return;
    rot ??= forrige;
    const id = sesjon + '-' + ++nummer;
    const forelder = erstatt && aktiv ? trinn.get(aktiv)?.forrige : aktiv;
    trinn.set(id, { visning: neste, forrige: forelder });
    aktiv = id;
    void goto(page.url.href, {
      state: { ...page.state, vardenArbeid: id },
      shallow: true,
      replace: erstatt,
    });
  }

  function tilbake(hvor: (visning: T) => boolean): boolean {
    if (!aktiv || tilbakeVenter) return false;
    const forelder = trinn.get(aktiv)?.forrige;
    const forrige = forelder ? trinn.get(forelder)?.visning : rot;
    if (!forrige || !hvor(forrige)) return false;
    tilbakeVenter = true;
    window.history.back();
    return true;
  }

  function oppdater(endre: (visning: T) => T) {
    if (rot) rot = endre(rot);
    for (const steg of trinn.values()) steg.visning = endre(steg.visning);
  }

  return { lagre, tilbake, oppdater };
}
