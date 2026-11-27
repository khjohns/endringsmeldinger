<!--
  Innlegget i fritekst fra begge parter (BF-03, skissen `innlegget.html` versjon 6, MM-U47): brevet
  innlegget viser til, tittelen, teksten og vedleggene, i skallet for et skjema som blir et brev.
  Brevet sendes fra brevkontrollen, som de andre brevene. Kjernen lager brevet og avviser det den
  ikke godtar. Utkastet står i nettleseren til det er sendt eller forkastet (G-3).
-->
<script lang="ts">
  import type { Part, Spor } from '#kjerne/typer.ts';
  import type { Utledning } from '#kjerne/utledning/utled.ts';
  import type { Kjernesakkontekst } from '#lib/kjernesak/kontekst.svelte.ts';
  import type { TilBrevkontrollen } from './Brevkontroll.svelte';
  import Brevskjema from './Brevskjema.svelte';
  import Felt, { beskrevetAv } from './Felt.svelte';
  import Filvalg from './Filvalg.svelte';
  import Linjefelt from './Linjefelt.svelte';
  import Tekstomraade from './Tekstomraade.svelte';
  import Tidslinje from './Tidslinje.svelte';
  import { innlegget, type Innleggsvalg } from './kommandoer';
  import { brevene, datoerISporet, type Brevet } from './lesing';
  import type { Mangel } from './mangler';
  import { vedleggsgrense, vedleggskart } from './nysak';
  import { sendeflyt } from './sendeflyt.svelte';
  import { INNLEGGET } from './tekster';

  let {
    kjernesak,
    u,
    spor,
    valg = $bindable(),
    virkninger,
    onbrevkontroll,
    onforkast,
    onvedsiden,
  }: {
    kjernesak: Kjernesakkontekst;
    u: Utledning;
    /** Siden innlegget er åpnet fra, som gir tidslinja. */
    spor: Spor;
    valg: Innleggsvalg;
    /** «Når du sender» i brevkontrollen, for brevet innlegget viser til. */
    virkninger: (viserTil: Brevet) => string[];
    onbrevkontroll: (
      k: TilBrevkontrollen & { viserTil: Brevet; vedlegg: ReturnType<typeof vedleggskart> }
    ) => void;
    onforkast: () => void;
    onvedsiden?: (vedSiden: boolean) => void;
  } = $props();
  const uid = $props.id();
  const id = (felt: string) => `${uid}-${felt}`;

  const part = $derived(kjernesak.part as Part);
  const alle = $derived(brevene(u));
  // Nyeste først, som i tråden (U-2).
  const valgene = $derived([...alle].reverse());
  const viserTil = $derived(alle.find((b) => b.id === valg.gjelder) ?? null);
  const sporbrev = $derived(alle.filter((b) => b.spor.includes(spor)));

  const grense = vedleggsgrense((fil) => kjernesak.lastOppVedlegg(fil));
  let laster = $state(false);
  const vedlegg = $derived(vedleggskart(valg.vedlegg));
  const kommando = $derived(innlegget(valg));

  // Det som hindrer, med skjemaets ord, før brevkontrollen (MM-U32). Kjernen avviser det samme.
  const feltene = $derived.by(() => {
    const t = valg.tittel.trim();
    return {
      tittel: !t ? INNLEGGET.skrivTittelen : /[\t\n\v\f\r]/.test(t) ? INNLEGGET.enLinje : null,
      tekst: valg.tekst.trim() ? null : INNLEGGET.skrivTeksten,
    };
  });
  const mangler = $derived(
    (Object.entries(feltene) as [string, string | null][]).flatMap(([felt, tekst]) =>
      tekst ? [{ felt: id(felt), post: null, tekst } satisfies Mangel] : []
    )
  );
  const flyt = sendeflyt(() => kjernesak, id('hindring'));
  const feil = (felt: keyof typeof feltene) => (flyt.forsoekt ? feltene[felt] : null);
  let oppsummering = $state<HTMLElement | null>(null);

  function seBrevet() {
    const b = viserTil;
    return flyt.send({
      mangler: mangler.length ? () => oppsummering : null,
      kommando,
      vedlegg,
      kanIkkeLages: INNLEGGET.kanIkkeLages,
      tilBrevkontrollen: (brevet) =>
        b &&
        onbrevkontroll({ kommando, ...brevet, virkninger: virkninger(b), viserTil: b, vedlegg }),
    });
  }

  function gaaTil(m: Mangel, e: MouseEvent) {
    e.preventDefault();
    document.getElementById(m.felt)?.focus();
  }
</script>

<Brevskjema
  id={id('emne')}
  tittel={valg.tittel.trim() || INNLEGGET.tittel}
  {kjernesak}
  {u}
  avsender={part}
  {onvedsiden}
  {flyt}
  {mangler}
  manglerTittel={INNLEGGET.mangler}
  ongaa={gaaTil}
  bind:oppsummering
  forkastTekst={INNLEGGET.forkastTekst}
  {onforkast}
  skilt
  knapp={{ tekst: INNLEGGET.seBrevet, onclick: seBrevet, opptatt: laster, bred: true }}
>
  {#snippet panel(sendeknapp)}
    <div class="panelkort">{@render sendeknapp?.()}</div>
  {/snippet}
  {#snippet tidslinje()}
    <Tidslinje brev={sporbrev} datoer={datoerISporet(u, spor)} aapen={false} />
  {/snippet}

  <div class="felter">
    <Felt id={id('gjelder')} etikett={INNLEGGET.viserTil} hjelp={INNLEGGET.viserTilHjelp}>
      <span class="velger">
        <select
          id={id('gjelder')}
          bind:value={valg.gjelder}
          aria-describedby={beskrevetAv(id('gjelder'), INNLEGGET.viserTilHjelp, null)}
        >
          {#each valgene as b (b.id)}
            <option value={b.id}>{INNLEGGET.brevvalg(b)}</option>
          {/each}
        </select>
      </span>
    </Felt>
    <Linjefelt
      id={id('tittel')}
      etikett={INNLEGGET.tittelfelt}
      bredde="tekst"
      paakrevd
      feil={feil('tittel')}
      bind:verdi={valg.tittel}
    />
    <Tekstomraade
      id={id('tekst')}
      etikett={INNLEGGET.tekstfelt}
      vokser
      paakrevd
      feil={feil('tekst')}
      bind:verdi={valg.tekst}
    />
    <Filvalg
      id={id('vedlegg')}
      etikett={INNLEGGET.vedlegg}
      hjelp={INNLEGGET.vedleggHjelp}
      {grense}
      valgfri
      bind:vedlegg={valg.vedlegg}
      bind:laster
    />
  </div>
</Brevskjema>

<style>
  .felter {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-5);
    padding: var(--spacing-5) var(--spacing-6);
  }
  .panelkort {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    padding: var(--spacing-5);
    background: var(--surface);
    border: var(--rule);
    border-radius: var(--r-kort);
  }
  .velger {
    display: flex;
    border: var(--control-border);
    border-radius: var(--r-felt);
    background: var(--surface);
  }
  .velger:hover {
    border-color: var(--ink-3);
  }
  .velger:focus-within {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  select {
    flex: 1;
    min-width: 0;
    min-height: 44px;
    padding: 0 var(--spacing-3);
    border: 0;
    font: 16px var(--font-sans);
    color: var(--ink);
    background: transparent;
    outline: none;
    text-overflow: ellipsis;
  }
</style>
