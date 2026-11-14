/**
 * Teksten i forholdssporet: forholdene totalentreprenøren kan påberope, brevteksten for
 * påberopelsen og svaret, brevtittelen etter GR-U31 og leddet i linjen for byggherrens
 * standpunkt. `frosset/brevtekst.ts` slår opp her gjennom `BREVTEKST` og `I_SPORENE`,
 * `frosset/linje.ts` gjennom `LINJE`, og `frosset/brevtittel.ts` leser tittelen (#1783).
 *
 * Forholdene har kjernens kode, navnet og hjemmelen i NS 8407, i gruppene og rekkefølgen fra
 * skissen versjon 3 (BF-05). Gruppen har kontraktens henvisning (OV-U77), og navnet er forholdet
 * selv (OV-U78). Brevteksten og brevtittelen bruker navnet, og Varden leser lista herfra (svaret
 * på Q3 i #1488). Force majeure har ingen kode i kjernen ennå (#367).
 */

import type { Regelsett } from '../../regler/regelsett.ts';
import type { Forholdsresultat, Underkategori } from '../../regler/typer.ts';
import {
  BrevetAvvises,
  KanIkkeUttrykkes,
  liste,
  norskDato,
  stor,
  type Journalen,
  type Sporsbrevtekst,
  type Standpunktstekster,
  type Tekst,
  utenOverskrift,
} from '../../frosset/brevdeler.ts';
import { gjelderVarslingsplikten, standpunktet, virkningen } from '../../frosset/byggeklosser.ts';
import type { Sporslinje } from '../../frosset/linje.ts';
import { sakensKode } from '../../frosset/tekst.ts';
import { DATOEN_GJELDER, innholdIForholdet, type OppgittDato } from './format.ts';
import { blirEndringsordre } from './frysing.ts';
import type { Dokument, Krav } from '../../typer.ts';

export interface Forholdet {
  kode: Underkategori;
  navn: string;
  hjemmel: string;
}

export const FORHOLDSGRUPPER: { navn: string; forhold: Forholdet[] }[] = [
  {
    navn: 'Endringer, jf. punkt 31 og 32',
    forhold: [
      { kode: 'irregulaer_endring', navn: 'Irregulær endring', hjemmel: '32.1' },
      { kode: 'valg_av_loesning', navn: 'Begrensning av valgrett', hjemmel: '14.6' },
      { kode: 'samordning', navn: 'Samordning', hjemmel: '21.4' },
      { kode: 'svar_paa_varsel', navn: 'Endring ved svar på varsel', hjemmel: '24.2.2' },
      { kode: 'endringsordre', navn: 'Endringsordre', hjemmel: '31.3' },
      {
        kode: 'lovendring_gjenstand',
        navn: 'Endringer i lover og vedtak for kontraktsgjenstanden',
        hjemmel: '14.4',
      },
      {
        kode: 'lovendring_prosess',
        navn: 'Endringer i lover og vedtak for prosessen',
        hjemmel: '15.2',
      },
      {
        kode: 'gebyrer_og_avgifter',
        navn: 'Endrede offentlige gebyrer og avgifter',
        hjemmel: '26.3',
      },
    ],
  },
  {
    navn: 'Forsinkelse eller svikt ved byggherrens ytelser etter punkt 22, 23 og 24',
    forhold: [
      {
        kode: 'medvirkning',
        navn: 'Manglende medvirkning eller leveranser fra byggherren',
        hjemmel: '22',
      },
      { kode: 'grunnforhold', navn: 'Uforutsette forhold ved grunnen', hjemmel: '23.1' },
      { kode: 'prosjektering', navn: 'Svikt i byggherrens prosjektering', hjemmel: '24.1' },
      { kode: 'kulturminner', navn: 'Funn av kulturminner', hjemmel: '23.3' },
    ],
  },
  {
    navn: 'Andre forhold byggherren har risikoen for',
    forhold: [
      {
        kode: 'skade_fra_byggherren',
        navn: 'Skade forårsaket av byggherren eller byggherrens kontraktsmedhjelpere',
        hjemmel: '19.1',
      },
      {
        kode: 'nektet_kontraktsmedhjelper',
        navn: 'Nektet valg av kontraktsmedhjelper',
        hjemmel: '10.2',
      },
      { kode: 'brukstakelse', navn: 'Urettmessig brukstakelse', hjemmel: '38.1 annet ledd' },
      {
        kode: 'stans_ved_betalingsmislighold',
        navn: 'Stans ved betalingsmislighold',
        hjemmel: '29.2',
      },
      {
        kode: 'annet_forhold',
        navn: 'Annet forhold byggherren har risikoen for',
        hjemmel: '33.1 c',
      },
    ],
  },
];

const FORHOLDENE = new Map<string, Forholdet>(
  FORHOLDSGRUPPER.flatMap((g) => g.forhold.map((f) => [f.kode, f]))
);

/** Forholdet med kjernens kode, eller `null` for en ukjent kode. */
export const forholdet = (kode: unknown): Forholdet | null =>
  (typeof kode === 'string' && FORHOLDENE.get(kode)) || null;

/** Tittelen på totalentreprenørens brev om forholdet (GR-U31). */
export const paaberopelsenAv = (navn: string) => `Påberopelse av ${navn.toLowerCase()}`;

/** Forholdet brevet påberoper (GR-U31): et krav i forholdssporet i et brev uten svar. */
export function paaberoptForhold(d: Pick<Dokument, 'krav' | 'svar'>) {
  if (d.svar.length) return null;
  return forholdet(innholdIForholdet(d.krav.find((k) => k.spor === 'forhold')).underkategori);
}

/** Bokstaven i § 33.1 for hovedkategoriene svikt og andre forhold. */
const LEDD_I_33_1: Record<string, string> = { svikt: 'b', andre_forhold: 'c' };

/**
 * Påberopelsen av forholdet: LV-U41 og LV-U43 for det første brevet, LV-U56 for en ny versjon,
 * med partene skrevet fullt ut (LV-U35) og henvisningen med «punkt» (LV-U39). Sakstittelen er
 * navnet på forholdet og står én gang. Datoen står som i LV-U57 og LV-U56.
 */
function forholdstekst(k: Krav, { saken, j }: Tekst, regler: Regelsett): string[] {
  const navnet = `«${saken.tittel}» i sak ${sakensKode(saken.sakskode)}`;
  const innhold = innholdIForholdet(k);
  const hoved = innhold.hovedkategori;
  const f = forholdet(innhold.underkategori);
  const nyVersjon = k.erstatter !== null;
  const dato = (felt: OppgittDato) => {
    const oppgitt = innhold.datoer[felt];
    if (oppgitt === null) return [];
    // LV-U56: hver tidligere opplysning med brevet den ble oppgitt i, den opprinnelige først.
    const opplysninger = saken.datoopplysninger.filter((o) => o.felt === felt);
    const tidligere = nyVersjon ? opplysninger.slice(0, -1) : [];
    return [
      stor(`${DATOEN_GJELDER[felt]} ${norskDato(oppgitt)}.`),
      ...(tidligere.length
        ? [
            `Totalentreprenøren oppga tidligere ${liste(tidligere.map((o) => `${norskDato(o.dato)} i ${j.brevet(o.dokument)}`))}.`,
          ]
        : []),
    ];
  };
  if (hoved === 'endring' && f?.kode === 'endringsordre')
    return nyVersjon
      ? [
          `Påberopelsen gjelder endringsordre «${innhold.endringsordre}» fra byggherren (NS 8407 punkt 31.3) for ${navnet}.`,
        ]
      : [
          `Totalentreprenøren gjør gjeldende krav som følge av en endringsordre fra byggherren for ${navnet} (NS 8407 punkt 31.3).`,
          `Totalentreprenøren viser til endringsordren «${innhold.endringsordre}».`,
        ];
  if (hoved === 'endring' && f)
    return nyVersjon
      ? [
          `Påberopelsen gjelder ${f.navn.toLowerCase()} (NS 8407 punkt ${f.hjemmel}) for ${navnet}.`,
          ...dato('paalegg_mottatt'),
        ]
      : [
          `Totalentreprenøren krever endringsordre for ${navnet} som ${f.navn.toLowerCase()} (NS 8407 punkt ${f.hjemmel}).`,
          ...(gjelderVarslingsplikten(k, regler)
            ? [
                'Totalentreprenøren varsler etter NS 8407 punkt 32.2 at totalentreprenøren påberoper seg at pålegget innebærer en endring.',
              ]
            : []),
          // VS-U43: etter setningen om punkt 32.2. Appen vurderer ikke rettidigheten.
          ...dato('paalegg_mottatt'),
        ];
  const ledd = hoved === null ? undefined : LEDD_I_33_1[hoved];
  if (ledd && f) {
    const hjemmel =
      f.hjemmel === `33.1 ${ledd}`
        ? `punkt 33.1 ${ledd} og 34.1.2`
        : `punkt ${f.hjemmel}, jf. punkt 33.1 ${ledd} og 34.1.2`;
    return [
      nyVersjon
        ? `Påberopelsen gjelder ${f.navn.toLowerCase()} (NS 8407 ${hjemmel}) for ${navnet}.`
        : `Totalentreprenøren påberoper ${f.navn.toLowerCase()} (NS 8407 ${hjemmel}) for ${navnet}.`,
      // VS-U43: etter kategorisetningen.
      ...dato('klar_over_forholdet'),
    ];
  }
  // Force majeure kan ikke uttrykkes i formatet ennå (#367).
  throw new KanIkkeUttrykkes(`kategorien ${hoved}/${innhold.underkategori} har ingen brevtekst`);
}

/**
 * GR-U14, GR-U15 og GR-U32: godkjenningen som er en endringsordre, med hjemmelen også når den
 * står i overskriften (LV-U36). Totalentreprenørens beskrivelse av pålegget står som
 * utdypningen under kravet i brevet kravet står i, og siteres; løsningen tolker den ikke
 * (KA-U19). Et registrert krav står som det ble sendt (MM-U50), og godkjenningen viser til
 * pålegget i det (GR-U13). Et krav fra løsningen uten beskrivelse kan ikke si hva endringen går
 * ut på, og svaret avvises.
 */
function endringsordretekst(krav: Krav, j: Journalen): string {
  const kravet = `totalentreprenørens krav i ${j.brevet(krav.dokument)}`;
  const innledning =
    'svaret er en endringsordre etter NS 8407 punkt 32.3 første ledd a, jf. punkt 31.3: byggherren krever at endringen utføres slik pålegget er beskrevet i';
  if (j.erRegistrert(krav.dokument)) return `${innledning} ${kravet}.`;
  const beskrivelse = j.utdypning(krav.id, krav.dokument);
  if (!beskrivelse?.trim())
    throw new BrevetAvvises(
      'PAALEGGET_IKKE_BESKREVET',
      'Godkjenningen er en endringsordre (punkt 32.3 første ledd a), men totalentreprenørens krav beskriver ikke pålegget, så brevet kan ikke si hva endringen går ut på (punkt 31.3, GR-U14). Svaret må sendes utenfor løsningen.'
    );
  return `${innledning} ${kravet}: «${beskrivelse}».`;
}

/** Svikt og andre forhold, der svaret sier om byggherren har risikoen for forholdet (LV-U41). */
export function harRisikoen(paaberopelse: Krav): boolean {
  const { hovedkategori } = innholdIForholdet(paaberopelse);
  return hovedkategori === 'svikt' || hovedkategori === 'andre_forhold';
}

/** Hjemmelen for forholdet i svaret ved svikt og andre forhold (LV-U41). */
function risikohjemmel(krav: Krav): string {
  const f = forholdet(innholdIForholdet(krav).underkategori);
  if (!f) throw new KanIkkeUttrykkes('forholdet i påberopelsen har ingen hjemmel');
  return `NS 8407 punkt ${f.hjemmel}`;
}

/** «påberopelse av <forholdet>» med navnet på forholdet (LV-U41, GR-U31). */
export function paaberopelsenAvForholdet(paaberopelse: Krav): string {
  const f = forholdet(innholdIForholdet(paaberopelse).underkategori);
  if (!f) throw new KanIkkeUttrykkes('forholdet i påberopelsen har ikke noe navn');
  return `påberopelse av ${f.navn.toLowerCase()}`;
}

export const BREVTEKSTEN_I_FORHOLDET = {
  navn: 'grunnlaget',
  svaretGjelder: 'grunnlaget',
  krav: (k, t, regler) => [utenOverskrift(forholdstekst(k, t, regler))],
  ogsaaInnsigelserEtter: [],
  nevnerErstattet: false,
  innledning: (krav, { j }) =>
    `Byggherren svarer på totalentreprenørens ${paaberopelsenAvForholdet(krav)} i ${j.brevet(krav.dokument)}.`,
  punktet: (p) => (p.art === 'forhold' ? 'forhold' : undefined),
  // LV-U34: punktene i byggherrens svar, som i skjemaet (prototypen `forholdssvar.html`).
  temaer: () => [
    { punkt: '32.2', overskrift: 'Varselet etter punkt 32.2' },
    { punkt: 'forhold', overskrift: 'Forholdet' },
  ],
} satisfies Sporsbrevtekst;

/**
 * Teksten for standpunktet til forholdet (`I_SPORENE` i `frosset/brevtekst.ts`), med
 * kontraktens ord i hvert tilfelle (GR-U32, LV-U41). Godkjenningen der punkt 32.2 gjelder, er
 * en endringsordre, eller en enighet om at pålegget innebærer en endring når byggherren
 * påberoper at varselet kom for sent. Uten varslingsplikt er forholdet en endringsordre etter
 * punkt 31.3, eller svikt og andre forhold.
 */
export const STANDPUNKTENE_I_FORHOLDET = {
  forhold: (p, krav, s, j) => {
    const risiko = harRisikoen(krav);
    const varslingsplikt = s.beslutningsgrunnlag.varslingsplikt === true;
    if (p.resultat === 'godkjent') {
      if (blirEndringsordre(s.beslutningsgrunnlag)) return endringsordretekst(krav, j);
      if (varslingsplikt) return 'byggherren er enig i at pålegget innebærer en endring.';
      if (risiko) return `byggherren har risikoen for forholdet (${risikohjemmel(krav)}).`;
      return 'byggherren er enig i at forholdet er en endringsordre (NS 8407 punkt 31.3).';
    }
    if (p.resultat === 'avslaatt') {
      if (varslingsplikt)
        return 'byggherren avslår kravet på endringsordre (NS 8407 punkt 32.3 første ledd b).';
      if (risiko) return `byggherren har ikke risikoen for forholdet (${risikohjemmel(krav)}).`;
      return 'byggherren avslår forholdet.';
    }
    return 'byggherren frafaller pålegget mot å utstede endringsordre for allerede utført arbeid (NS 8407 punkt 32.3 første ledd c).';
  },
} satisfies Standpunktstekster<'forhold'>;

/** Svaret på forholdet med ordene i brevet (#628). */
export const SVARET_PAA_PAABEROPELSEN: Record<Forholdsresultat, string> = {
  godkjent: 'godkjent',
  avslaatt: 'avslått',
  paalegg_frafalt: 'pålegget frafalt (§ 32.3 c)',
};

export const LINJEN_I_FORHOLDET = {
  grunner: () => ({}),
  egetLedd: () => undefined,
  ledd: (svar, v) => {
    const g = standpunktet(svar, 'forhold')!;
    return [{ tekst: SVARET_PAA_PAABEROPELSEN[g.resultat], virkning: virkningen(v, g.id) }];
  },
} satisfies Sporslinje;
