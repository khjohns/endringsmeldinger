import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lagForloep, lagKontrollsak, PROSJEKT, VARSELTEKST, VEDLEGG } from './forloep.ts';
import { BEREGNING, maalVed, MAALEREGLER, portefolje, projiser, sporVed } from './projektor.ts';
import type { Maaling, Rad } from './projektor.ts';
import type { Journalrad } from '../../kjerne/typer.ts';

const mappe = dirname(fileURLToPath(import.meta.url));
const rot = resolve(mappe, '../..');
const ut = join(mappe, 'resultat');
mkdirSync(ut, { recursive: true });
const json = (v: unknown) => JSON.stringify(v, null, 2) + '\n';
const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
function skriv(sti: string, tekst: string) {
  mkdirSync(dirname(sti), { recursive: true });
  writeFileSync(sti, tekst);
}
function csv(rader: object[]) {
  const felt = [...new Set(rader.flatMap((r) => Object.keys(r)))];
  const celle = (v: unknown) =>
    '"' +
    (typeof v === 'object' && v !== null
      ? JSON.stringify(v)
      : v === null
        ? 'null'
        : v === undefined
          ? ''
          : String(v)
    ).replaceAll('"', '""') +
    '"';
  return (
    [
      felt.map(celle).join(','),
      ...rader.map((r) => felt.map((k) => celle((r as Rad)[k])).join(',')),
    ].join('\r\n') + '\r\n'
  );
}
function tabell(overskrifter: string[], rader: unknown[][]) {
  const celle = (v: unknown) =>
    (v === null || v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v))
      .replaceAll('|', '\\|')
      .replaceAll('\n', '<br>');
  return [
    '| ' + overskrifter.join(' | ') + ' |',
    '| ' + overskrifter.map(() => '---').join(' | ') + ' |',
    ...rader.map((r) => '| ' + r.map(celle).join(' | ') + ' |'),
  ].join('\n');
}
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: rot, encoding: 'utf8' }).trim();
const statusFoer = execFileSync('git', ['status', '--short', '--untracked-files=no'], {
  cwd: rot,
  encoding: 'utf8',
}).trim();
assert.equal(statusFoer, '', 'Prøven forutsetter uendret sporet kode');
const versjoner = {
  node: process.version,
  typescript: JSON.parse(readFileSync(join(rot, 'node_modules/typescript/package.json'), 'utf8'))
    .version,
  vitest: JSON.parse(readFileSync(join(rot, 'node_modules/vitest/package.json'), 'utf8')).version,
  ...BEREGNING,
};
const kodefiler = ['forloep.ts', 'projektor.ts', 'kjoer.ts', 'projektor.test.ts'];
const kodehasher = Object.fromEntries(kodefiler.map((f) => [f, sha(readFileSync(join(mappe, f)))]));
const kontroll = lagKontrollsak();
const hovedId = '55400000-0000-4000-9000-000000000001';

function rapport(journaler: Journalrad[][]) {
  const tabeller = journaler.map((j) => projiser(j, PROSJEKT));
  return Object.fromEntries(
    Object.keys(tabeller[0]).map((navn) => [
      navn,
      navn === 'maaleregel'
        ? MAALEREGLER
        : tabeller.flatMap((t) => t[navn as keyof typeof t] as object[]),
    ])
  ) as Record<string, object[]>;
}
function frys(id: string, journaler: Journalrad[][], maaltDato: string) {
  const resultat: Record<string, object[]> = {
    ...rapport(journaler),
    portefolje: portefolje(journaler).grupper,
  };
  const grunnlag = {
    prosjekt_id: PROSJEKT,
    journaler,
    vedleggsdokumenter: journaler.some((j) => j.some((r) => r.data.dokumentasjon))
      ? [{ ...VEDLEGG, innhold_utf8: VARSELTEKST }]
      : [],
  };
  const manifest = {
    rapport_id: id,
    status: 'lokal_frosset_metodeprove',
    commit,
    kildeversjoner: journaler.map((j) => ({
      sak_id: j[0].sak_id,
      til_og_med_versjon: j.at(-1)!.versjon,
      journal_sha256: sha(json(j)),
    })),
    filtre: {
      prosjekt_id: PROSJEKT,
      saker: journaler.map((j) => j[0].sak_id),
      hovedkategori: 'alle i syntetisk utvalg',
      periode: ['2026-09-20', maaltDato.slice(0, 10)],
      utvikling: 'alle faktiske saksversjoner i perioden, også før siste rad',
    },
    maal: MAALEREGLER,
    versjoner,
    proevekode_sha256: kodehasher,
    maalt_dato: maaltDato,
    observasjonsregel:
      'Hvert historisk prefiks observeres ved sin siste syntetiske appregistrering. Måledatoen er utgivelsens syntetiske tidspunkt, ikke bevis for levering eller mottak.',
    sumdefinisjon:
      'Gjeldende stående krav telles én gang per sak; krav, subsidiære BH-tall og betinget/virksom enighet holdes atskilt (MM-U28). Fristdager summeres ikke. Ingen summering av ukjent som et kjent beløp.',
    nullpolitikk:
      'Prøveforslag: JSON null og CSV-teksten null betyr mangler/ikke relevant og må leses med art/tilstand. Numerisk 0 er et kjent tall. Dette er ingen vedtatt lagringskontrakt.',
    begrensninger: [
      'Syntetiske fakta og styrte UTC-klokker',
      'Partsoppgitte datoer er ikke verifisert',
      'Identiteter og vedlegg håndteres i minnet',
      'Ingen bevis for Azure SQL, RLS, fysisk applikasjonslagring, levering eller Fabric',
      'Samme kjerne i utledning og avstemming er ikke uavhengig juridisk bevis',
      'Gjeldende regelsett er uendret gjennom prøven; MM-U16-regelbytte er ikke prøvd',
    ],
    grunnlag_sha256: sha(json(grunnlag)),
    resultat_sha256: sha(json(resultat)),
  };
  const sti = join(ut, id);
  skriv(join(sti, 'grunnlag.json'), json(grunnlag));
  skriv(join(sti, 'rapport.json'), json(resultat));
  skriv(join(sti, 'manifest.json'), json(manifest));
  for (const [navn, rader] of Object.entries(resultat)) skriv(join(sti, `${navn}.csv`), csv(rader));
  return { resultat, manifest };
}
function mappeHash(sti: string) {
  return sha(
    readdirSync(sti)
      .sort()
      .map((f) => f + ':' + sha(readFileSync(join(sti, f))))
      .join('\n')
  );
}
let r1!: ReturnType<typeof frys>;
let r1Hash!: string;
const { sak, r1: prefiks } = lagForloep(false, 1, (journal) => {
  r1 = frys('R1', [journal, kontroll.journal], '2026-09-26T12:00:00.000Z');
  r1Hash = mappeHash(join(ut, 'R1'));
});
const r2 = frys('R2', [sak.journal, kontroll.journal], '2026-10-02T12:00:00.000Z');
assert.equal(mappeHash(join(ut, 'R1')), r1Hash, 'R1-bytes skal stå etter F–I');
assert.deepEqual(
  JSON.parse(readFileSync(join(ut, 'R1/rapport.json'), 'utf8')),
  JSON.parse(
    json({
      ...rapport([prefiks, kontroll.journal]),
      portefolje: portefolje([prefiks, kontroll.journal]).grupper,
    })
  )
);
const aktuell = {
  ...rapport([sak.journal, kontroll.journal]),
  portefolje: portefolje([sak.journal, kontroll.journal]).grupper,
};
assert.equal(sha(json(aktuell)), r2.manifest.resultat_sha256);
skriv(join(ut, 'aktuell-rekonstruksjon.json'), json(aktuell));

const alternativ = lagForloep(true, 3);
skriv(
  join(ut, 'alternativ.json'),
  json({
    premiss:
      'Ved D sier BH uttrykkelig varsel_i_tide=true om det første fristkravet appen kjenner; øvrige valg er like. Dette er et annet syntetisk partsstandpunkt, ingen konklusjon om faktisk rettidighet.',
    steg: alternativ.sak.steg,
    journal: alternativ.sak.journal,
    sporhistorikk: projiser(alternativ.sak.journal, PROSJEKT).sporhistorikk,
  })
);
const steg = [...sak.steg, ...kontroll.steg];
skriv(join(ut, 'trinn.json'), json(steg));
skriv(join(ut, 'trinn.csv'), csv(steg));
skriv(join(ut, VEDLEGG.filnavn), VARSELTEKST);
const historikk = sak.journal.map((_, i) => {
  const j = sak.journal.slice(0, i + 1);
  const kontrollprefiks = kontroll.journal.filter((r) => r.tidsstempel <= j.at(-1)!.tidsstempel);
  return {
    saksversjon: i + 1,
    tidspunkt: j.at(-1)!.tidsstempel,
    kildeversjoner: [i + 1, kontrollprefiks.length],
    ...portefolje([j, kontrollprefiks]),
  };
});
skriv(join(ut, 'portefoljehistorikk.json'), json(historikk));
skriv(join(ut, 'portefoljehistorikk.csv'), csv(historikk));
const alleMaal = r2.resultat.maalt_forloep as Maaling[];
const varsel = (v: number) =>
  maalVed(
    alleMaal.filter((r) => r.sak_id === hovedId),
    v
  ).find((r) => r.maal === 'kjennskap_til_relevant_fristvarsel')!;
const enkel = {
  forloep_id: varsel(7).forloep_id,
  startversjon: 4,
  sluttversjon: 7,
  start: varsel(7).start,
  slutt: varsel(7).slutt,
  dager: varsel(7).dager,
};
skriv(
  join(ut, 'enkel-modell-moteksempel.json'),
  json({
    enkel_rad: enkel,
    ved_E_med_bare_startfilter: enkel.startversjon <= 6 ? enkel : null,
    ved_E_med_begge_grenser: enkel.startversjon <= 6 && enkel.sluttversjon <= 6 ? enkel : null,
    historisk_rad_ved_E: varsel(6),
    historisk_rad_etter_F: varsel(7),
    konklusjon:
      'Bare startfilter lekker 3 dager og datoen fra F inn ved E. Begge grenser utelater raden helt; heller ikke da kan de tidligere 7 dagene gjenskapes fra denne ene raden.',
  })
);
const kontrollresultat = {
  commit,
  versjoner,
  sporet_diff_ved_start: statusFoer,
  alle_trinn_godtatt: steg.every((s) => s.godtatt),
  avviste_domenetrinn: steg.filter((s) => !s.godtatt),
  r1_uendret_etter_F_til_I: true,
  r1_mappe_sha256_ved_E_og_I: r1Hash,
  r1_gjenopprettet_fra_prefiks_lik: true,
  r2_lik_aktuell_rekonstruksjon: true,
  r1_resultat_sha256: r1.manifest.resultat_sha256,
  r2_resultat_sha256: r2.manifest.resultat_sha256,
  krav_sum_ved_C: historikk[4].krav_sum,
  krav_sum_ved_H: historikk[9].krav_sum,
};
skriv(join(ut, 'kontroller.json'), json(kontrollresultat));
skriv(join(ut, 'utgitt_rapport.json'), json([r1.manifest, r2.manifest]));
skriv(join(ut, 'utgitt_rapport.csv'), csv([r1.manifest, r2.manifest]));

const sporhistorikk = r2.resultat.sporhistorikk as ReturnType<typeof sporVed>;
const kort = (v: unknown) =>
  v === null || v === undefined
    ? '—'
    : String(v).replace('55400000-0000-4000-8000-', 'e').replace('55400000-0000-4000-9000-', 's');
const kravtekst = (r: ReturnType<typeof sporVed>[number]) => {
  if (!r.te_krav) return null;
  return r.spor === 'grunnlag'
    ? `${r.hovedkategori}/${r.underkategori}`
    : r.spor === 'vederlag'
      ? `${r.te_krav.beloep} kr (tilbud)`
      : `${r.te_krav.dager} dager`;
};
const bhtekst = (r: ReturnType<typeof sporVed>[number]) =>
  r.bh_standpunkt
    .map((p) => {
      if (p.art === 'grunnlag') return p.resultat;
      if (p.art === 'rettidighet')
        return `§ ${p.hjemmel}: ${p.iTide ? 'ikke påberopt for sent' : 'påberopt for sent'} (${kort(p.gjelder)})`;
      if (p.art === 'spesifisering')
        return `§ 33.6.1: ${p.iTide ? 'ikke påberopt for sent' : 'for sent'}`;
      if (p.art === 'hindring') return `hindring: ${p.oppfylt ? 'ja' : 'nei'}`;
      if (p.art === 'metode') return `metode akseptert: ${p.aksepterer ? 'ja' : 'nei'}`;
      return p.art === 'beloep' ? `${p.godkjent} kr` : `${p.vurdert} dager`;
    })
    .join('; ') || null;
const enighetstekst = (r: ReturnType<typeof sporVed>[number]) =>
  !r.enighet
    ? null
    : `${r.spor === 'grunnlag' ? 'grunnlaget' : r.spor === 'vederlag' ? String(r.enighet.utfall.beloep) + ' kr' : String(r.enighet.utfall.dager) + ' dager'} / ${r.enighet_virkning}`;
const historikktabell = (sakId: string) =>
  tabell(
    [
      'Versjon',
      'Spor',
      'TE-krav',
      'BH-standpunkt',
      'BH-tall subsidiært',
      'Enighet / virkning',
      'Venter BH / svar ikke godtatt',
      'Grunnlag avklart',
      'Kilde-ID-er',
    ],
    sporhistorikk
      .filter((r) => r.sak_id === sakId)
      .map((r) => [
        r.saksversjon,
        r.spor,
        kravtekst(r),
        bhtekst(r),
        r.tall_subsidiaert,
        enighetstekst(r),
        `${r.venter_paa_svar} / ${r.svar_ikke_godtatt}`,
        r.grunnlag_avklart,
        r.kilde_ider.map(kort).join(', ') || kort(r.observasjon_event_id),
      ])
  );
const sammenlikning = (navn: string, res: ReturnType<typeof frys>['resultat'], versjon: number) => {
  const rader = (res.sporhistorikk as ReturnType<typeof sporVed>).filter(
    (r) => r.sak_id === hovedId && r.saksversjon === versjon
  );
  return rader.map((r) => [
    navn,
    r.spor,
    r.te_krav,
    r.bh_tall,
    r.tall_subsidiaert,
    r.enighet?.utfall ?? null,
    r.enighet_virkning,
    r.annet_varsel.map(kort),
    r.kilde_ider.map(kort).join(', '),
  ]);
};
let lesbart =
  '# Genererte tabeller fra metodeprøven\n\nFullstendige ID-er og felter finnes i JSON/CSV. Her forkortes bare ID-prefikset: `e` = `55400000-0000-4000-8000-`, `s` = `55400000-0000-4000-9000-`. Null vises som —; 0 beholdes som tall. Beløp er kroner, fristkrav er dager.\n\n';
lesbart +=
  '## Trinn og faktiske saksversjoner\n\n' +
  tabell(
    ['Trinn', 'Versjon', 'Event-ID', 'Godtatt', 'UTC'],
    steg.map((s) => [s.trinn, s.saksversjon, kort(s.event_id), s.godtatt, s.tidspunkt])
  ) +
  '\n\nE/R1 er hovedsak versjon 6 og kontrollsak versjon 3. I/R2 er hovedsak versjon 10 og samme kontrollsak versjon 3. E og I er lokale rapporthandlinger og flytter ingen saksversjon.\n\n';
lesbart +=
  '## Hovedsak etter hver faktisk versjon\n\n' +
  historikktabell(hovedId) +
  '\n\n## Kontrollsak etter hver faktisk versjon\n\n' +
  historikktabell(kontroll.sakId) +
  '\n\n';
lesbart +=
  '## R1, R2 og aktuell rekonstruksjon\n\n' +
  tabell(
    [
      'Rapport',
      'Spor',
      'TE-krav',
      'BH-tall',
      'Subsidiært',
      'Enighet',
      'Virkning',
      'Annet varsel',
      'Kilder',
    ],
    [
      ...sammenlikning('R1', r1.resultat, 6),
      ...sammenlikning('R2', r2.resultat, 10),
      ...sammenlikning('Aktuell', aktuell, 10),
    ]
  ) +
  '\n\n';
lesbart +=
  '## Varslingsmålet før og etter F\n\n' +
  tabell(
    ['Kjent ved versjon', 'Forløp', 'Dager', 'Startkilde', 'Sluttkilde', 'Slutt først kjent'],
    [varsel(6), varsel(7)].map((r, i) => [
      i ? 7 : 6,
      r.forloep_id,
      r.dager,
      r.start,
      r.slutt,
      r.slutt?.kjent_fra_versjon,
    ])
  ) +
  '\n\n';
lesbart +=
  '## Tidsmål ved R2, hovedsaken\n\n' +
  tabell(
    ['Spor', 'Mål', 'Tilstand', 'Dager', 'Observerte dager', 'Start', 'Slutt', 'Kilder'],
    maalVed(
      alleMaal.filter((r) => r.sak_id === hovedId),
      10
    ).map((r) => [
      r.spor,
      r.maal,
      r.tilstand,
      r.dager,
      r.observerte_dager,
      r.start.verdi,
      r.slutt?.verdi,
      r.kilde_ider.map(kort).join(', '),
    ])
  ) +
  '\n\n';
lesbart +=
  '## Portefølje over tid\n\n' +
  tabell(
    [
      'Hovedsak versjon',
      'Kildeversjoner hoved/kontroll',
      'Stående kravsum',
      'Antall',
      'Ansvarsgrunnlag / sum',
    ],
    historikk.map((r) => [
      r.saksversjon,
      r.kildeversjoner.join('/'),
      r.krav_sum,
      r.krav_antall,
      r.grupper.map((g) => `${g.hovedkategori}/${g.underkategori}: ${g.krav_sum}`).join('; '),
    ])
  ) +
  '\n\n';
lesbart +=
  '## Typede kilder og brevtekst ved D–H\n\n' +
  tabell(
    ['Element', 'Type', 'Versjon', 'Brev'],
    (r2.resultat.element as Rad[])
      .filter((r) => r.sak_id === hovedId && Number(r.kjent_fra_versjon) >= 6)
      .map((r) => [kort(r.element_id), r.art, r.kjent_fra_versjon, kort(r.event_id)])
  ) +
  '\n\n' +
  tabell(
    ['Versjon', 'Gjelder', 'Låst tekst'],
    (r2.resultat.brevavsnitt as Rad[])
      .filter((r) => r.sak_id === hovedId && Number(r.kjent_fra_versjon) >= 6)
      .map((r) => [r.kjent_fra_versjon, kort(r.gjelder), r.laast])
  ) +
  '\n\n';
lesbart +=
  '## Frosne rapporter\n\n' +
  tabell(
    ['Rapport', 'Kildeversjoner', 'Måledato', 'Resultat SHA-256'],
    [r1.manifest, r2.manifest].map((m) => [
      m.rapport_id,
      m.kildeversjoner.map((k) => `${kort(k.sak_id)}: ${k.til_og_med_versjon}`).join('; '),
      m.maalt_dato,
      m.resultat_sha256,
    ])
  ) +
  '\n';
skriv(join(ut, 'tabeller.md'), lesbart);
console.log(json(kontrollresultat));
