/**
 * Lager brevene i denne mappa slik kjernen skriver dem, med saken i minnet fra
 * `kjerne/tester/brevsak.ts` (#2337, steg 1). Hvert tilfelle sender kommandoene gjennom
 * `vurder`, og brevet er den frosne brevteksten i journalen.
 *
 * Kjøres fra roten av repoet: `node docs/vedlegg/brevtekst-2026-11-25/lag-brevene.ts`.
 * Skriptet skriver `brev-NN-*.md` og kartleggingen i README, mellom merkene der.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FRISTKRAV,
  PAABEROPELSE,
  sak,
  svar,
  tilbud,
  type Data,
} from '../../../kjerne/tester/brevsak.ts';
import { regnUtSvar } from '../../../kjerne/frosset/utregning.ts';
import { UgyldigVurdering } from '../../../kjerne/regler/feil.ts';
import { kravposterI } from '../../../kjerne/spor/vederlag/format.ts';
import { KJERNE } from '../../../kjerne/versjon.ts';
import type { Avsnitt, Journalrad } from '../../../kjerne/typer.ts';

type Saken = ReturnType<typeof sak>;

const MAPPA = dirname(fileURLToPath(import.meta.url));

const GRUNNFORHOLD = {
  type: 'krav',
  spor: 'forhold',
  innhold: {
    hovedkategori: 'svikt',
    underkategori: 'grunnforhold',
    klar_over_forholdet: '2026-09-25',
  },
  utdypning: 'Grunnforholdene avviker fra det som er beskrevet i konkurransegrunnlaget.',
};

const vederlagskrav = (kravposter: Data[], rest: Data = {}) => ({
  type: 'krav',
  spor: 'vederlag',
  innhold: { kravposter, ...rest },
  utdypning: 'Totalentreprenørens begrunnelse for kravet.',
});

const fastSum = (betegnelse: string, beskrivelse: string, beloep: number) => ({
  betegnelse,
  beskrivelse,
  oppgjoersform: 'tilbud',
  beloep,
});
const justert = (beskrivelse: string) => ({
  beskrivelse,
  oppgjoersform: 'enhetspriser',
  justert: true,
});
const regning = (beskrivelse: string) => ({ beskrivelse, oppgjoersform: 'regningsarbeid' });

/** Svaret på forholdet, med begrunnelsen i punktet om forholdet (KA-U46). */
const forholdssvar = (s: Saken, vurderinger: Data, begrunnelse = 'Byggherrens begrunnelse for svaret på forholdet.') =>
  svar('forhold', s.krav('forhold'), vurderinger, {}, begrunnelse);

/**
 * Svaret på vederlagskravet, med vurderingene for kravpostene etter betegnelse og utregningen
 * fra regelen, som `svaret` i `kjerne/tester/kravpostene.test.ts`.
 */
function vederlagssvar(s: Saken, kravposter: Record<string, Data>, resten: Data = {}) {
  const u = s.u();
  const k = u.spor.vederlag.gjeldendeKrav!;
  const v = {
    ...resten,
    kravposter: kravposterI(k).map((p) => ({ gjelder: p.id, ...kravposter[p.betegnelse] })),
  };
  let resultat: Data = {};
  try {
    const r = regnUtSvar(
      'vederlag',
      v,
      { krav: k, paaberopelse: u.spor.forhold.gjeldendeKrav },
      KJERNE.regler
    );
    resultat = { resultat: r.resultat, godkjent_beloep: r.godkjent_beloep };
    if ('subsidiaert_godkjent_beloep' in r)
      resultat.subsidiaert_godkjent_beloep = r.subsidiaert_godkjent_beloep;
    if ('poster' in r) resultat.poster = r.poster;
  } catch (e) {
    if (!(e instanceof UgyldigVurdering)) throw e;
  }
  return svar('vederlag', k.id, v, resultat, 'Byggherrens forbehold for hele svaret på vederlagskravet.');
}

const fristsvar = (s: Saken, vurderinger: Data, resultat: Data) =>
  svar('frist', s.krav('frist'), vurderinger, resultat, 'Byggherrens forbehold for hele svaret på fristkravet.');

const brev = (...svarene: Data[]) => ({ type: 'brev', svar: svarene });

interface Tilfelle {
  fil: string;
  tittel: string;
  beskrivelse: string;
  lag: () => Journalrad;
}

const TILFELLENE: Tilfelle[] = [
  {
    fil: 'brev-01-vederlagssvar-2337',
    tittel: 'Svaret på forholdet og vederlagskravet i samme brev, to kravposter med ulike vilkår (#2337)',
    beskrivelse:
      'Tilfellet i #2337. Totalentreprenøren krever justering av vederlaget for P1 og P2, begge etter justerte enhetspriser. Byggherren avslår forholdet i samme brev. For P1 godtar byggherren beregningsregelen, men gjør gjeldende at varselet etter punkt 34.3.3 kom for sent, og godtar justeringen subsidiært. For P2 godtar byggherren ikke beregningsregelen og mener regningsarbeid, sier at varselet kom i tide, og bestrider justeringen.',
    lag: () => {
      const s = sak();
      s.send('TE', PAABEROPELSE);
      s.send('TE', vederlagskrav([justert('Spunt'), justert('Masseutskifting')]));
      return s.send(
        'BH',
        brev(
          forholdssvar(s, { resultat: 'avslaatt', grunnlag_varslet_i_tide: true }),
          vederlagssvar(s, {
            P1: { aksepterer: true, varslet_i_tide: false, godtar_justering: true },
            P2: {
              aksepterer: false,
              oensket_oppgjoersform: 'regningsarbeid',
              varslet_i_tide: true,
              godtar_justering: false,
            },
          })
        )
      );
    },
  },
  {
    fil: 'brev-02-vederlagssvar-forbehold',
    tittel: 'Svaret på vederlagskravet med tre kravposter og særskilt justering, forholdet ubesvart',
    beskrivelse:
      'Byggherren har ikke svart på påberopelsen, så brevet har forbeholdet om forholdet. Kravet har P1 med fast sum, P2 som regningsarbeid og særskilt vederlagsjustering for produktivitet. Byggherren godkjenner deler av P1, godtar regningsarbeid for P2, men sier at varselet etter punkt 34.4 kom for sent, og gjør gjeldende at varselet etter punkt 34.1.3 kom for sent, med en delvis godkjenning subsidiært.',
    lag: () => {
      const s = sak();
      s.send('TE', PAABEROPELSE);
      s.send(
        'TE',
        vederlagskrav(
          [fastSum('P1', 'Ny fundamentering', 125000), regning('Pumping')],
          { saerskilt: { produktivitet: { beloep: 40000 } } }
        )
      );
      return s.send(
        'BH',
        brev(
          vederlagssvar(
            s,
            {
              P1: { aksepterer: true, vurdering: 'delvis', godkjent_beloep: 100000 },
              P2: { aksepterer: true, varslet_i_tide: false },
            },
            {
              produktivitet_varslet_i_tide: false,
              produktivitet_vurdering: 'delvis',
              produktivitet_godkjent_beloep: 20000,
              produktivitet_begrenset_beloep: 10000,
            }
          )
        )
      );
    },
  },
  {
    fil: 'brev-03-vederlagssvar-etter-avslag',
    tittel: 'Svaret på vederlagskravet etter at forholdet er avslått i et tidligere brev',
    beskrivelse:
      'Forholdet er svikt i grunnforholdene, så varslingsplikten etter punkt 34.1.2 gjelder. Byggherren har avslått forholdet i et tidligere brev. I svaret på vederlagskravet gjør byggherren gjeldende at varselet etter punkt 34.1.2 kom for sent, aksepterer ikke tilbudet for P1 og mener regningsarbeid, og godtar beregningsregelen for P2.',
    lag: () => {
      const s = sak();
      s.send('TE', GRUNNFORHOLD);
      s.send('BH', brev(forholdssvar(s, { resultat: 'avslaatt' })));
      s.send('TE', vederlagskrav([fastSum('P1', 'Utskifting av masser', 300000), regning('Pumping')]));
      return s.send(
        'BH',
        brev(
          vederlagssvar(
            s,
            {
              P1: { aksepterer: false, oensket_oppgjoersform: 'regningsarbeid' },
              P2: { aksepterer: true },
            },
            { hovedkrav_varslet_i_tide: false }
          )
        )
      );
    },
  },
  {
    fil: 'brev-04-forholdet-avslaatt',
    tittel: 'Svaret på påberopelsen: varselet etter punkt 32.2 for sent, og forholdet avslått',
    beskrivelse:
      'Byggherren svarer på totalentreprenørens påberopelse av irregulær endring. Byggherren gjør gjeldende at varselet etter punkt 32.2 kom for sent, og avslår subsidiært kravet på endringsordre.',
    lag: () => {
      const s = sak();
      s.send('TE', PAABEROPELSE);
      return s.send(
        'BH',
        brev(forholdssvar(s, { resultat: 'avslaatt', grunnlag_varslet_i_tide: false }))
      );
    },
  },
  {
    fil: 'brev-05-fristsvar-lag',
    tittel: 'Svaret på fristkravet med fire lag, forholdet ubesvart',
    beskrivelse:
      'Byggherren har ikke svart på påberopelsen. I svaret på fristkravet gjør byggherren gjeldende at varselet etter punkt 33.4 kom for sent, at fremdriften ikke er hindret, og at kravet ble spesifisert for sent. Byggherren sier hvor mange dager totalentreprenøren har krav på etter punkt 33.6.1, og godkjenner subsidiært 10 av 20 dager.',
    lag: () => {
      const s = sak();
      s.send('TE', PAABEROPELSE);
      s.send('TE', FRISTKRAV);
      return s.send(
        'BH',
        brev(
          fristsvar(
            s,
            {
              frist_varsel_ok: false,
              spesifisert_krav_ok: false,
              dager_maatte_forstaa: 5,
              vilkar_oppfylt: false,
              dager: 10,
            },
            { resultat: 'avslaatt', godkjent_dager: 0 }
          )
        )
      );
    },
  },
  {
    fil: 'brev-06-samlet-svar',
    tittel: 'Svaret på forholdet, vederlagskravet og fristkravet i samme brev',
    beskrivelse:
      'Byggherren svarer på alle tre kravene i ett brev. Byggherren gjør gjeldende at varselet etter punkt 32.2 kom for sent, og er subsidiært enig i at pålegget er en endring. I vederlaget godkjennes deler av P1. I fristen gjør byggherren gjeldende at varselet etter punkt 33.4 kom for sent og at fremdriften ikke er hindret, og godkjenner 10 dager. Brevet har mange henvisninger mellom punktene.',
    lag: () => {
      const s = sak();
      s.send('TE', PAABEROPELSE);
      s.send('TE', vederlagskrav([fastSum('P1', 'Ny fundamentering', 125000)]));
      s.send('TE', FRISTKRAV);
      return s.send(
        'BH',
        brev(
          forholdssvar(s, { resultat: 'godkjent', grunnlag_varslet_i_tide: false }),
          vederlagssvar(s, { P1: { aksepterer: true, vurdering: 'delvis', godkjent_beloep: 100000 } }),
          fristsvar(
            s,
            { frist_varsel_ok: false, spesifisert_krav_ok: true, vilkar_oppfylt: false, dager: 10 },
            { resultat: 'avslaatt', godkjent_dager: 0 }
          )
        )
      );
    },
  },
  {
    fil: 'brev-07-varselsvar-alene',
    tittel: 'Svaret på et varsel etter punkt 34.3.3 som står alene, forholdet ubesvart (G-9)',
    beskrivelse:
      'Totalentreprenøren har varslet justering av enhetsprisene etter punkt 34.3.3 i et eget brev, uten et vederlagskrav (G-9, #2344). Byggherren har ikke svart på påberopelsen. Byggherren gjør gjeldende at varselet kom for sent, og bestrider subsidiært justeringen.',
    lag: () => {
      const s = sak();
      s.send('TE', PAABEROPELSE);
      s.send('TE', { type: 'send_varsel', spor: 'vederlag', hjemmel: '34.3.3' });
      const varsel = s.u().spor.vederlag.kravpostvarsler.at(-1)!.id;
      return s.send(
        'BH',
        brev(svar('vederlag', varsel, { varslet_i_tide: false, godtar_justering: false }, {}, null))
      );
    },
  },
  {
    fil: 'brev-08-varselsvar-etter-avslag',
    tittel: 'Svaret på et varsel etter punkt 34.3.3 etter at forholdet er avslått',
    beskrivelse:
      'Som brev 7, men byggherren har avslått forholdet i et tidligere brev. Svaret på varselet står da i tre lag: avslaget, innsigelsen mot varselet og justeringen.',
    lag: () => {
      const s = sak();
      s.send('TE', PAABEROPELSE);
      s.send('BH', brev(forholdssvar(s, { resultat: 'avslaatt', grunnlag_varslet_i_tide: true })));
      s.send('TE', { type: 'send_varsel', spor: 'vederlag', hjemmel: '34.3.3' });
      const varsel = s.u().spor.vederlag.kravpostvarsler.at(-1)!.id;
      return s.send(
        'BH',
        brev(svar('vederlag', varsel, { varslet_i_tide: false, godtar_justering: false }, {}, null))
      );
    },
  },
  {
    fil: 'brev-09-vederlagssvar-uten-lag',
    tittel: 'Svaret på vederlagskravet etter at forholdet er godkjent, uten lag',
    beskrivelse:
      'Kontrolltilfellet. Byggherren har godkjent forholdet i et tidligere brev og svarer på et vederlagskrav med én kravpost med fast sum. Byggherren godkjenner deler av beløpet. Brevet har ingen lag og ikke noe forbehold.',
    lag: () => {
      const s = sak();
      s.send('TE', PAABEROPELSE);
      s.send('BH', brev(forholdssvar(s, { resultat: 'godkjent', grunnlag_varslet_i_tide: true })));
      s.send('TE', vederlagskrav([fastSum('P1', 'Ny fundamentering', 125000)]));
      return s.send(
        'BH',
        brev(vederlagssvar(s, { P1: { aksepterer: true, vurdering: 'delvis', godkjent_beloep: 100000 } }))
      );
    },
  },
  {
    fil: 'brev-10-paaberopelse',
    tittel: 'Totalentreprenørens påberopelse av irregulær endring',
    beskrivelse:
      'Totalentreprenørens første brev i saken. Totalentreprenøren påberoper at et pålegg fra byggherren er en irregulær endring, og varsler etter punkt 32.2.',
    lag: () => {
      const s = sak();
      return s.send('TE', PAABEROPELSE);
    },
  },
  {
    fil: 'brev-11-vederlagskrav',
    tittel: 'Totalentreprenørens vederlagskrav med fire kravposter og særskilt justering',
    beskrivelse:
      'Totalentreprenøren krever justering av vederlaget med P1 som fast sum, P2 som regningsarbeid og P3 og P4 etter justerte enhetspriser, og særskilt vederlagsjustering for produktivitet. Kravpostene etter en beregningsregel er også varsel etter punkt 34.3.3 og 34.4.',
    lag: () => {
      const s = sak();
      s.send('TE', PAABEROPELSE);
      return s.send(
        'TE',
        vederlagskrav(
          [
            fastSum('P1', 'Ny fundamentering', 125000),
            regning('Pumping'),
            justert('Spunt'),
            justert('Masseutskifting'),
          ],
          { saerskilt: { produktivitet: { beloep: 40000 } } }
        )
      );
    },
  },
  {
    fil: 'brev-12-fristkrav',
    tittel: 'Totalentreprenørens krav om fristforlengelse',
    beskrivelse:
      'Totalentreprenøren krever 20 dagers forlengelse av sluttfristen. Varselet etter punkt 33.4 ble gitt i et brev sendt utenfor løsningen, som ligger ved.',
    lag: () => {
      const s = sak();
      s.send('TE', PAABEROPELSE);
      return s.send('TE', FRISTKRAV);
    },
  },
];

// ---------- Gjengivelsen ----------

const avsnitteneI = (rad: Journalrad) => (rad.data.brevtekst ?? []) as Avsnitt[];

/** Et avsnitt med tabulatorer, som oversikten over beløpene, blir en tabell i Markdown. */
function somTabell(del: string): string {
  if (!del.includes('\t')) return del;
  const rader = del.split('\n').map((r) => `| ${r.split('\t').join(' | ')} |`);
  const kolonner = del.split('\n')[0]!.split('\t').length;
  return [rader[0], `|${' --- |'.repeat(kolonner)}`, ...rader.slice(1)].join('\n');
}

function somMarkdown(t: Tilfelle, rad: Journalrad): string {
  const d = rad.data;
  const hode = [
    `**${d.brevtittel as string}**`,
    '',
    `Vår ref.: ${(d.merking as string | undefined) ?? '–'}  `,
    `Deres ref.: ${((d.deres_ref as string[] | undefined) ?? []).join(', ') || '–'}  `,
    `Avsender: ${rad.aktor_rolle === 'BH' ? 'byggherren' : 'totalentreprenøren'}`,
  ];
  const kropp = avsnitteneI(rad).flatMap((a) => {
    const [foerste, ...resten] = a.laast.split('\n\n').map(somTabell);
    const linjer =
      a.overskrift && foerste === a.overskrift ? [`### ${foerste}`, ...resten] : [foerste, ...resten];
    return [...linjer, ...(a.utdypning ? [`_${a.utdypning}_`] : [])];
  });
  return [
    `# ${t.tittel}`,
    '',
    t.beskrivelse,
    '',
    'Brevet er laget av [`lag-brevene.ts`](lag-brevene.ts) med kjernens kode og er ikke skrevet for hånd. Overskriftene i brevet er satt som overskrifter, og partenes tekster er plassholdere i kursiv der kjernen setter dem.',
    '',
    '---',
    '',
    ...hode,
    '',
    kropp.join('\n\n'),
    '',
  ].join('\n');
}

const HENVISNING = /ovenfor|nedenfor|fremgår av svaret|(?<!NS 8407 )(?<![\d.])punkt \d+(?![.\d])/;

/** Setningene og linjene i brevet som viser til et annet sted i samme brev. */
function henvisningene(rad: Journalrad): string[] {
  return avsnitteneI(rad).flatMap((a) => {
    const punkt = a.overskrift?.match(/^(\d+)\./)?.[1] ?? 'innledningen';
    return a.laast
      .split('\n\n')
      .flatMap((del) => del.split(/(?<=\.) /))
      .filter((setning) => HENVISNING.test(setning))
      .map((setning) => `${/^\d+$/.test(punkt) ? `punkt ${punkt}` : punkt}: «${setning.replaceAll(' ', ' ')}»`);
  });
}

/** Kartleggingen for README: forbeholdet om forholdet, punktet «Forbehold» og henvisningene. */
function kartlegging(t: Tilfelle, rad: Journalrad): { rad: string; henvisninger: string } {
  const avsnitt = avsnitteneI(rad);
  const punktene = avsnitt.filter((a) => a.overskrift).length;
  const forbehold = avsnitt
    .filter((a) => a.punkt === 'forbehold')
    .map((a) => {
      const navn = a.overskrift!.replace(/ /g, ' ');
      const medForbeholdet = a.laast.includes('ennå ikke svart');
      const sist = a === avsnitt.at(-1);
      const innhold = [
        ...(medForbeholdet ? ['forbeholdet om forholdet'] : []),
        ...(a.utdypning ? ['byggherrens forbehold for hele svaret'] : []),
      ];
      return `${navn}${sist ? ', sist i brevet' : ''}: ${innhold.join(' og ') || 'bare overskriften'}`;
    });
  const h = henvisningene(rad);
  return {
    rad: `| [${t.fil.replace('brev-', '')}](${t.fil}.md) | ${rad.aktor_rolle === 'BH' ? 'byggherren' : 'totalentreprenøren'} | ${punktene} | ${forbehold.join('; ') || 'ingen'} | ${h.length} |`,
    henvisninger: [`**[${t.fil}](${t.fil}.md)**`, '', ...(h.length ? h.map((x) => `- ${x}`) : ['- ingen'])].join('\n'),
  };
}

const kart = TILFELLENE.map((t) => {
  const rad = t.lag();
  writeFileSync(join(MAPPA, `${t.fil}.md`), somMarkdown(t, rad));
  return kartlegging(t, rad);
});

const README = join(MAPPA, 'README.md');
const START = '<!-- kartleggingen: lages av lag-brevene.ts -->';
const SLUTT = '<!-- kartleggingen slutter -->';
const generert = [
  START,
  '',
  '| Brev | Avsender | Punkter | Punktet «Forbehold» | Henvisninger i brevet |',
  '| --- | --- | --- | --- | --- |',
  ...kart.map((k) => k.rad),
  '',
  '### Henvisningene i hvert brev',
  '',
  'Hver setning eller linje som viser til et annet sted i samme brev: «ovenfor», «nedenfor», «fremgår av svaret» eller et nummerert punkt i brevet. Henvisninger til NS 8407 og til andre brev er ikke tatt med.',
  '',
  kart.map((k) => k.henvisninger).join('\n\n'),
  '',
  SLUTT,
].join('\n');
const gammel = readFileSync(README, 'utf8');
const a = gammel.indexOf(START);
const b = gammel.indexOf(SLUTT);
if (a < 0 || b < 0) throw new Error('README mangler merkene for kartleggingen');
writeFileSync(README, gammel.slice(0, a) + generert + gammel.slice(b + SLUTT.length));
