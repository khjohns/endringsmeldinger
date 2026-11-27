<!--
  Varden: eksperimentell saksvisning (#1331, konseptet i docs/design/konsept-varden/). Panelet
  til venstre har logoen, saken og sporene, som i dagens visning (oppdragsgiver 29.10, #1391).
  Arbeidet i sporet står under topplinja, med tidslinja og panelene i høyre kolonne (valget 27.10). Saken er den samme `lagKjernesak` gir dagens
  visning: brevteksten, handlingene og avvisningene kommer fra kjernen.
-->
<script lang="ts">
  import { akseptfristen, type Kjernesakkontekst } from '#lib/kjernesak/kontekst.svelte.ts';
  import { VARSELSPOR, type Spor, type Svar } from '#kjerne/typer.ts';
  import type { Utledning } from '#kjerne/utledning/utled.ts';
  import { page } from '$app/state';
  import { ChevronLeft } from 'lucide-svelte';
  import { arbeidshistorikk } from './arbeidshistorikk.svelte';
  import { tick, untrack, type Snippet } from 'svelte';
  import { medietreff } from './medie.svelte';
  import { fokuser } from './mangler';
  import { brevTilKontrollen } from './sendeflyt.svelte';
  import {
    KRAVTITTEL,
    SVARTITTEL,
    SVARTITTEL_PAA_VARSELET,
    UTSAGNSTITTEL,
  } from '#kjerne/frosset/brevtittel.ts';
  import {
    hjemmelenForVarselet,
    varseletSvaretPaa,
    varsleneIBrevet,
    varsleneIVederlagskravet,
  } from '#lib/kjernesak/vederlagskrav.ts';
  import { sakensKode } from '#kjerne/frosset/tekst.ts';
  import Brevkvittering from './Brevkvittering.svelte';
  import Brevkontroll, { type TilBrevkontrollen } from './Brevkontroll.svelte';
  import Knapp from './Knapp.svelte';
  import Forkastutkast from './Forkastutkast.svelte';
  import Melding from './Melding.svelte';
  import Sporlesing from './Sporlesing.svelte';
  import Vardenskall, { type Smule } from './Vardenskall.svelte';
  import Vederlagssvar from './Vederlagssvar.svelte';
  import Varselsvar from './Varselsvar.svelte';
  import Varslenesvar from './Varslenesvar.svelte';
  import Varselbrevsvar from './Varselbrevsvar.svelte';
  import Fristsvar from './Fristsvar.svelte';
  import { tomtFristsvar, valgFraFristsvaret } from './fristsvar';
  import Forholdssvar from './Forholdssvar.svelte';
  import { tomtForholdssvar } from './forholdssvar';
  import Vederlagskrav from './Vederlagskrav.svelte';
  import Vederlagsvarsel from './Vederlagsvarsel.svelte';
  import {
    foersteVarsel,
    fraHandlingsnoekkel,
    hjemlerForRaden,
    kanVarsle,
    nyVarselrad,
    startvarsling,
    tilbudteHjemler,
    type Vederlagsvarselhjemmel,
  } from './vederlagsvarsel';
  import Fristkrav from './Fristkrav.svelte';
  import { startvalg as fristkravstart, type Fristkravvalg } from './fristkrav';
  import { eldreKrav } from '#lib/kjernesak/eldrekrav.ts';
  import {
    tomKorrespondanse,
    tomtLagtTil,
    type Korrespondansevalg,
    type Lagttilvalg,
  } from './korrespondansen';
  import Korrespondanseskjema from './Korrespondanseskjema.svelte';
  import Innlegg from './Innlegg.svelte';
  /** Handlingene i fristen som åpner skjemaet for kravet (BF-20). */
  // Handlingstypene i fristen som holder kravskjemaet åpent, med varselet alene eller kravet valgt.
  const FRISTSKJEMAET: Record<Fristkravvalg['hva'], ReadonlySet<string>> = {
    varsel: new Set(['sende_varsel', 'varsle']),
    krav: new Set(['krav', 'svare_paa_foresporsel']),
  };
  import { startvalg as vederlagskravstart, type Kravvalg } from './vederlagskrav';
  import Korrigering from './Korrigering.svelte';
  import Kunnskapsdato from './Kunnskapsdato.svelte';
  import Paaberopelsesversjon from './Paaberopelsesversjon.svelte';
  import {
    tomtSvar,
    tomtVarselsvar,
    tomtVarslenesvar,
    postenITittelen,
    valgFraSvaret,
    type Innleggsvalg,
    type Korrigeringsvalg,
    type Varselsvalg,
    type Varslenesvalg,
    type Varselbrevvalg,
  } from './kommandoer';
  import {
    kontraktFraProsjektet,
    kontraktsrader,
    settOrganisasjoner,
    type Kontrakt,
  } from './kontrakt';
  import {
    betegnelsene,
    brevForLinja,
    brevMedUtsagn,
    brevene,
    brevet,
    brevITraaden,
    type Brevet,
    datoopplysningene,
    forholdetISaken,
    type Brevref,
  } from './lesing';
  import {
    BETEGNELSE,
    BREVKONTROLL,
    FRISTKRAV,
    VEDERLAGSVARSEL,
    LEGG_TIL,
    KORRIGERING,
    KUNNSKAPSDATO,
    KRAVSKJEMA,
    MOTTATT,
    NYVERSJON,
    NYSAK,
    FORHOLDET,
    INNLEGGET,
    SAKEN,
    SAKSLISTE,
    SPORNAVN,
    TRAADEN,
    VARSELSVARET,
  } from './tekster';
  import { SAKSDELEN } from './tekster/felles';

  let {
    kjernesak,
    kontrakt,
    kvittering,
    saksliste,
    prosjekter,
    bruker = null,
    nySak,
    spor,
    nySakLenke,
    sakslenke,
  }: {
    kjernesak: Kjernesakkontekst;
    /** Sporet saken åpner i. Uten det står saken i vederlaget, eller i forholdet etter opprettelsen. */
    spor?: Spor;
    /** Kvitteringen for brevet som opprettet saken (BF-05 steg 6, F-6). */
    kvittering?: string;
    /** Lenken til sakslisten, i stien og der saken ikke finnes (#1473). */
    saksliste?: string;
    /** Lenken til prosjektene, «Varden» først i stien. */
    prosjekter?: string;
    /** Den innloggede, i topplinja. Demoruta har ingen. */
    bruker?: { name: string } | null;
    /** Skjemaet for ny sak, som står i arbeidsflaten før saken finnes (BF-05, KT-U11). */
    nySak?: Snippet;
    /** Lenken til skjemaet for ny sak, for en annen hjemmel eller endringsordre (BF-10 U-2). */
    nySakLenke?: string;
    /** Lenken til en annen sak i prosjektet, som en forlengelse av en frist står i (BF-45 U-5). */
    sakslenke?: (sakId: string) => string;
    /** Prosjektet og partene i demoruta. Ellers leses de av prosjektet (#1398). */
    kontrakt?: Kontrakt;
  } = $props();
  // Serveren gir partsnavnene når driften har satt dem, men ikke kontraktsformen (#1398).
  const kontrakten = $derived(kontrakt ?? kontraktFraProsjektet());
  settOrganisasjoner(() => {
    const k = kontrakten;
    // Et tomt navn er ikke et navn (#1398), som i kontraktsradene.
    return { BH: k.byggherre || undefined, TE: k.entreprenoer || undefined };
  });

  type Kontroll = TilBrevkontrollen & {
    sendTekst: string;
    tilbakeTil: string;
    svarerPaa: Brevref | null;
    henvisning?: string;
    relasjoner?: { hva: string; brev: string }[];
    /** Kvitteringen etter sendingen, ellers den generelle. */
    kvittering?: string;
    tilbake: Arbeid;
    /** Sporet når brevet er svarutkastet i sporet, som tømmes når det er sendt. */
    utkastet: Spor | null;
    /** Sakens versjon da brevkontrollen ble åpnet. */
    versjon: number | null;
    /** Vedleggene kommandoen viser til, som kjernen trenger for brevet (VS-U53). */
    vedlegg?: ReadonlyMap<string, { vedlegg_id: string; filnavn: string; innhold_sha256: string }>;
  };
  type Kravspor = Exclude<Spor, 'forhold'>;
  type Arbeid =
    | { art: 'les' }
    | { art: 'svar' }
    | { art: 'korrigering'; gjelder: string }
    | { art: 'kunnskapsdato'; gjelder: string }
    | { art: 'varselsvar'; gjelder: string }
    | { art: 'nyversjon' }
    | { art: 'vederlagskrav'; fraKorrespondansen?: true }
    | { art: 'fristkrav'; fraKorrespondansen?: true }
    | { art: 'korrespondanse' }
    | { art: 'innlegg' }
    | ({ art: 'kontroll' } & Kontroll);

  type Skjemaarbeid = Exclude<Arbeid, { art: 'les' | 'kontroll' }>;
  type Visning = { spor: Spor; arbeid: Arbeid };

  const SPORGRUPPENE: { id: string; etikett: string; spor: Spor[] }[] = [
    { id: 'forholdet', etikett: SAKEN.kontraktsforhold, spor: ['forhold'] },
    { id: 'kravene', etikett: SAKEN.krav, spor: ['vederlag', 'frist'] },
  ];
  // Etter opprettelsen står saken i forholdet, med påberopelsen (BF-05 steg 6).
  let valgt = $state<Spor>(untrack(() => spor ?? (kvittering ? 'forhold' : 'vederlag')));
  // På smal skjerm står sporene som faner som rulles sidelengs; den valgte rulles fram (#2021).
  let sporene = $state<HTMLElement | null>(null);
  const faner = medietreff('(max-width: 860px)');
  $effect(() => {
    if (!faner.treff || !sporene) return;
    void valgt;
    const fane = sporene.querySelector<HTMLElement>('[aria-current="page"]');
    if (!fane) return;
    // Bare sidelengs i fanene, så siden ikke hopper (code-review i #2021).
    const f = fane.getBoundingClientRect();
    const n = sporene.getBoundingClientRect();
    if (f.left < n.left) sporene.scrollLeft += f.left - n.left;
    else if (f.right > n.right) sporene.scrollLeft += f.right - n.right;
  });
  let arbeid = $state<Arbeid>({ art: 'les' });
  let arbeidsflate = $state<HTMLElement | null>(null);
  const historikk = arbeidshistorikk<Visning>(({ spor, arbeid: neste }) => {
    if (arbeid.art === 'kontroll' && neste.art !== 'kontroll') {
      const kontrollen = arbeid;
      historikk.oppdater((v) =>
        v.arbeid === kontrollen ? { spor: v.spor, arbeid: kontrollen.tilbake } : v
      );
    }
    valgt = spor;
    arbeid = neste;
    melding = null;
    lukkKvittering();
    if (neste.art !== 'les' && neste.art !== 'kontroll') void fokuserOverskriften();
  });

  async function fokuserOverskriften() {
    await tick();
    arbeidsflate?.querySelector<HTMLElement>('form[aria-labelledby] h2[tabindex="-1"]')?.focus();
  }

  function tilArbeid(neste: Arbeid, s = valgt, erstatt = false) {
    const forrige = { spor: valgt, arbeid };
    lukkKvittering();
    valgt = s;
    arbeid = neste;
    historikk.lagre(forrige, { spor: s, arbeid }, erstatt);
    if (neste.art !== 'les' && neste.art !== 'kontroll') void fokuserOverskriften();
  }

  function tilbakeTil(neste: Arbeid) {
    if (!historikk.tilbake((v) => v.spor === valgt && v.arbeid.art === neste.art))
      tilArbeid(neste, valgt, true);
  }

  /**
   * Det tomme utkastet i hvert skjema, med navnet skjemaet har i `skjemaene`. Utkastet står når
   * parten går til brevkontrollen og tilbake: svaret også når BH velger et annet spor (BF-01 S-8),
   * kravet om vederlagsjustering (BF-14), kravet om fristforlengelse (G-3 i BF-20), datoen og
   * forklaringen i korrigeringen (U-3 i BF-02A) og teksten i den nye versjonen mens TE korrigerer
   * datoen (U-2 i BF-10).
   */
  const tommeUtkast = {
    forholdssvar: tomtForholdssvar,
    vederlagssvar: tomtSvar,
    fristsvar: tomtFristsvar,
    vederlagskrav: (): Kravvalg | null => null,
    fristkrav: (): Fristkravvalg | null => null,
    korrigering: (): Korrigeringsvalg => ({ dato: '', forklaring: '' }),
    kunnskapsdato: (): Korrigeringsvalg => ({ dato: '', forklaring: '' }),
    nyversjon: (): string | null => null,
    // Ett utkast per varsel som står alene, med varselet som nøkkel (G-9 i BF-14).
    varselsvar: (): Record<string, Varselsvalg> => ({}),
    // Ett utkast per vederlagskrav for svaret bare på varslene i det (VS-U96 punkt 38).
    varslenesvar: (): Record<string, Varslenesvalg> => ({}),
    // Ett utkast per brev med flere varsler, med det første varselet som nøkkel (M-5 i BF-37).
    varselbrevsvar: (): Record<string, Varselbrevvalg> => ({}),
    innlegg: (): Innleggsvalg | null => null,
  };
  type Utkastnavn = keyof typeof tommeUtkast;
  type Utkastene = { [N in Utkastnavn]: ReturnType<(typeof tommeUtkast)[N]> };
  const erUtkastnavn = (n: string): n is Utkastnavn => Object.hasOwn(tommeUtkast, n);
  let utkastene = $state(
    Object.fromEntries(Object.entries(tommeUtkast).map(([n, tomt]) => [n, tomt()])) as Utkastene
  );
  function tom<N extends Utkastnavn>(n: N) {
    utkastene[n] = tommeUtkast[n]() as Utkastene[N];
  }
  const svaretI = {
    forhold: 'forholdssvar',
    vederlag: 'vederlagssvar',
    frist: 'fristsvar',
  } as const satisfies Record<Spor, Utkastnavn>;
  const kravetI = {
    vederlag: 'vederlagskrav',
    frist: 'fristkrav',
  } as const satisfies Record<Kravspor, Utkastnavn>;
  // Korrespondansen lagt til står når parten går videre til krav- eller svarskjemaet og tilbake
  // (OV-U80). Skjemaet for kravet er åpnet fra den når `arbeid` sier det.
  let lagtTil = $state<{ spor: Spor; valg: Lagttilvalg } | null>(null);
  // Svaret på forholdet er et utkast som står når BH bytter spor (BF-01 S-8). Er det et svar lagt
  // til, står korrespondansen det legges til fra, her, til utkastet er lagt til eller forkastet.
  let svaretFra = $state<Korrespondansevalg | null>(null);
  let utenPaaberopelse = $state<HTMLElement | null>(null);
  /** Korrespondansen kravet eller svaret i sporet legges til fra, eller `null`. */
  const lagtTilI = (s: Spor, kategori: 'krav' | 'svar') =>
    kategori === 'svar'
      ? s === 'forhold'
        ? svaretFra
        : null
      : 'fraKorrespondansen' in arbeid &&
          arbeid.fraKorrespondansen &&
          lagtTil?.spor === s &&
          lagtTil.valg.kategori === 'krav'
        ? lagtTil.valg.korrespondanse
        : null;
  // Mens brevet leses ved siden av skjemaet, felles panelet til venstre inn, så brevet blir
  // omtrent like bredt som ellers (oppdragsgiver 30.10, #1391).
  let vedSiden = $state(false);
  const utkastArbeid = $state<Record<Spor, Skjemaarbeid[]>>({
    forhold: [],
    vederlag: [],
    frist: [],
  });
  /** Kjernen tilbyr svaret på varselet `gjelder` eller et nytt svar på det (VS-U77 punkt 33). */
  const kanSvarePaaVarselet = (gjelder: string) =>
    kjernesak.handlinger.includes(`svare:${gjelder}`) ||
    kjernesak.handlinger.includes(`revidere:${gjelder}`);
  // Et utkast til svaret på et varsel en kravpost har tatt opp, kan ikke sendes og teller ikke.
  const harUtkast = (s: Spor) =>
    utkastArbeid[s].some((a) => a.art !== 'varselsvar' || kanSvarePaaVarselet(a.gjelder));
  const harSvarutkast = (s: Spor) => utkastArbeid[s].some((utkast) => utkast.art === 'svar');

  /** Utkastet arbeidet står i: ett per skjema, og for svaret på et varsel ett per varsel. */
  const utkastnoekkel = (a: Arbeid) => (a.art === 'varselsvar' ? `varselsvar:${a.gjelder}` : a.art);

  function aapneUtkast(neste: Skjemaarbeid) {
    const n = utkastnoekkel(neste);
    utkastArbeid[valgt] = [neste, ...utkastArbeid[valgt].filter((u) => utkastnoekkel(u) !== n)];
    tilArbeid(neste);
  }

  /** Fjerner utkastene med arten, eller bare svaret på varselet `gjelder`. */
  function fjernUtkast(s: Spor, art: Arbeid['art'], gjelder?: string) {
    const treffer = (a: Arbeid) =>
      a.art === art && (gjelder === undefined || ('gjelder' in a && a.gjelder === gjelder));
    utkastArbeid[s] = utkastArbeid[s].filter((utkast) => !treffer(utkast));
    historikk.oppdater((v) =>
      v.spor === s &&
      (treffer(v.arbeid) || (v.arbeid.art === 'kontroll' && treffer(v.arbeid.tilbake)))
        ? { spor: s, arbeid: { art: 'les' } }
        : v
    );
  }

  /** Sporet svaret på varselet `gjelder` står i, eller `null` når det ikke er et slikt varsel. */
  const varselsporet = (gjelder: string) => {
    const h = u && hjemmelenForVarselet(u, gjelder);
    return h ? VARSELSPOR[h] : u && varsleneIVederlagskravet(u, gjelder) ? 'vederlag' : null;
  };

  /** Svaret på varselet `gjelder` er sendt eller forkastet. */
  function tomtVarselsutkast(gjelder: string) {
    delete utkastene.varselsvar[gjelder];
    delete utkastene.varslenesvar[gjelder];
    delete utkastene.varselbrevsvar[gjelder];
    for (const s of ['vederlag', 'frist'] as const) fjernUtkast(s, 'varselsvar', gjelder);
  }
  function fjernSkjemautkast(s: Spor, n: Utkastnavn & Skjemaarbeid['art']) {
    if (n === 'korrigering') {
      for (const spor of ['forhold', 'vederlag', 'frist'] as const) fjernUtkast(spor, n);
    } else fjernUtkast(s, n);
  }
  const utkasttittel = (utkast: Skjemaarbeid) =>
    ({
      svar: SVARTITTEL[valgt],
      korrigering: UTSAGNSTITTEL.korrigering,
      kunnskapsdato: UTSAGNSTITTEL.kunnskapsdato,
      nyversjon: FORHOLDET.oppdater,
      vederlagskrav:
        utkastene.vederlagskrav?.hva !== 'varsel'
          ? KRAVTITTEL.vederlag
          : utkastene.vederlagskrav.varsling?.utenfor
            ? VEDERLAGSVARSEL.tittelRegistrert
            : VEDERLAGSVARSEL.tittel,
      fristkrav: KRAVTITTEL.frist,
      korrespondanse: LEGG_TIL.tittel,
      innlegg: utkastene.innlegg?.tittel.trim() || INNLEGGET.tittel,
      varselsvar: varselsvartittel(utkast),
    })[utkast.art];
  function varselsvartittel(utkast: Skjemaarbeid) {
    if (utkast.art !== 'varselsvar' || !u) return '';
    const iBrevet = varsleneIBrevet(u, kjernesak.tilbudte, utkast.gjelder);
    const brevet = iBrevet && brevMedUtsagn(u, utkast.gjelder);
    if (brevet) return VARSELSVARET.svarPaaVarsleneI(brevet);
    const h = hjemmelenForVarselet(u, utkast.gjelder);
    const varslene = h ? null : varsleneIVederlagskravet(u, utkast.gjelder);
    return h
      ? SVARTITTEL_PAA_VARSELET[h]
      : varslene
        ? VARSELSVARET.tittel(
            postenITittelen(
              utkastene.varslenesvar[utkast.gjelder] ?? tomtVarslenesvar(),
              varslene.poster
            )
          )
        : '';
  }

  let melding = $state<{ tekst: string; art: 'sendt' | 'forkastet' | 'endret' } | null>(
    untrack(() => (kvittering ? { tekst: kvittering, art: 'sendt' } : null))
  );
  let kvittert = $state<Brevet | null>(null);
  let visNySakKvittering = $state(untrack(() => Boolean(kvittering)));

  function lukkKvittering() {
    kvittert = null;
    visNySakKvittering = false;
    if (melding?.art === 'sendt') melding = null;
  }

  let meldingen = $state<HTMLElement | null>(null);
  let proever = $state(false);
  let sistForsoekt = $state<string | null>(null);

  const u = $derived(kjernesak.utledning);
  const kvittertBrev = $derived(
    kvittert ??
      (visNySakKvittering && u
        ? (brevene(u).find((b) => b.art === 'krav' && b.spor.includes('forhold')) ?? null)
        : null)
  );
  const uid = $props.id();
  // Fokus flyttes til meldingen om den trukne påberopelsen når fokuset forsvant med skjemaet, ikke
  // når brukeren velger sporet eller står et annet sted (#2104).
  let nyttSpor = false;
  $effect(() => {
    if (!utenPaaberopelse) return;
    const tapt = !document.activeElement || document.activeElement === document.body;
    if (tapt && !nyttSpor) utenPaaberopelse.focus();
  });
  const brev = $derived(u ? brevene(u) : []);
  // Forholdet heter det TE påberoper i sporlista, som i sporhodet (OV-U78).
  const forholdsnavn = $derived((u && forholdetISaken(u)?.navn) ?? SPORNAVN.forhold);
  const sakskode = $derived.by(() => {
    const kode = kjernesak.sak?.merking?.sakskode;
    return kode ? sakensKode(kode) : null;
  });
  // Stien som i prototypen: Varden › prosjektet › saken, med sakens kode (LV-U46).
  const sti = $derived.by((): Smule[] => {
    const prosjekt = kontrakten.prosjekt;
    return [
      { tekst: SAKEN.merkenavn, href: prosjekter },
      ...(prosjekt ? [{ tekst: prosjekt, href: saksliste }] : []),
      { tekst: nySak ? NYSAK.over : (sakskode ?? SAKEN.nav) },
    ];
  });

  // Det løsningen vet om hvert spor, under navnet i panelet: betegnelsen og siste brev (panel B,
  // #1899). Ikke hvem som skal handle (system.md, «Visningen sier det løsningen vet»).
  const sporlinjer = $derived.by(() => {
    const betegnelser = betegnelsene(kjernesak.saksbilde);
    const linje = (s: Spor) => {
      const b = u ? brevForLinja(brev, s, u.spor[s].trukket) : undefined;
      const sist = brev.filter((x) => x.spor.includes(s)).at(-1);
      const innlegg = sist?.art === 'innlegg' ? sist : null;
      const kode = betegnelser[s];
      // Akseptfristen i et svar som ikke er godtatt, og en aksept etter den, står i stedet for
      // siste brev (U-11 i BF-44, U-6 i BF-46).
      const frist = u && s !== 'forhold' ? akseptfristen(u, s)?.dato : null;
      const oversittet = kjernesak.saksbilde?.spor.find((x) => x.spor === s)?.akseptEtterFristen;
      const akseptlinje = frist
        ? SAKEN.akseptfrist(frist)
        : oversittet
          ? SAKEN.akseptEtterFristen(oversittet)
          : null;
      return {
        betegnelse: kode ? BETEGNELSE[kode] : null,
        // Et innlegg etter siste brev står med parten og datoen, også ved akseptfristen og etter
        // trekket (D-9 og D-4 i BF-03).
        siste:
          [
            akseptlinje ?? (b && b.art !== 'innlegg' ? SAKEN.siste(b, b.avsender) : null),
            innlegg ? TRAADEN.siste(innlegg) : null,
          ]
            .filter(Boolean)
            .join(' · ') || null,
      };
    };
    return { forhold: linje('forhold'), vederlag: linje('vederlag'), frist: linje('frist') };
  });
  const parter = $derived(kontraktsrader(kontrakten, ['entreprenoer', 'byggherre']));
  const partensLenke = $derived(kjernesak.part === 'TE' ? (nySakLenke ?? null) : null);

  // Svarutkastet i sporet er sendt eller forkastet.
  function tomtUtkast(s: Spor) {
    tom(svaretI[s]);
    fjernUtkast(s, 'svar');
    // Et forkastet svar lagt til tar korrespondansen med seg.
    if (s === 'forhold') {
      svaretFra = null;
      if (lagtTil?.spor === 'forhold' && lagtTil.valg.kategori === 'svar') lagtTil = null;
    }
  }

  // Brevkontrollen for BHs svar i sporet, som svarer på gjeldende krav.
  function tilSvarkontroll(s: Spor, k: TilBrevkontrollen) {
    const krav = brev.find((b) => b.id === u?.spor[s].gjeldendeKrav?.dokument);
    melding = null;
    tilArbeid({
      art: 'kontroll',
      versjon: kjernesak.versjon,
      ...k,
      sendTekst: BREVKONTROLL.sendSvaret,
      tilbakeTil: 'utkastet',
      svarerPaa: krav ?? null,
      tilbake: { art: 'svar' },
      utkastet: s,
    });
  }

  /** Brevkontrollen for BHs svar på varselet `gjelder` som står alene (VS-U79). */
  function tilVarselsvarkontroll(gjelder: string, k: TilBrevkontrollen) {
    melding = null;
    tilArbeid({
      art: 'kontroll',
      versjon: kjernesak.versjon,
      ...k,
      sendTekst: BREVKONTROLL.sendSvaret,
      tilbakeTil: 'utkastet',
      svarerPaa: (u && brevMedUtsagn(u, gjelder)) ?? null,
      tilbake: { art: 'varselsvar', gjelder },
      utkastet: null,
    });
  }

  /** Brevkontrollen for TEs krav i sporet, med forrige krav og svaret på det som relasjoner. */
  /** `varsel`: brevet har bare varsler og er ikke en ny versjon av kravet (BF-37). */
  function tilKravkontroll(
    s: Kravspor,
    k: TilBrevkontrollen & Pick<Kontroll, 'vedlegg'>,
    varsel = false
  ) {
    const kravet = varsel
      ? undefined
      : brev.find((b) => b.id === u?.spor[s].gjeldendeKrav?.dokument);
    const svaret = varsel
      ? undefined
      : brev.find((b) => b.id === u?.spor[s].gjeldendeSvar?.dokument);
    melding = null;
    tilArbeid({
      art: 'kontroll',
      versjon: kjernesak.versjon,
      ...k,
      sendTekst: KRAVSKJEMA.sendTekst,
      tilbakeTil: KRAVSKJEMA.tilbakeTil,
      svarerPaa: null,
      relasjoner: [
        ...(kravet ? [{ hva: NYVERSJON.forrigeBrev, brev: KRAVSKJEMA.forrigeKravet(kravet) }] : []),
        ...(svaret ? [{ hva: BREVKONTROLL.viserTil, brev: NYVERSJON.viserTilBrev(svaret) }] : []),
      ],
      kvittering: KRAVSKJEMA.kvittering,
      tilbake: { art: kravetI[s] },
      utkastet: null,
    });
  }

  function velgSpor(s: Spor) {
    nyttSpor = true;
    void tick().then(() => (nyttSpor = false));
    if (valgt !== s || arbeid.art !== 'les') tilArbeid({ art: 'les' }, s);
    melding = null;
  }

  async function tilForholdet() {
    velgSpor('forhold');
    await fokuser(() => arbeidsflate?.querySelector<HTMLElement>('h2[tabindex="-1"]'));
  }

  async function proevIgjen() {
    proever = true;
    try {
      await kjernesak.last();
    } finally {
      proever = false;
      sistForsoekt = new Date().toISOString();
    }
  }

  function sendt(k: Kontroll, s: Spor) {
    if (k.utkastet) tomtUtkast(k.utkastet);
    if (k.tilbake.art === 'varselsvar') tomtVarselsutkast(k.tilbake.gjelder);
    else if (k.tilbake.art === 'vederlagskrav' && utkastene.vederlagskrav?.hva === 'varsel')
      etterVarslene();
    else if (erUtkastnavn(k.tilbake.art)) {
      tom(k.tilbake.art);
      fjernSkjemautkast(s, k.tilbake.art);
    }
    fjernUtkast(s, 'kontroll');
    const sammeBrevkontroll =
      valgt === s && arbeid.art === 'kontroll' && arbeid.kommando === k.kommando;
    if (sammeBrevkontroll) tilArbeid({ art: 'les' }, s, true);
    melding = {
      tekst: k.kvittering ?? MOTTATT.sendtTil(kjernesak.part === 'TE' ? 'BH' : 'TE'),
      art: 'sendt',
    };
    const id = kjernesak.sistSendteHendelse;
    if (sammeBrevkontroll && u && id) kvittert = brevet(u, id);
  }

  /** Tilbake til saken med kvitteringen `tekst`, som får fokus. */
  async function tilSaken(tekst: string, art: 'sendt' | 'forkastet') {
    tilArbeid({ art: 'les' }, valgt, true);
    melding = { tekst, art };
    await fokuser(() => meldingen);
  }

  /** Utkastet i skjemaet `n` er forkastet. Svarutkastet forkastes med `forkast`. */
  function forkastUtkast(
    n: Exclude<
      Utkastnavn,
      (typeof svaretI)[Spor] | 'varselsvar' | 'varslenesvar' | 'varselbrevsvar'
    >
  ) {
    tom(n);
    fjernSkjemautkast(valgt, n);
    return tilSaken(MOTTATT.forkastet, 'forkastet');
  }

  /**
   * Etter en avvist sending kan saken være lastet på nytt. Har den fått en ny versjon, kan
   * «Svarer på», «Dette sender du» og virkningene være endret, og de regnes i skjemaet. Avsenderen
   * går da tilbake dit med valgene i behold, og brevkontrollen bygges på nytt derfra (oppdragsgiver
   * 07.11, punkt 2 i #1596). Er versjonen uendret, kan en annen sak ha fått nummeret. Brevet lages
   * da igjen av den samme kommandoen, så teksten og hodet avsenderen godkjenner, er det som sendes
   * (LV-U2, LV-U51, D-5 i BF-07). Avviser kjernen kommandoen nå, står brevet og meldingen fra
   * sendingen.
   */
  async function byggPaaNytt(k: Kontroll) {
    if (arbeid.art !== 'kontroll' || arbeid.kommando !== k.kommando) return;
    if (kjernesak.versjon !== k.versjon) {
      kjernesak.fjernFeil();
      tilArbeid(k.tilbake, valgt, true);
      melding = { tekst: MOTTATT.sakenEndret, art: 'endret' };
      await fokuser(() => meldingen);
      return;
    }
    const { brevet } = brevTilKontrollen(kjernesak, k.kommando, k.vedlegg);
    if (!brevet) return;
    // LV-U2.
    tilArbeid({ ...arbeid, ...brevet }, valgt, true);
  }

  type Skjema = {
    /** Handlingsnøklene fra kjernen som åpner skjemaet. `handlinger.py` leser dem. */
    noekler: readonly string[];
    aapne?: (noekkel: string) => void;
    /** Skjemaet står i arbeidsflaten. Det første i `skjemaene` som står, vises. */
    vises: (a: Arbeid) => boolean;
    /** Komponenten, i snippeten med samme navn som skjemaet. */
    skjema: Snippet<[Utledning]>;
  };
  /**
   * Svaret på kravet i `spor` og det nye svaret som erstatter det gjeldende (HF-U29). `utkastet`
   * leser svaret utkastet erstatter, og `fyll` fyller utkastet fra et svar, eller tomt.
   */
  function svaretPaaKravet(
    spor: 'vederlag' | 'frist',
    skjema: Snippet<[Utledning]>,
    utkastet: { erstatter: () => string | undefined; fyll: (forrige: Svar | null) => void }
  ): Omit<Skjema, 'noekler'> {
    // Nøklene står i `skjemaene`, der vakten for handlingsregisteret leser dem.
    const noekler = [`svare:${spor}`, `revidere:${spor}`];
    return {
      aapne: (n) => {
        const forrige = u?.spor[spor].gjeldendeSvar;
        // Et påbegynt nytt svar på det gjeldende svaret står. Et annet utkast kan ikke sendes
        // med handlingen, så skjemaet åpner med svaret det erstatter, eller tomt.
        const erstatter = n === `revidere:${spor}` ? forrige?.id : undefined;
        if (utkastet.erstatter() !== erstatter) utkastet.fyll(erstatter ? forrige! : null);
        aapneUtkast({ art: 'svar' });
      },
      vises: (a) =>
        a.art === 'svar' && valgt === spor && noekler.some((n) => kjernesak.handlinger.includes(n)),
      skjema,
    };
  }
  /**
   * Skjemaene i arbeidsflaten, med det tomme utkastet i `tommeUtkast`. Varden åpner dem fra «Det
   * du kan gjøre nå», med hele nøkkelen fra kjernen. Bare en nøkkel her blir en knapp som åpner
   * noe; resten sier at handlingen ikke er bygget (#1636, #1663).
   */
  const skjemaene = {
    korrigering: {
      noekler: [],
      vises: (a) => a.art === 'korrigering' && kanKorrigere(a.gjelder),
      skjema: korrigering,
    },
    kunnskapsdato: {
      noekler: [],
      vises: (a) =>
        a.art === 'kunnskapsdato' &&
        kjernesak.handlinger.includes(`oppgi_kunnskapsdato:${a.gjelder}`),
      skjema: kunnskapsdato,
    },
    nyversjon: {
      noekler: ['krav:forhold'],
      aapne: () => aapneUtkast({ art: 'nyversjon' }),
      vises: (a) =>
        a.art === 'nyversjon' &&
        valgt === 'forhold' &&
        kjernesak.handlinger.includes('krav:forhold') &&
        !!u?.spor.forhold.gjeldendeKrav,
      skjema: nyversjon,
    },
    korrespondanse: {
      // OV-U79, OV-U80: korrespondanse parten har sendt utenfor løsningen (arbeidsvalget 16.11, #807).
      noekler: ['registrere_brev'],
      aapne: () => {
        if (lagtTil?.spor !== valgt) lagtTil = { spor: valgt, valg: tomtLagtTil(valgt) };
        tilArbeid({ art: 'korrespondanse' });
      },
      vises: (a) => a.art === 'korrespondanse' && lagtTil?.spor === valgt,
      skjema: korrespondanse,
    },
    innlegg: {
      // OV-U97, MM-U47: innlegget i fritekst fra begge parter, fra hodet til tråden (BF-03).
      noekler: ['sende_innlegg'],
      aapne: () => {
        utkastene.innlegg ??= nyttInnlegg();
        // Utkastet er ett i saken, og står på siden det sist ble åpnet fra.
        for (const s of ['forhold', 'vederlag', 'frist'] as const)
          if (s !== valgt) fjernUtkast(s, 'innlegg');
        aapneUtkast({ art: 'innlegg' });
      },
      vises: (a) =>
        a.art === 'innlegg' &&
        !!utkastene.innlegg &&
        kjernesak.handlinger.includes('sende_innlegg'),
      skjema: innlegg,
    },
    vederlagskrav: {
      // U-1 i BF-37: varselet uten krav står i skjemaet for kravet.
      noekler: [
        'krav:vederlag',
        'sende_varsel:vederlag',
        'sende_varsel:34.1.3',
        'sende_varsel:34.3.3',
        'sende_varsel:34.4',
        'varsle:vederlag',
        'varsle:34.1.3',
        'varsle:34.3.3',
        'varsle:34.4',
      ],
      aapne: (n) => {
        if (n !== 'krav:vederlag' && u) {
          const [type, hjemmel] = fraHandlingsnoekkel(n);
          vederlagsvarsel(hjemmel, type === 'varsle');
        }
        if (n === 'krav:vederlag' && utkastene.vederlagskrav) utkastene.vederlagskrav.hva = 'krav';
        aapneUtkast({ art: 'vederlagskrav' });
      },
      vises: (a) =>
        a.art === 'vederlagskrav' &&
        valgt === 'vederlag' &&
        (utkastene.vederlagskrav?.hva === 'varsel'
          ? Object.values(kanVarsle(kjernesak.handlinger)).some(Boolean)
          : kjernesak.handlinger.includes('krav:vederlag')),
      skjema: vederlagskrav,
    },
    fristkrav: {
      // U-13: varselet etter punkt 33.4 alene, i skjemaet for kravet (BF-20 steg 4).
      noekler: ['krav:frist', 'sende_varsel:frist', 'varsle:frist'],
      aapne: (n) =>
        n === 'krav:frist' ? fristskjema('krav') : fristskjema('varsel', n === 'varsle:frist'),
      vises: (a) => a.art === 'fristkrav' && valgt === 'frist' && fristskjemaTilbudt,
      skjema: fristkrav,
    },
    forholdssvar: {
      noekler: ['svare:forhold'],
      aapne: () => {
        // Svaret sendes fra løsningen, også et utkast som var et svar lagt til.
        svaretFra = null;
        aapneUtkast({ art: 'svar' });
      },
      vises: (a) =>
        a.art === 'svar' &&
        valgt === 'forhold' &&
        (utenPaaberopelsen() ||
          kjernesak.handlinger.includes('svare:forhold') ||
          (!!lagtTilI('forhold', 'svar') && !!u?.spor.forhold.gjeldendeKrav)),
      skjema: forholdssvar,
    },
    // Det nye svaret på kravet har samme skjema som svaret (HF-U29, G-8 i BF-46).
    vederlagssvar: {
      noekler: ['svare:vederlag', 'revidere:vederlag'],
      ...svaretPaaKravet('vederlag', vederlagssvar, {
        erstatter: () => utkastene.vederlagssvar.erstatter,
        fyll: (f) =>
          (utkastene.vederlagssvar = f
            ? valgFraSvaret(f, u!.spor.vederlag.gjeldendeKrav!)
            : tomtSvar()),
      }),
    },
    fristsvar: {
      noekler: ['svare:frist', 'revidere:frist'],
      ...svaretPaaKravet('frist', fristsvar, {
        erstatter: () => utkastene.fristsvar.erstatter,
        fyll: (f) =>
          (utkastene.fristsvar = f
            ? valgFraFristsvaret(f, u!.spor.frist.gjeldendeKrav!)
            : tomtFristsvar()),
      }),
    },
    varselsvar: {
      // G-9 i BF-14, VS-U79, VS-U96 punkt 32: svaret på et varsel som står alene, og et nytt
      // svar på det, i sporet varselet står i.
      noekler: ['svare:*', 'revidere:*'],
      aapne: (n) => {
        let gjelder = kjernesak.tilbudte.find((h) => h.noekkel === n)!.gjelder!;
        // M-5 i BF-37: varslene i et brev med flere varsler besvares i ett svar.
        const iBrevet = u && varsleneIBrevet(u, kjernesak.tilbudte, gjelder);
        if (iBrevet) {
          gjelder = iBrevet[0]!.id;
          utkastene.varselbrevsvar[gjelder] ??= {};
        }
        // VS-U96 punkt 38: svaret bare på varslene i vederlagskravet `gjelder`.
        else if (u && varsleneIVederlagskravet(u, gjelder))
          utkastene.varslenesvar[gjelder] ??= tomtVarslenesvar();
        else utkastene.varselsvar[gjelder] ??= tomtVarselsvar();
        aapneUtkast({ art: 'varselsvar', gjelder });
      },
      vises: (a) =>
        a.art === 'varselsvar' &&
        valgt === varselsporet(a.gjelder) &&
        kanSvarePaaVarselet(a.gjelder),
      skjema: varselsvar,
    },
  } satisfies Record<string, Skjema>;
  const skjemalista: Skjema[] = Object.values(skjemaene);
  const aktivtSkjema = $derived(skjemalista.find((s) => s.vises(arbeid))?.skjema ?? null);
  /** Et utkast vises på oversikten bare når skjemaet for det kan åpnes nå. */
  const kanAapnes = (utkast: Skjemaarbeid) => skjemalista.some((s) => s.vises(utkast));
  /**
   * Kjernen avviser et svar på en trukket påberopelse (`KRAV_TRUKKET`), så utkastet står bare med
   * valget om å forkaste det (#2104).
   */
  const utenPaaberopelsen = () =>
    !!u?.spor.forhold.trukket && (!!lagtTilI('forhold', 'svar') || harSvarutkast('forhold'));
  /** Kravet eller svaret lagt til fylles ut i skjemaet for det (OV-U80). */
  function videreFraKorrespondansen(kategori: 'krav' | 'svar') {
    if (!lagtTil || !u) return;
    if (kategori === 'svar') {
      svaretFra = { ...lagtTil.valg.korrespondanse };
      aapneUtkast({ art: 'svar' });
    } else if (valgt === 'frist') {
      // `utenfor` i utkastet står; skjemaet ser bort fra det når kravet legges til.
      if (!eldreKrav(u, 'frist', lagtTil.valg.korrespondanse.dato))
        utkastene.fristkrav = { ...(utkastene.fristkrav ?? fristkravstart(u)), hva: 'krav' };
      aapneUtkast({ art: 'fristkrav', fraKorrespondansen: true });
    } else {
      // Varslene i utkastet står; kravet lagt til fylles ut i kravskjemaet (BF-49).
      const v = utkastene.vederlagskrav;
      if (v?.hva === 'varsel' && !eldreKrav(u, 'vederlag', lagtTil.valg.korrespondanse.dato))
        v.hva = 'krav';
      aapneUtkast({ art: 'vederlagskrav', fraKorrespondansen: true });
    }
  }
  /**
   * Et krav lagt til, sendt før det siste i sporet, har et eget utkast i skjemaet (OV-U118,
   * `eldrekrav.ts`). Da står TEs utkast til neste krav når det legges til eller forkastes.
   */
  const utkastetStaar = (s: Kravspor) =>
    !!u && !!eldreKrav(u, s, lagtTilI(s, 'krav')?.dato) && utkastene[kravetI[s]] !== null;
  function forkastKravet(s: Kravspor) {
    if (!utkastetStaar(s)) return forkastUtkast(kravetI[s]);
    lagtTil = null;
    return tilSaken(MOTTATT.forkastet, 'forkastet');
  }
  /**
   * D-13 og U-12 i BF-49: skjemaet for korrespondansen, utfylt fra dokumentasjonen `b` og med
   * henvisningen til den (`retter`), så parten kan velge det den er etter kontrakten.
   */
  function leggTilPaaNytt(u: Utledning, b: Brevet) {
    const d = u.journal.find((h) => h.art === 'dokument' && h.dokument.id === b.id);
    if (d?.art !== 'dokument') return;
    lagtTil = {
      spor: valgt,
      valg: {
        ...tomtLagtTil(valgt),
        avsender: b.avsender,
        spor: [...d.dokument.spor],
        korrespondanse: {
          type: b.korrespondansetype,
          sendemaate: b.sendemaate,
          dato: b.sendt ?? '',
          // Dokumentet er alt i saken; størrelsen er ikke lagret med det.
          vedlegg: d.dokument.dokumentasjon.map((v) => ({ ...v, stoerrelse: 0 })),
          beskrivelse: b.beskrivelse ?? '',
          retter: b.id,
        },
      },
    };
    tilArbeid({ art: 'korrespondanse' });
  }
  /** Tilbake til korrespondansen fra krav- eller svarskjemaet. */
  function tilKorrespondansen() {
    // Korrespondansen for svarutkastet står selv om skjemaet er brukt i et annet spor siden.
    if (svaretFra && valgt === 'forhold' && lagtTil?.spor !== 'forhold')
      lagtTil = {
        spor: 'forhold',
        valg: {
          ...tomtLagtTil('forhold'),
          korrespondanse: { ...svaretFra },
          avsender: kjernesak.part,
          kategori: 'svar',
        },
      };
    tilbakeTil({ art: 'korrespondanse' });
  }
  function lagtTilKvittering(tekst: string, krav: Kravspor | null = null) {
    lagtTil = null;
    // Kravet er lagt til, så utkastet er brukt, som etter sendingen (`sendt`).
    if (krav) {
      tom(kravetI[krav]);
      fjernUtkast(krav, kravetI[krav]);
    }
    return tilSaken(tekst, 'sendt');
  }
  /**
   * «Bare varsle» i skjemaet for vederlaget (U-1 i BF-37), med en rad for `hjemmel` når skjemaet
   * ikke har varsler ennå, og som registrering når `registrer`. Utkastet til kravet står.
   */
  function vederlagsvarsel(hjemmel: Vederlagsvarselhjemmel, registrer: boolean) {
    if (!u) return;
    const v = utkastene.vederlagskrav ?? vederlagskravstart(u);
    if (!v.varsling?.rader.length) {
      utkastene.vederlagskrav = {
        ...v,
        hva: 'varsel',
        varsling: startvarsling(hjemmel, registrer),
      };
      return;
    }
    const varsling = {
      ...v.varsling,
      utenfor: registrer ? (v.varsling.utenfor ?? tomKorrespondanse()) : null,
    };
    // Varselet TE åpnet fra handlingene, får en rad når skjemaet ikke har det.
    const tilbudt = tilbudteHjemler(kjernesak.handlinger, registrer);
    if (
      !varsling.rader.some((r) => r.hjemmel === hjemmel) &&
      hjemlerForRaden(varsling, null, tilbudt).includes(hjemmel)
    )
      varsling.rader = [...varsling.rader, nyVarselrad(varsling, hjemmel)];
    utkastene.vederlagskrav = { ...v, hva: 'varsel', varsling };
  }
  /**
   * Varslene er sendt eller registrert. Har TE skrevet i kravet, står utkastet til kravet, og
   * ellers forkastes det (U-1 i BF-37).
   */
  function etterVarslene() {
    const v = utkastene.vederlagskrav;
    const kravet = (x: Kravvalg) =>
      JSON.stringify([x.poster, x.saerskilt, x.trekkerSaerskilt ?? false, x.forbehold]);
    if (v && u && kravet(v) !== kravet(vederlagskravstart(u))) {
      utkastene.vederlagskrav = { ...v, hva: 'krav', varsling: undefined };
      return;
    }
    tom('vederlagskrav');
    fjernUtkast('vederlag', 'vederlagskrav');
  }

  /**
   * Skjemaet for kravet om fristforlengelse, med varselet alene eller kravet valgt. Uten
   * `sende_varsel:frist` registreres varselet (VS-U16).
   */
  function fristskjema(hva: Fristkravvalg['hva'], registrer = false) {
    if (u) {
      const v = utkastene.fristkrav ?? fristkravstart(u);
      utkastene.fristkrav = {
        ...v,
        hva,
        // «Send varsel» sender fra løsningen, og registrerer ikke et varsel som er påbegynt.
        utenfor: registrer
          ? (v.utenfor ?? tomKorrespondanse())
          : hva === 'varsel'
            ? null
            : v.utenfor,
      };
    }
    aapneUtkast({ art: 'fristkrav' });
  }
  // U-11: svaret på forespørselen etter punkt 33.6.2 åpner skjemaet for kravet.
  const foresporselssvar = $derived(
    kjernesak.tilbudte.filter((h) => h.type === 'svare_paa_foresporsel').map((h) => h.noekkel)
  );
  /**
   * Nøkkelen `type:*` gjelder hver tilbudt handling av typen som viser til et element, som
   * nøklene i handlingsregisteret (#2003).
   */
  const noeklene = (s: Skjema) =>
    s.noekler.flatMap((n) =>
      n.endsWith(':*')
        ? kjernesak.tilbudte
            .filter((h) => h.gjelder !== null && `${h.type}:*` === n)
            .map((h) => h.noekkel)
        : [n]
    );
  const skjemanoeklene = $derived([...skjemalista.flatMap(noeklene), ...foresporselssvar]);
  function aapne(n: string) {
    const skjema = skjemalista.find((s) => noeklene(s).includes(n));
    if (skjema?.aapne) skjema.aapne(n);
    else if (foresporselssvar.includes(n)) fristskjema('krav');
  }
  /** Fristskjemaet står åpent når kjernen tilbyr en av handlingene det åpnes fra. */
  const fristskjemaTilbudt = $derived(
    kjernesak.tilbudte.some(
      (h) => h.spor === 'frist' && FRISTSKJEMAET[utkastene.fristkrav?.hva ?? 'krav'].has(h.type)
    )
  );

  /**
   * Skjemaet for korrigeringen vises når kjernen tilbyr den og opplysningen står i et brev i saken
   * (#1647).
   */
  const kanKorrigere = (gjelder: string) =>
    kjernesak.handlinger.includes(`korrigere:${gjelder}`) &&
    !!u &&
    datoopplysningene(u).some((o) => o.id === gjelder);

  /**
   * Et nytt innlegg viser til motpartens siste brev på siden, ellers i saken (U-2 i BF-03). Parten
   * kan velge et annet brev i skjemaet.
   */
  function nyttInnlegg(): Innleggsvalg {
    const motpart = kjernesak.part === 'TE' ? 'BH' : 'TE';
    const fraMotparten = (liste: Brevet[]) => liste.findLast((b) => b.avsender === motpart);
    const b = fraMotparten(brevITraaden(brev, valgt)) ?? fraMotparten(brev) ?? brev.at(-1);
    return { gjelder: b?.id ?? '', tittel: '', tekst: '', vedlegg: [] };
  }

  /**
   * Svaret innlegget ikke endrer, og det parten fortsatt kan gjøre (U-3, D-4, D-10). Svaret er det
   * gjeldende i sporet til brevet innlegget viser til (G-7), det første sporet som har et svar.
   */
  function innleggetsVirkning(viserTil: Brevet) {
    const mottaker = kjernesak.part === 'TE' ? 'BH' : 'TE';
    const spor = viserTil.spor.find((s) => u?.spor[s].gjeldendeSvar) ?? viserTil.spor[0] ?? valgt;
    const svaret = brev.find((b) => b.id === u?.spor[spor].gjeldendeSvar?.dokument) ?? null;
    const kanGodta =
      kjernesak.handlinger.includes(`godta:${spor}`) &&
      kjernesak.handlinger.includes(`krav:${spor}`);
    const te = kjernesak.part === 'TE' && svaret && kanGodta;
    const bh = kjernesak.part === 'BH' && svaret;
    // Et nytt svar nevnes bare når kjernen tilbyr det (U-10 i BF-03).
    const nyttSvar = kjernesak.handlinger.includes(`revidere:${spor}`);
    return {
      virkninger: [
        INNLEGGET.sendesTil(mottaker, svaret, spor),
        ...(te ? [INNLEGGET.fortsattTE] : bh ? [INNLEGGET.standpunkteneBH(nyttSvar)] : []),
      ],
      kvittering: INNLEGGET.kvittering(
        mottaker,
        svaret,
        te ? INNLEGGET.kvitteringTE : bh && nyttSvar ? INNLEGGET.kvitteringBH : null
      ),
    };
  }

  function forkast() {
    tomtUtkast(valgt);
    return tilSaken(MOTTATT.forkastet, 'forkastet');
  }
</script>

<!-- Skjemaene i `skjemaene`, med utkastet i `utkastene`. -->
{#snippet korrigering(u: Utledning)}
  {#if arbeid.art === 'korrigering'}
    {@const gjelder = arbeid.gjelder}
    <Korrigering
      {kjernesak}
      {u}
      {gjelder}
      bind:valg={utkastene.korrigering}
      onforkast={() => forkastUtkast('korrigering')}
      onbrevkontroll={(k) => {
        const viserTil = datoopplysningene(u).find((o) => o.id === gjelder)?.brev ?? null;
        melding = null;
        tilArbeid({
          art: 'kontroll',
          versjon: kjernesak.versjon,
          ...k,
          sendTekst: KORRIGERING.sendTekst,
          tilbakeTil: KORRIGERING.tilbakeTil,
          svarerPaa: viserTil,
          henvisning: BREVKONTROLL.viserTil,
          kvittering: KORRIGERING.kvittering(
            (k.kommando.paalegg_mottatt ?? k.kommando.klar_over_forholdet) as string,
            k.kommando.paalegg_mottatt ? 'paalegg_mottatt' : 'klar_over_forholdet',
            u.forholdAvvist,
            !!u.spor.forhold.gjeldendeSvar
          ),
          tilbake: { art: 'korrigering', gjelder },
          utkastet: null,
        });
      }}
    />
  {/if}
{/snippet}

{#snippet kunnskapsdato(u: Utledning)}
  {#if arbeid.art === 'kunnskapsdato'}
    {@const gjelder = arbeid.gjelder}
    <Kunnskapsdato
      {kjernesak}
      {u}
      {gjelder}
      bind:valg={utkastene.kunnskapsdato}
      onforkast={() => forkastUtkast('kunnskapsdato')}
      onbrevkontroll={(k) => {
        melding = null;
        tilArbeid({
          art: 'kontroll',
          versjon: kjernesak.versjon,
          ...k,
          sendTekst: KUNNSKAPSDATO.sendTekst,
          tilbakeTil: KUNNSKAPSDATO.tilbakeTil,
          svarerPaa: brevMedUtsagn(u, gjelder),
          henvisning: BREVKONTROLL.viserTil,
          kvittering: KUNNSKAPSDATO.kvittering(
            k.kommando.klar_over_utgiftene as string,
            u.forholdAvvist,
            !!u.spor.vederlag.gjeldendeSvar
          ),
          tilbake: { art: 'kunnskapsdato', gjelder },
          utkastet: null,
        });
      }}
    />
  {/if}
{/snippet}

{#snippet nyversjon(u: Utledning)}
  <Paaberopelsesversjon
    {kjernesak}
    {u}
    bind:tekst={utkastene.nyversjon}
    onforkast={() => forkastUtkast('nyversjon')}
    onvedsiden={(v) => (vedSiden = v)}
    onbrevkontroll={(k) => {
      const svaret = brev.find((b) => b.id === u.spor.forhold.gjeldendeSvar?.dokument);
      const kravet = brev.find((b) => b.id === u.spor.forhold.gjeldendeKrav?.dokument);
      melding = null;
      tilArbeid({
        art: 'kontroll',
        versjon: kjernesak.versjon,
        ...k,
        sendTekst: NYVERSJON.sendTekst,
        tilbakeTil: NYVERSJON.tilbakeTil,
        svarerPaa: svaret ?? null,
        henvisning: BREVKONTROLL.viserTil,
        relasjoner: [
          ...(kravet
            ? [{ hva: NYVERSJON.forrigeBrev, brev: NYVERSJON.forrigeBrevet(kravet) }]
            : []),
          ...(svaret ? [{ hva: BREVKONTROLL.viserTil, brev: NYVERSJON.viserTilBrev(svaret) }] : []),
        ],
        kvittering: NYVERSJON.kvittering,
        tilbake: { art: 'nyversjon' },
        utkastet: null,
      });
    }}
  />
{/snippet}

{#snippet korrespondanse(u: Utledning)}
  {#if lagtTil}
    <Korrespondanseskjema
      {kjernesak}
      {u}
      spor={valgt}
      bind:valg={lagtTil.valg}
      onneste={videreFraKorrespondansen}
      onlagttil={(k) => lagtTilKvittering(LEGG_TIL.lagtTil[k])}
      onavbryt={() => {
        lagtTil = null;
        tilbakeTil(harSvarutkast(valgt) ? { art: 'svar' } : { art: 'les' });
      }}
    />
  {/if}
{/snippet}

{#snippet innlegg(u: Utledning)}
  {#if utkastene.innlegg}
    <Innlegg
      {kjernesak}
      {u}
      spor={valgt}
      bind:valg={utkastene.innlegg}
      virkninger={(b) => innleggetsVirkning(b).virkninger}
      onforkast={() => forkastUtkast('innlegg')}
      onvedsiden={(v) => (vedSiden = v)}
      onbrevkontroll={({ viserTil, ...k }) => {
        melding = null;
        tilArbeid({
          art: 'kontroll',
          versjon: kjernesak.versjon,
          ...k,
          sendTekst: INNLEGGET.sendTil(kjernesak.part === 'TE' ? 'BH' : 'TE'),
          tilbakeTil: INNLEGGET.tilbakeTil,
          svarerPaa: viserTil,
          henvisning: BREVKONTROLL.viserTil,
          kvittering: innleggetsVirkning(viserTil).kvittering,
          tilbake: { art: 'innlegg' },
          utkastet: null,
        });
      }}
    />
  {/if}
{/snippet}

{#snippet vederlagskrav(u: Utledning)}
  {#if utkastene.vederlagskrav?.hva === 'varsel' && utkastene.vederlagskrav.varsling && !lagtTilI('vederlag', 'krav')}
    <Vederlagsvarsel
      {kjernesak}
      {u}
      bind:valg={utkastene.vederlagskrav.varsling}
      kanKreve={kjernesak.handlinger.includes('krav:vederlag')}
      onkrav={() => {
        if (utkastene.vederlagskrav) utkastene.vederlagskrav.hva = 'krav';
      }}
      onforkast={() => forkastKravet('vederlag')}
      onvedsiden={(v) => (vedSiden = v)}
      onbrevkontroll={(k) => tilKravkontroll('vederlag', k, true)}
      onregistrert={() => {
        etterVarslene();
        return tilSaken(VEDERLAGSVARSEL.registrert, 'sendt');
      }}
      onkunnskapsdato={(gjelder) => {
        melding = null;
        aapneUtkast({ art: 'kunnskapsdato', gjelder });
      }}
    />
  {:else}
    <Vederlagskrav
      {kjernesak}
      {u}
      lagtTil={lagtTilI('vederlag', 'krav')}
      onendre={tilKorrespondansen}
      onlagttil={() =>
        lagtTilKvittering(LEGG_TIL.lagtTil.krav, utkastetStaar('vederlag') ? null : 'vederlag')}
      bind:valg={utkastene.vederlagskrav}
      onforkast={() => forkastKravet('vederlag')}
      onvedsiden={(v) => (vedSiden = v)}
      onbrevkontroll={(k) => tilKravkontroll('vederlag', k)}
      onkunnskapsdato={(gjelder) => {
        melding = null;
        aapneUtkast({ art: 'kunnskapsdato', gjelder });
      }}
      onvarsle={(registrer, hjemmel = foersteVarsel(kjernesak.handlinger, registrer)) => {
        if (hjemmel) vederlagsvarsel(hjemmel, registrer);
      }}
    />
  {/if}
{/snippet}

{#snippet fristkrav(u: Utledning)}
  <Fristkrav
    {kjernesak}
    {u}
    {sakslenke}
    lagtTil={lagtTilI('frist', 'krav')}
    onendre={tilKorrespondansen}
    onlagttil={() =>
      lagtTilKvittering(LEGG_TIL.lagtTil.krav, utkastetStaar('frist') ? null : 'frist')}
    bind:valg={utkastene.fristkrav}
    onforkast={() => forkastKravet('frist')}
    onbrevkontroll={(k) => tilKravkontroll('frist', k)}
    onvedsiden={(v) => (vedSiden = v)}
    onregistrert={(kravetStaar) => {
      if (kravetStaar && utkastene.fristkrav)
        utkastene.fristkrav = { ...utkastene.fristkrav, hva: 'krav', utenfor: null };
      else {
        tom('fristkrav');
        fjernUtkast('frist', 'fristkrav');
      }
      return tilSaken(FRISTKRAV.registrert, 'sendt');
    }}
  />
{/snippet}

{#snippet forholdssvar(u: Utledning)}
  {#if utenPaaberopelsen()}
    <div
      class="uten-paaberopelse"
      tabindex="-1"
      aria-labelledby={`${uid}-uten-paaberopelse`}
      bind:this={utenPaaberopelse}
    >
      <Melding art="info" levende={false} id={`${uid}-uten-paaberopelse`}
        >{FORHOLDET.svaretUtenPaaberopelse(!!lagtTilI('forhold', 'svar'))}</Melding
      >
      <Forkastutkast tekst={FORHOLDET.forkastSvaret} onforkast={forkast} />
    </div>
  {:else}
    <Forholdssvar
      {kjernesak}
      {u}
      lagtTil={lagtTilI('forhold', 'svar')}
      onendre={tilKorrespondansen}
      onleggtil={() => {
        skjemaene.korrespondanse.aapne();
        // Svaret parten har gitt før, er sendt av parten selv (U-2 i BF-49).
        lagtTil!.valg.avsender = kjernesak.part;
        lagtTil!.valg.kategori = 'svar';
      }}
      onlagttil={() => {
        tomtUtkast('forhold');
        void lagtTilKvittering(LEGG_TIL.lagtTil.svar);
      }}
      bind:valg={utkastene.forholdssvar}
      onforkast={forkast}
      onvedsiden={(v) => (vedSiden = v)}
      onbrevkontroll={(k) => tilSvarkontroll('forhold', k)}
    />
  {/if}
{/snippet}

{#snippet vederlagssvar(u: Utledning)}
  <Vederlagssvar
    {kjernesak}
    {u}
    bind:valg={utkastene.vederlagssvar}
    onforkast={forkast}
    onvedsiden={(v) => (vedSiden = v)}
    onbrevkontroll={(k) => tilSvarkontroll('vederlag', k)}
    onforholdet={tilForholdet}
  />
{/snippet}

{#snippet fristsvar(u: Utledning)}
  <Fristsvar
    {kjernesak}
    {u}
    bind:valg={utkastene.fristsvar}
    onforkast={forkast}
    onvedsiden={(v) => (vedSiden = v)}
    onbrevkontroll={(k) => tilSvarkontroll('frist', k)}
    onforholdet={tilForholdet}
  />
{/snippet}

{#snippet varselsvar(u: Utledning)}
  {#if arbeid.art === 'varselsvar'}
    {@const gjelder = arbeid.gjelder}
    {@const varselet = varseletSvaretPaa(u, gjelder)}
    {@const varslene = varselet ? null : varsleneIVederlagskravet(u, gjelder)}
    {@const iBrevet = varsleneIBrevet(u, kjernesak.tilbudte, gjelder)}
    {#if iBrevet && utkastene.varselbrevsvar[gjelder]}
      {#key gjelder}
        <Varselbrevsvar
          {kjernesak}
          {u}
          varslene={iBrevet}
          bind:valg={utkastene.varselbrevsvar[gjelder]}
          onforkast={() => {
            tomtVarselsutkast(gjelder);
            return tilSaken(MOTTATT.forkastet, 'forkastet');
          }}
          onvedsiden={(v) => (vedSiden = v)}
          onbrevkontroll={(k) => tilVarselsvarkontroll(gjelder, k)}
          onforholdet={tilForholdet}
        />
      {/key}
    {:else if varslene && utkastene.varslenesvar[gjelder]}
      {#key gjelder}
        <Varslenesvar
          {kjernesak}
          {u}
          {varslene}
          bind:valg={utkastene.varslenesvar[gjelder]}
          onforkast={() => {
            tomtVarselsutkast(gjelder);
            return tilSaken(MOTTATT.forkastet, 'forkastet');
          }}
          onvedsiden={(v) => (vedSiden = v)}
          onbrevkontroll={(k) => tilVarselsvarkontroll(gjelder, k)}
          onforholdet={tilForholdet}
        />
      {/key}
    {:else if varselet && utkastene.varselsvar[gjelder]}
      {#key gjelder}
        <Varselsvar
          {kjernesak}
          {u}
          {varselet}
          bind:valg={utkastene.varselsvar[gjelder]}
          onforkast={() => {
            tomtVarselsutkast(gjelder);
            return tilSaken(MOTTATT.forkastet, 'forkastet');
          }}
          onvedsiden={(v) => (vedSiden = v)}
          onbrevkontroll={(k) => tilVarselsvarkontroll(gjelder, k)}
          onforholdet={tilForholdet}
          nyttSvarPaaKravet={kjernesak.handlinger.includes('revidere:vederlag')
            ? () => aapne('revidere:vederlag')
            : null}
        />
      {/key}
    {/if}
  {/if}
{/snippet}

{#snippet utkastkortene()}
  {#each utkastArbeid[valgt].filter(kanAapnes) as utkast (utkastnoekkel(utkast))}
    <section class="utkastkort" aria-label={SAKEN.utkast}>
      <h2>{utkasttittel(utkast)}</h2>
      <Knapp variant="primaer" onclick={() => aapneUtkast(utkast)}>{SAKEN.fortsettUtkastet}</Knapp>
    </section>
  {/each}
{/snippet}

<Vardenskall
  {sti}
  {bruker}
  {kontrakt}
  visKontrakten={!!nySak}
  innfelt={vedSiden}
  bred
  sakstittel={nySak ? null : (kjernesak.saksbilde?.tittel ?? null)}
>
  {#snippet topplinje()}
    {#if partensLenke && !nySak}
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- kalleren gir lenken løst -->
      <a class="topplenke" href={partensLenke}>{SAKEN.nyttKrav}</a>
    {/if}
    {#if kjernesak.sak?.catenda_lenke && !nySak}
      <!-- Saken i Catenda, uten kommentarene fra Catenda til #1627 er avgjort (U-15 i BF-44). -->
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- lenken går ut av appen -->
      <a class="topplenke" href={kjernesak.sak.catenda_lenke} target="_blank" rel="noopener"
        >{SAKEN.iCatenda}<span class="visually-hidden">{FORHOLDET.nyFane}</span></a
      >
    {/if}
  {/snippet}
  {#snippet sporrad()}
    {#if !nySak && u && kjernesak.saksbilde}
      <nav class="sporrad" aria-label={SAKEN.sporene}>
        {#each SPORGRUPPENE.flatMap((g) => g.spor) as s (s)}
          <button
            type="button"
            aria-current={valgt === s ? 'page' : undefined}
            onclick={() => velgSpor(s)}
            >{s === 'forhold' ? forholdsnavn : SPORNAVN[s]}{#if harUtkast(s) && valgt !== s}<span
                class="merke-utkast">{SAKEN.utkast}</span
              >{/if}</button
          >
        {/each}
      </nav>
    {/if}
  {/snippet}
  {#snippet panel()}
    {#if !nySak && u && kjernesak.saksbilde}
      <header class="omslag">
        {#if sakskode}<p class="kode">{sakskode}</p>{/if}
        <h1>{kjernesak.saksbilde.tittel ?? SAKSLISTE.utenTittel}</h1>
        {#if parter.length}
          <dl class="parter">
            {#each parter as [etikett, navn] (etikett)}
              <div>
                <dt>{etikett}</dt>
                <dd>{navn}</dd>
              </div>
            {/each}
          </dl>
        {/if}
        {#if u.ikkeVurderteBrev.length}<p class="merknad">{SAKEN.dokumentasjonIkkeSendt}</p>{/if}
      </header>

      <!-- Forholdet og kravene som bygger på det, i hver sin gruppe (oppdragsgiver 06.11, #1631). -->
      <nav class="sporene tett" aria-label={SAKEN.sporene} bind:this={sporene}>
        {#each SPORGRUPPENE as gruppe (gruppe.id)}
          <div class="gruppe">
            <p class="etikett" id={`spor-${gruppe.id}`}>{gruppe.etikett}</p>
            <ul class="valgene" aria-labelledby={`spor-${gruppe.id}`}>
              {#each gruppe.spor as s (s)}
                {@const l = sporlinjer[s]}
                <li>
                  <button
                    type="button"
                    class="valg"
                    aria-current={valgt === s ? 'page' : undefined}
                    onclick={() => velgSpor(s)}
                  >
                    <span class="navn">
                      {s === 'forhold' ? forholdsnavn : SPORNAVN[s]}
                      {#if harUtkast(s) && valgt !== s}<span class="merke-utkast"
                          >{SAKEN.utkast}</span
                        >{/if}
                    </span>
                    {#if l.betegnelse}<span class="st">{l.betegnelse}</span>{/if}
                    {#if l.siste}<span class="st2">{l.siste}</span>{/if}
                  </button>
                </li>
              {/each}
            </ul>
          </div>
        {/each}
      </nav>
    {/if}
  {/snippet}

  {#if nySak}
    <main class="arbeid">
      <!-- Kvitteringen etter «Avbryt» står over skjemaet, som etter sendingen. -->
      {#if melding}<div class="melding" role="status">
          <Melding art="kvittering" levende={false}>{melding.tekst}</Melding>
        </div>{/if}
      {@render nySak()}
    </main>
  {:else if kjernesak.lasteutfall && (!u || !kjernesak.saksbilde)}
    {@const utilgjengelig = kjernesak.lasteutfall === 'utilgjengelig'}
    {@const ugyldig = kjernesak.lasteutfall === 'ugyldig'}
    <main class="arbeid">
      <div class="lastefeil" role="alert">
        <h1>{utilgjengelig ? SAKEN.finnesIkke : SAKEN.lastefeil}</h1>
        <p>
          {utilgjengelig
            ? SAKEN.finnesIkkeForklaring
            : ugyldig
              ? SAKEN.lastefeilUgyldig(!!saksliste)
              : kjernesak.lasteutfall === 'nettverk'
                ? SAKEN.lastefeilNett
                : SAKEN.lastefeilBeklager}
        </p>
        <!-- Et brev som er sendt før lastingen feilet, står som sendt (review av #2202). -->
        {#if kjernesak.utdatert && kjernesak.feil}<p role="status">{kjernesak.feil}</p>{/if}
        <div class="lastehandlinger">
          {#if !utilgjengelig && !ugyldig}
            <Knapp opptatt={proever} onclick={proevIgjen}
              >{proever ? SAKEN.proever : SAKEN.proevIgjen}</Knapp
            >
          {/if}
          {#if saksliste}<Knapp variant="lenke" iFlukt href={saksliste}>{SAKEN.tilSakslisten}</Knapp
            >{/if}
        </div>
        {#if sistForsoekt && !proever && !utilgjengelig && !ugyldig}
          <p class="sist-forsoekt">{SAKEN.sistForsoekt(sistForsoekt)}</p>
        {/if}
      </div>
    </main>
  {:else if !u || !kjernesak.saksbilde}
    <p class="laster" role="status">{SAKEN.laster}</p>
  {:else}
    <main class="arbeid" bind:this={arbeidsflate}>
      <div
        class="melding"
        class:tom={!melding || !!kvittertBrev}
        role={kvittertBrev ? undefined : 'status'}
        tabindex="-1"
        bind:this={meldingen}
      >
        {#if melding && !kvittertBrev}<Melding
            art={melding.art === 'endret' ? 'info' : 'kvittering'}
            levende={false}>{melding.tekst}</Melding
          >{/if}
      </div>
      <!-- MM-U2: en hendelse kjernen ikke forstår, gjør saken ikke forstått (#2079). -->
      {#if !u.forstaatt}<div class="melding">
          <Melding art="info" levende={false}>{SAKEN.ikkeForstaatt}</Melding>
        </div>{/if}
      {#if arbeid.art === 'kontroll' || (aktivtSkjema && arbeid.art !== 'korrespondanse')}
        {@const kontroll = arbeid.art === 'kontroll' ? arbeid : null}
        {@const neste = kontroll?.tilbake ?? { art: 'les' }}
        {@const maal = kontroll ? kontroll.tilbakeTil : SAKSDELEN[valgt]}
        <p class="tilbake">
          <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- samme rute, nytt arbeidstrinn -->
          <a
            href={page.url?.href ?? '#'}
            onclick={(e) => {
              e.preventDefault();
              kjernesak.fjernFeil();
              tilbakeTil(neste);
            }}><ChevronLeft size={16} aria-hidden="true" />{BREVKONTROLL.tilbake(maal)}</a
          >
        </p>
      {/if}
      {#if kvittertBrev && melding}
        <Brevkvittering
          brev={kvittertBrev}
          sak={kjernesak.saksbilde.tittel ?? ''}
          tekst={melding.tekst}
          ontilbake={lukkKvittering}
        />
      {:else if arbeid.art === 'kontroll'}
        {@const k = arbeid}
        {@const s = valgt}
        <Brevkontroll
          {...k}
          {kjernesak}
          visTilbake={false}
          ontilbake={() => tilbakeTil(k.tilbake)}
          onsendt={() => sendt(k, s)}
          onavvist={() => byggPaaNytt(k)}
        />
      {:else if aktivtSkjema}
        {@render aktivtSkjema(u)}
      {:else}
        {#key valgt}
          <Sporlesing
            {kjernesak}
            {u}
            spor={valgt}
            nySak={valgt === 'forhold' && kjernesak.handlinger.includes('krav:forhold')
              ? nySakLenke
              : undefined}
            onspor={velgSpor}
            {sakslenke}
            onkorriger={(gjelder) => {
              melding = null;
              aapneUtkast({ art: 'korrigering', gjelder });
            }}
            onkunnskapsdato={(gjelder) => {
              melding = null;
              aapneUtkast({ art: 'kunnskapsdato', gjelder });
            }}
            skjemaene={skjemanoeklene}
            utkast={harUtkast(valgt) ? utkastkortene : undefined}
            onvelg={(n) => {
              melding = null;
              aapne(n);
            }}
            onpaanytt={(b) => {
              melding = null;
              leggTilPaaNytt(u, b);
            }}
            onakseptbrev={(k) => {
              const svaret = brev.find((b) => b.id === u.spor[valgt].gjeldendeSvar?.dokument);
              melding = null;
              tilArbeid({
                art: 'kontroll',
                versjon: kjernesak.versjon,
                ...k,
                sendTekst: BREVKONTROLL.sendAksepten,
                tilbakeTil: 'saken',
                svarerPaa: svaret ?? null,
                tilbake: { art: 'les' },
                utkastet: null,
              });
            }}
          />
        {/key}
      {/if}
    </main>
  {/if}
</Vardenskall>

<style>
  h1 {
    font-size: 24px;
    font-weight: 600;
    line-height: 1.25;
    letter-spacing: var(--sperring-24);
    text-wrap: balance;
  }
  /* Saksomslaget: saken og partene øverst (panel B, oppdragsgiver 13.11). */
  .omslag h1 {
    font-size: 20px;
    font-weight: 600;
    line-height: 1.25;
    letter-spacing: var(--sperring-20);
    text-wrap: balance;
  }
  .kode {
    margin-bottom: var(--spacing-1);
    color: var(--sidebar-muted);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
  }
  /* Etiketten står over navnet, så et langt firmanavn får hele bredden (oppdragsgiver 13.11). */
  .parter {
    display: grid;
    gap: var(--spacing-3);
    margin-top: var(--spacing-4);
  }
  .parter div {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .parter dt {
    color: var(--sidebar-muted);
    font-size: 12px;
  }
  .parter dd {
    font-size: 14px;
    font-weight: 500;
    overflow-wrap: anywhere;
  }
  .merknad {
    margin-top: var(--spacing-3);
    color: var(--sidebar-muted);
    font-size: 12px;
  }
  .sporene {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-5);
  }
  .navn {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    font-size: 16px;
    font-weight: 500;
  }
  .valg[aria-current='page'] .navn {
    font-weight: 600;
  }
  .st {
    font-size: 14px;
    font-weight: 400;
  }
  .st2 {
    color: var(--sidebar-muted);
    font-size: 12px;
    font-weight: 400;
  }
  .topplenke {
    color: var(--ink);
    font-weight: 500;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .topplenke:hover {
    text-decoration-thickness: 2px;
  }
  .topplenke:focus-visible,
  .sporrad button:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .sporrad {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-1) var(--spacing-6);
  }
  .sporrad button {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: 9px 0;
    border: 0;
    border-bottom: 2px solid transparent;
    background: none;
    font: inherit;
    color: var(--ink-2);
    cursor: pointer;
  }
  .sporrad button:hover {
    color: var(--ink);
    border-bottom-color: var(--rule-strong-color);
  }
  .sporrad button[aria-current='page'] {
    color: var(--ink);
    font-weight: 600;
    border-bottom-color: var(--ink);
  }
  .merke-utkast {
    padding: 0 var(--spacing-2);
    border-radius: var(--r-merke);
    font-size: 12px;
    font-weight: 500;
    border: 1px dashed var(--draft-border);
    background: var(--surface);
    color: var(--draft);
  }
  .utkastkort {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-3);
    padding: var(--spacing-4) var(--spacing-5);
    border: 1px dashed var(--draft);
    border-radius: var(--r-kort);
    background: var(--draft-bg);
    color: var(--draft);
  }
  .utkastkort h2 {
    color: var(--ink);
    font-size: 16px;
    font-weight: 600;
  }
  .tilbake {
    margin-bottom: var(--spacing-3);
  }
  .tilbake a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    gap: var(--spacing-1);
    color: var(--ink);
    text-underline-offset: 3px;
  }
  .tilbake a:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .arbeid {
    min-width: 0;
    padding: 28px var(--kant) 64px;
  }
  .laster {
    padding: var(--spacing-6) var(--kant) var(--spacing-12);
    color: var(--ink-2);
  }
  .lastefeil {
    max-width: var(--varden-ark);
    padding: var(--spacing-6) var(--spacing-8);
    border: var(--rule);
    border-radius: var(--r-kort);
    background: var(--surface);
  }
  .lastefeil h1 {
    font-size: 20px;
    font-weight: 600;
  }
  .lastefeil p {
    max-width: 56ch;
    margin-top: var(--spacing-2);
    color: var(--ink-2);
  }
  .lastehandlinger {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-4);
    margin-top: var(--spacing-4);
  }
  .lastefeil .sist-forsoekt {
    max-width: none;
    margin-top: var(--spacing-4);
    padding-top: var(--spacing-3);
    border-top: var(--rule);
    color: var(--ink-3);
    font-size: 13px;
  }
  .melding.tom {
    display: none;
  }
  .uten-paaberopelse:focus {
    outline: none;
  }
  .uten-paaberopelse {
    max-width: var(--varden-arbeid);
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-3);
  }
  .melding {
    max-width: var(--varden-arbeid);
    margin: 0 auto var(--spacing-4);
  }
  .melding:focus {
    outline: none;
  }
  /* På smal skjerm står sporene som faner over arbeidet (panel B i prototypen). */
  @media (max-width: 860px) {
    .sporene {
      flex-direction: row;
      gap: 0;
      margin: 0 calc(-1 * var(--spacing-4));
      overflow-x: auto;
    }
    .st2 {
      display: none;
    }
    .sporene .gruppe {
      flex: none;
    }
    .navn {
      font-size: 14px;
    }
    .arbeid,
    .laster {
      padding: var(--spacing-4);
    }
  }
</style>
