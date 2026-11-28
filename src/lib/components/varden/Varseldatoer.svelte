<!--
  Datoene ved spørsmålet om varselet i svarskjemaet: når TE ble klar over forholdet, når kravet
  ble sendt og avstanden mellom dem. Er datoen for kravet eller varselet rettet, står datoen som
  gjelder, med brevet den kommer fra (U-6 i BF-50, MM-U63). Byggherren vurderer selv om varselet kom
  i tide.
-->
<script lang="ts">
  import type { Utledning } from '#kjerne/utledning/utled.ts';
  import { medRettingeneTil } from '#lib/kjernesak/kontekst.svelte.ts';
  import { brevMedElement, klarOverForholdet, rettetDato, type Brevet } from './lesing';
  import { kravbrevetI, kravetSendt, rettedeDatoer } from './svarskjema';
  import Datoer from './Datoer.svelte';
  import { RETTING, SKJEMA, kalenderdager } from './tekster';

  let {
    u,
    spor,
    gjelder,
    krav,
    sendt,
    svaretSendt = null,
  }: {
    u: Utledning;
    spor?: 'vederlag' | 'frist';
    /** Varselet eller kravet ved et enkelt valg om rettidighet. */
    gjelder?: string;
    /** Kravversjonen svaret gjelder når det er lagt til. */
    krav?: string;
    /** Linjen om når kravet ble sendt, med sporets ord. */
    sendt?: (dato: string, brev: Brevet) => string;
    /**
     * Dagen et svar lagt til oppgir at det ble sendt. Da gjelder rettingene sendt til og med den
     * dagen, som kjernen leser svaret med (OV-U98, punkt 8 i MM-U59).
     */
    svaretSendt?: string | null;
  } = $props();

  const paaDagen = $derived(medRettingeneTil(u, svaretSendt));
  const rettet = (id: string | undefined) => (id ? rettetDato(paaDagen, id) : null);
  const linjer = $derived.by(() => {
    if (!spor || !sendt) {
      const dato = rettet(gjelder);
      return dato ? [{ tekst: RETTING.iSvaret(dato, 'varselet') }] : [];
    }
    const kravId = krav ?? u.spor[spor].gjeldendeKrav?.id;
    const kravbrevet = (kravId ? brevMedElement(u, kravId) : null) ?? kravbrevetI(u, spor);
    const klarOver = klarOverForholdet(u);
    const { krav: kravetRettet, varsel: varseletRettet } = rettedeDatoer(
      paaDagen,
      kravId,
      spor === 'frist' ? '33.4' : '34.1.2'
    );
    const kravSendt = kravetRettet?.dato ?? kravetSendt(kravbrevet);
    return [
      ...(klarOver ? [{ tekst: SKJEMA.klarOver(klarOver.dato, klarOver.brev) }] : []),
      ...(varseletRettet ? [{ tekst: RETTING.iSvaret(varseletRettet, 'varselet') }] : []),
      {
        tekst: kravetRettet
          ? RETTING.iSvaret(kravetRettet, 'kravet')
          : sendt(kravSendt ?? kravbrevet.registrert, kravbrevet),
      },
      ...(klarOver && kravSendt
        ? [
            {
              tekst: SKJEMA.avstand(kalenderdager(klarOver.dato, kravSendt)),
              art: 'avstand' as const,
            },
          ]
        : []),
    ];
  });
</script>

{#if linjer.length}<Datoer {linjer} />{/if}
