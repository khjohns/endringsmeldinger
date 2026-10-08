import { deepStrictEqual, notDeepStrictEqual, ok, strictEqual } from 'node:assert';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { kvalifiserForesporsel, vurder, vurderBhInnsigelse } from './grunnmodell.ts';
import { leggTil, utled } from './forlopsmodell.ts';
const fil = (navn) => new URL(navn, import.meta.url);
const les = (navn) => JSON.parse(readFileSync(fil(navn), 'utf8'));
const tri = z.boolean().nullable();
const kilder = z.array(z.string()).min(1);
const basis = {
  id: z.string(),
  navn: z.string(),
  kilder,
  forventningsgrunnlag: z.enum(['arbeidshypotese', 'modellkonvensjon', 'avklart_tolkning']),
  tolkningssporsmal: z.array(z.string()),
  avklarte_tolkninger: z.array(z.string()),
};
const korpusskjema = z
  .object({
    formatversjon: z.literal(1),
    status: z.string(),
    grunnpremisser: z.array(z.string()).min(1),
    historisk_sammenlikning: z
      .object({
        status: z.string(),
        antall_premisser: z.number(),
        sha256_premisser: z.string(),
        antall_foresporsler: z.number(),
        sha256_foresporsler: z.string(),
      })
      .strict(),
    enkeltsaker: z
      .array(
        z.discriminatedUnion('metode', [
          z
            .object({
              ...basis,
              metode: z.literal('grunnmodell'),
              premisser: z
                .object({
                  foresporsel: z.enum(['ingen', 'gyldig', 'ugyldig', 'uavklart']),
                  te_svar: z.enum(['ingen', 'spesifisert', 'begrunnelse']),
                  te_rettidig: tri,
                  bh_innsigelse_mot_sen_te: tri,
                  svarfrist_oversittet: tri,
                })
                .strict(),
              forventet: z
                .object({
                  svarplikt_33_7: z.boolean(),
                  avskjaering_33_6_1: tri,
                  begrensning_33_6_1: tri,
                  kravstap_33_6_2: tri,
                  videre_33_6_1: z.boolean(),
                  uavklart: z.array(z.string()),
                })
                .strict(),
            })
            .strict(),
          z
            .object({
              ...basis,
              metode: z.literal('bh_innsigelse'),
              premisser: z
                .object({
                  spesifisert_krav_mottatt: z.boolean(),
                  grunn: z.enum(['sen_spesifisering', 'omfang']),
                  innsigelse_mottatt: z.boolean(),
                  innsigelse_rettidig: tri,
                  te_innsigelse_mot_sen_bh: tri,
                  svarfrist_oversittet: tri,
                })
                .strict(),
              forventet: z.string(),
            })
            .strict(),
        ])
      )
      .min(1),
    handlinger: z.record(z.unknown()),
    forlop: z
      .array(
        z
          .object({
            ...basis,
            steg: z.array(z.string()).min(1),
            kontroller: z
              .array(
                z
                  .object({
                    etter: z.number().int().positive(),
                    forventet: z.record(z.unknown()).refine((v) => Object.keys(v).length > 0),
                  })
                  .strict()
              )
              .min(1),
          })
          .strict()
      )
      .min(1),
    avvisninger: z
      .array(
        z
          .object({
            ...basis,
            start: z.array(z.string()),
            handling: z.string(),
            forventet_feil: z.string(),
          })
          .strict()
      )
      .min(1),
    feilinnforinger: z
      .array(
        z
          .object({
            id: z.string(),
            sak: z.string(),
            etter: z.number().int().positive(),
            endring: z.enum([
              'glem_svar_b',
              'fjern_te_innsigelse',
              'bh_vurdering_vinner',
              'gjeninnfor_rekursiv_punkt_5',
              'protest_til_forste_innsigelse',
              'felles_rettidighet_i_brev',
              'ny_dokumentasjon_vinner',
              'omskriv_utsendt',
            ]),
            mal: z.string(),
            forventet: z.unknown(),
            kilder,
          })
          .strict()
      )
      .min(1),
  })
  .strict();
const korpus = korpusskjema.parse(les('bevis-saker.json'));
const regler = z
  .object({
    regler: z.array(z.object({ id: z.string() })).min(1),
    uavklarte_sporsmal: z.array(z.object({ id: z.string() })),
    avklarte_tolkninger: z.array(z.object({ id: z.string(), vedtak: z.string(), kilder })),
  })
  .parse(les('regler.json'));
const regelIder = new Set(regler.regler.map((r) => r.id));
strictEqual(regelIder.size, regler.regler.length, 'duplikat regel-ID');
const alleSaker = [
  ...korpus.enkeltsaker,
  ...korpus.forlop,
  ...korpus.avvisninger,
  ...korpus.feilinnforinger,
];
strictEqual(new Set(alleSaker.map((s) => s.id)).size, alleSaker.length, 'duplikat saks-ID');
for (const sak of alleSaker)
  for (const kilde of sak.kilder) ok(regelIder.has(kilde), `${sak.id}: ukjent kilde ${kilde}`);
for (const sak of alleSaker)
  for (const sporsmal of sak.tolkningssporsmal ?? [])
    ok(
      regler.uavklarte_sporsmal.some((s) => s.id === sporsmal),
      `${sak.id}: ukjent tolkningsspørsmål ${sporsmal}`
    );
for (const regel of regelIder)
  ok(
    alleSaker.some((s) => s.kilder.includes(regel)),
    `regel uten bevis-sak: ${regel}`
  );
for (const sak of [...korpus.enkeltsaker, ...korpus.forlop, ...korpus.avvisninger]) {
  for (const id of sak.avklarte_tolkninger) {
    const tolkning = regler.avklarte_tolkninger.find((t) => t.id === id);
    ok(tolkning, `${sak.id}: ukjent avklart tolkning ${id}`);
    ok(
      tolkning.kilder.every((k) => sak.kilder.includes(k)),
      `${sak.id}: mangler tolkningskilde`
    );
    ok(!sak.tolkningssporsmal.includes(id), `${sak.id}: samme tolkning er både åpen og avklart`);
  }
  if (sak.forventningsgrunnlag === 'avklart_tolkning') {
    ok(
      sak.avklarte_tolkninger.length > 0 && sak.tolkningssporsmal.length === 0,
      `${sak.id}: avklart forventning uten avklaring eller med åpent spørsmål`
    );
  }
}
function sorter(v) {
  if (Array.isArray(v)) return v.map(sorter);
  if (v !== null && typeof v === 'object')
    return Object.fromEntries(
      Object.entries(v)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, verdi]) => [k, sorter(verdi)])
    );
  return v;
}
function hash(v) {
  return createHash('sha256')
    .update(JSON.stringify(sorter(v)))
    .digest('hex');
}
function felt(v, sti) {
  return sti.split('.').reduce((obj, navn) => {
    ok(
      obj !== null && typeof obj === 'object' && Object.hasOwn(obj, navn),
      `ukjent målfelt ${sti}`
    );
    return obj[navn];
  }, v);
}
function sammenlikn(faktisk, forventet, sti) {
  if (forventet !== null && typeof forventet === 'object' && !Array.isArray(forventet)) {
    for (const [navn, verdi] of Object.entries(forventet)) {
      sammenlikn(felt(faktisk, navn), verdi, `${sti}.${navn}`);
    }
  } else deepStrictEqual(faktisk, forventet, sti);
}
function handling(navn) {
  ok(Object.hasOwn(korpus.handlinger, navn), `ukjent handling ${navn}`);
  return korpus.handlinger[navn];
}
function bygg(steg) {
  return steg.reduce((h, navn) => leggTil(h, handling(navn)), []);
}
function bevisgrunnlag(sak) {
  return {
    kilder: sak.kilder,
    forventningsgrunnlag: sak.forventningsgrunnlag,
    tolkningssporsmal: sak.tolkningssporsmal,
    avklarte_tolkninger: sak.avklarte_tolkninger,
    tolkningsstatus:
      sak.forventningsgrunnlag === 'modellkonvensjon'
        ? 'ingen_juridisk_konklusjon'
        : sak.forventningsgrunnlag === 'avklart_tolkning'
          ? 'avklart_for_proven'
          : sak.avklarte_tolkninger.length
            ? 'delvis_avklart'
            : sak.tolkningssporsmal.length
              ? 'uttrykkelig_uavklart'
              : 'ikke_sarskilt_avklart',
  };
}
const enkeltsaker = [];
for (const sak of korpus.enkeltsaker) {
  const faktisk =
    sak.metode === 'grunnmodell' ? vurder(sak.premisser) : vurderBhInnsigelse(sak.premisser);
  deepStrictEqual(faktisk, sak.forventet, sak.id);
  enkeltsaker.push({ id: sak.id, ...bevisgrunnlag(sak), forventet: sak.forventet, faktisk });
}
const triVerdier = [true, false, null];
const premisser = [];
for (const foresporsel of ['ingen', 'gyldig', 'ugyldig', 'uavklart'])
  for (const te_svar of ['ingen', 'spesifisert', 'begrunnelse'])
    for (const te_rettidig of triVerdier)
      for (const bh_innsigelse_mot_sen_te of triVerdier)
        for (const svarfrist_oversittet of triVerdier) {
          if (foresporsel === 'ingen' && te_svar === 'begrunnelse') continue;
          const p = {
            foresporsel,
            te_svar,
            te_rettidig,
            bh_innsigelse_mot_sen_te,
            svarfrist_oversittet,
          };
          const v = vurder(p);
          ok(!(v.avskjaering_33_6_1 === true && v.begrensning_33_6_1 === true));
          ok(!v.svarplikt_33_7 || te_svar === 'spesifisert');
          ok(v.kravstap_33_6_2 !== true || foresporsel === 'gyldig');
          if (te_svar === 'ingen')
            deepStrictEqual(v, vurder({ ...p, te_rettidig: null, bh_innsigelse_mot_sen_te: null }));
          premisser.push({ premisser: p, virkninger: v });
        }
const foresporsler = [];
for (const a of triVerdier)
  for (const b of triVerdier)
    for (const c of triVerdier)
      for (const d of triVerdier) {
        const kvalifikasjon = kvalifiserForesporsel([a, b, c, d]);
        strictEqual(
          kvalifikasjon === 'gyldig',
          [a, b, c, d].every((v) => v === true)
        );
        foresporsler.push({
          vilkar: {
            ingen_spesifisering_ved_foresporsel: a,
            brevkrav_oppfylt: b,
            kravstap_opplyst: c,
            alternativ_begrunnelse_etterspurt: d,
          },
          kvalifikasjon,
        });
      }
strictEqual(premisser.length, korpus.historisk_sammenlikning.antall_premisser);
strictEqual(foresporsler.length, korpus.historisk_sammenlikning.antall_foresporsler);
strictEqual(
  hash(premisser),
  korpus.historisk_sammenlikning.sha256_premisser,
  'historisk karakterisering av premisser'
);
strictEqual(
  hash(foresporsler),
  korpus.historisk_sammenlikning.sha256_foresporsler,
  'historisk karakterisering av forespørsler'
);
const forlop = [];
let antallPrefikser = 0;
for (const sak of korpus.forlop) {
  ok(
    sak.kontroller.some((k) => k.etter === sak.steg.length),
    `${sak.id}: sluttforventning mangler`
  );
  ok(
    sak.kontroller.every((k) => k.etter <= sak.steg.length),
    `${sak.id}: kontroll utenfor forløpet`
  );
  let historikk = [];
  const kontroller = [];
  for (const [i, navn] of sak.steg.entries()) {
    const forrige = historikk;
    const kopi = JSON.stringify(forrige);
    historikk = leggTil(forrige, handling(navn));
    strictEqual(JSON.stringify(forrige), kopi, `${sak.id}: tidligere journal endret`);
    deepStrictEqual(
      utled(historikk),
      utled(bygg(sak.steg.slice(0, i + 1))),
      `${sak.id}: gjenoppbygging`
    );
    const gjenlest = JSON.parse(JSON.stringify(historikk)).reduce(
      (h, neste) => leggTil(h, neste),
      []
    );
    deepStrictEqual(utled(historikk), utled(gjenlest), `${sak.id}: JSON-rundtur`);
    antallPrefikser++;
    for (const k of sak.kontroller.filter((k) => k.etter === i + 1)) {
      sammenlikn(utled(historikk), k.forventet, sak.id);
      kontroller.push({ etter: k.etter, forventet: k.forventet, faktisk: utled(historikk) });
    }
  }
  forlop.push({
    id: sak.id,
    navn: sak.navn,
    ...bevisgrunnlag(sak),
    kontroller,
  });
}
const avvisninger = [];
for (const sak of korpus.avvisninger) {
  const historikk = bygg(sak.start);
  const forrige = JSON.stringify(historikk);
  let feil = null;
  try {
    leggTil(historikk, handling(sak.handling));
  } catch (e) {
    feil = e instanceof Error ? e.message : String(e);
  }
  strictEqual(feil, sak.forventet_feil, sak.id);
  strictEqual(JSON.stringify(historikk), forrige, `${sak.id}: endret journal ved avvisning`);
  avvisninger.push({
    id: sak.id,
    ...bevisgrunnlag(sak),
    forventet: sak.forventet_feil,
    faktisk: feil,
  });
}
const mutasjoner = [];
async function medRekursivPunkt5(historikk) {
  const sperre = "    if (h.type === 'innsigelse' && h.grunn !== 'omfang') return vurdert;";
  const kilde = readFileSync(fil('forlopsmodell.ts'), 'utf8');
  strictEqual(kilde.split(sperre).length, 2, 'feilinnføringen må treffe én rekursjonssperre');
  const mappe = mkdtempSync(join(tmpdir(), 'metodeprove-punkt5-'));
  try {
    const sti = join(mappe, 'forlopsmodell.ts');
    writeFileSync(
      sti,
      kilde
        .replace(sperre, '')
        .replaceAll("'zod'", JSON.stringify(import.meta.resolve('zod')))
        .replaceAll("'./grunnmodell.ts'", JSON.stringify(fil('grunnmodell.ts').href))
    );
    const feilmodell = await import(pathToFileURL(sti).href);
    return feilmodell.utled(historikk);
  } finally {
    rmSync(mappe, { recursive: true });
  }
}
for (const prove of korpus.feilinnforinger) {
  const sak = korpus.forlop.find((s) => s.id === prove.sak);
  ok(sak && prove.etter <= sak.steg.length, 'mutasjon uten gyldig kontrollsak');
  const historikk = bygg(sak.steg.slice(0, prove.etter));
  const forrige = JSON.stringify(historikk);
  const utenFeil = felt(utled(historikk), prove.mal);
  deepStrictEqual(utenFeil, prove.forventet, `${prove.id}: grønn kontroll`);
  let endret;
  if (prove.endring === 'glem_svar_b') endret = historikk.filter((h) => h.type !== 'begrunnelse');
  else if (prove.endring === 'fjern_te_innsigelse')
    endret = historikk.filter((h) => !(h.type === 'innsigelse' && h.part === 'TE'));
  else if (prove.endring === 'bh_vurdering_vinner')
    endret = historikk.map((h) =>
      'rettidig' in h ? { ...h, rettidig: { TE: h.rettidig.BH, BH: h.rettidig.BH } } : h
    );
  else if (prove.endring === 'protest_til_forste_innsigelse') {
    const brev = new Map(historikk.filter((h) => h.type === 'brev').map((h) => [h.id, h]));
    endret = historikk.map((h) =>
      h.type === 'innsigelse' && brev.has(h.til)
        ? { ...h, til: brev.get(h.til).innsigelser[0].id }
        : h
    );
  } else if (prove.endring === 'felles_rettidighet_i_brev')
    endret = historikk.map((h) =>
      h.type === 'brev'
        ? {
            ...h,
            innsigelser: h.innsigelser.map((i) => ({ ...i, rettidig: h.innsigelser[0].rettidig })),
          }
        : h
    );
  else if (prove.endring === 'ny_dokumentasjon_vinner') {
    const dokumentert = new Set(
      historikk.filter((h) => h.type === 'innsigelse' && h.senere_dokumentert).map((h) => h.til)
    );
    endret = historikk.filter(
      (h) => !(h.type === 'avklart_ingen_tidsinnsigelse' && dokumentert.has(h.til))
    );
  } else if (prove.endring === 'omskriv_utsendt') {
    const naa = utled(historikk).utsendelser;
    endret = historikk.map((h) =>
      h.type === 'utsendt' ? { ...h, gjengitt: naa[h.id].gjeldende } : h
    );
  }
  const medFeil = felt(
    prove.endring === 'gjeninnfor_rekursiv_punkt_5'
      ? await medRekursivPunkt5(historikk)
      : utled(endret),
    prove.mal
  );
  notDeepStrictEqual(
    medFeil,
    prove.forventet,
    `${prove.id}: feilinnføring overlevde målassertionen`
  );
  strictEqual(JSON.stringify(historikk), forrige);
  deepStrictEqual(
    felt(utled(historikk), prove.mal),
    prove.forventet,
    `${prove.id}: grønn etter feilinnføring`
  );
  mutasjoner.push({
    id: prove.id,
    sak: prove.sak,
    ...bevisgrunnlag(sak),
    kontrollkilder: prove.kilder,
    mal: prove.mal,
    forventet: prove.forventet,
    med_feil: medFeil,
    kontroll_etter: prove.forventet,
  });
}
const rapport = {
  dato: '2026-10-08',
  domenesemantikk: 'delvis_avklart',
  avklarte_tolkninger: regler.avklarte_tolkninger,
  node: process.version,
  filhasher: Object.fromEntries(
    ['bevis-saker.json', 'regler.json', 'grunnmodell.ts', 'forlopsmodell.ts', 'kjor.mjs'].map(
      (navn) => [
        navn,
        createHash('sha256')
          .update(readFileSync(fil(navn)))
          .digest('hex'),
      ]
    )
  ),
  antall: {
    enkeltsaker: korpus.enkeltsaker.length,
    premisskombinasjoner: premisser.length,
    foresporselsvilkar: foresporsler.length,
    forlop: forlop.length,
    prefikser: antallPrefikser,
    avvisninger: korpus.avvisninger.length,
    feilinnforinger: mutasjoner.length,
  },
  historisk_sammenlikning:
    'samme resultater som første prøve for 297 + 81 kombinasjoner; karakterisering, ikke juridisk validering',
  grenser: [
    'Isolert prøvemodell, ingen applikasjonskode importert.',
    'JSON-rundtur er ikke database- eller API-bevis.',
    'MP-U4–MP-U7 er avklart for prøven; øvrige arbeidshypoteser er ikke godkjent gjennom dette.',
    'Sendte brev og senere dokumentasjon er syntetiske handlinger; bevisverdien vurderes ikke.',
    'Ingen påstand om alle mulige forløp.',
  ],
  enkeltsaker,
  forlop,
  avvisninger,
  mutasjoner,
};
writeFileSync(fil('resultater.json'), JSON.stringify(rapport, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      utfall: 'modellkontroller_bestatt',
      domenesemantikk: rapport.domenesemantikk,
      uavklarte_forlop: forlop
        .filter((s) => s.tolkningssporsmal.length)
        .map((s) => ({ id: s.id, sporsmal: s.tolkningssporsmal })),
      ...rapport.antall,
      mutasjoner,
    },
    null,
    2
  )
);
