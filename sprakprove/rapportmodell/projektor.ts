import { utledJournal } from '../../kjerne/kommandoer/skriving.ts';
import {
  enighetensVirkning,
  standpunktetErSubsidiaert,
  svarIkkeGodtatt,
  venterPaaSvar,
} from '../../kjerne/utledning/utled.ts';
import type { Utledning } from '../../kjerne/utledning/utled.ts';
import { SPOR } from '../../kjerne/typer.ts';
import type { Journalrad, Spor } from '../../kjerne/typer.ts';
import { KJERNE } from '../../kjerne/versjon.ts';

export const RAPPORTVERSJON = 'prove-1';
export const BEREGNING = {
  beregningssett: 'kjerne-24-39-rapport-prove-1',
  regelversjon: KJERNE.regler.versjon,
  kjerneprojeksjon: KJERNE.projeksjonsversjon,
  leserformat: KJERNE.leserformat,
  rapportprojeksjon: RAPPORTVERSJON,
};
export type Rad = Record<string, unknown>;
export interface Datakilde {
  element_id: string;
  event_id: string;
  felt: string;
  verdi: string;
  betydning: string;
  presisjon: 'dato' | 'millisekund';
  oppgitt_av: string;
  kjent_fra_versjon: number;
}
type Beregningsinfo = typeof BEREGNING;
export interface Maaling extends Beregningsinfo {
  forloep_id: string;
  sak_id: string;
  spor: Spor;
  maal: string;
  maaleregelversjon: string;
  kjent_fra_versjon: number;
  kjent_til_versjon: number | null;
  tilstand: string;
  start: Datakilde;
  slutt: Datakilde | null;
  observert_ved: Datakilde;
  dager: number | null;
  observerte_dager: number;
  kilde_ider: string[];
}

export const MAALEREGLER = [
  {
    maal: 'svartid_kravversjon',
    versjon: 'prove-1',
    regel:
      'Fra kravversjonens appregistrering til første appregistrerte svar som gjelder akkurat denne kravversjonen. Ubesvart erstattet krav har ingen svartid; observasjon stanser ved erstatningen.',
  },
  {
    maal: 'ventetid_kravkjede',
    versjon: 'prove-1',
    regel:
      'Fra første ubesvarte krav i erstatter-kjeden til første appregistrerte svar på et krav i kjeden. Revisjon før svar nullstiller ikke ventingen. Denne prøven har ett slikt intervall per spor.',
  },
  {
    maal: 'kjennskap_til_relevant_fristvarsel',
    versjon: 'prove-1',
    regel:
      'TEs klar_over_forholdet i grunnlagskravet til TEs oppgitte sendt-dato for registrert § 33.4-varsel. Før dette finnes, brukes uttrykkelig det første fristkravet appen kjenner etter OV-U5 som egen målvariant: dato til appregistrering. Dette er ikke måling av faktisk levering/mottak eller rettidighet.',
  },
  {
    maal: 'tid_uavklart',
    versjon: 'prove-1',
    regel:
      'Fra første appregistrerte krav i sporet til første prefiks hvor kjernen utleder virksom enighet i sporet. Besvart, subsidiært vurdert og betinget enighet avslutter ikke dette intervallet. Enighet om 0 dager avslutter det. Trekk og gjenåpning er ikke prøvd.',
  },
].map((r) => ({
  ...r,
  klassifisering: 'provekonvensjon',
  enhet: 'kalenderdager',
  tidssone: 'UTC',
  datoregel:
    'ISO-datodel i UTC; sluttens kalenderdato minus startens kalenderdato. Ingen timer beregnes. Åpne intervaller har dager=null og separat observerte_dager ved prefiksets siste registrering.',
}));

const dato = (s: string) => Date.parse(`${s.slice(0, 10)}T00:00:00Z`);
export const kalenderdager = (a: string, b: string) => (dato(b) - dato(a)) / 86400000;

function dokumenter(u: Utledning) {
  return u.journal.flatMap((h) =>
    h.art === 'dokument' ? [{ versjon: h.versjon, dokument: h.dokument }] : []
  );
}

function tidskilde(journal: Journalrad[], element: string, betydning: string): Datakilde {
  const u = utledJournal(journal, KJERNE);
  const event = u.elementer[element]?.hendelse ?? element;
  const rad = journal.find((r) => r.event_id === event);
  if (!rad) throw new Error(`Ukjent tidskilde ${element}`);
  return {
    element_id: element,
    event_id: event,
    felt: 'journal.tidsstempel',
    verdi: rad.tidsstempel,
    betydning,
    presisjon: 'millisekund',
    oppgitt_av: `syntetisk_apphandling:${rad.aktor_rolle}`,
    kjent_fra_versjon: rad.versjon,
  };
}

export function sporVed(journal: Journalrad[]) {
  const u = utledJournal(journal, KJERNE);
  if (!u.forstaatt) throw new Error(JSON.stringify(u.begrensninger));
  const g = u.spor.grunnlag.gjeldendeKrav;
  return SPOR.map((spor) => {
    const s = u.spor[spor];
    const svar = s.gjeldendeSvar;
    const tall = svar?.standpunkter.find(
      (p) => p.art === (spor === 'vederlag' ? 'beloep' : 'dager')
    );
    const grunnlag = u.spor.grunnlag;
    const kilder = [
      s.gjeldendeKrav?.id,
      svar?.id,
      ...(svar?.standpunkter.map((p) => p.id) ?? []),
      s.enighet?.holder,
      grunnlag.gjeldendeKrav?.id,
      grunnlag.gjeldendeSvar?.id,
      ...(grunnlag.gjeldendeSvar?.standpunkter.map((p) => p.id) ?? []),
      ...(svar ? u.svar[svar.id].gjaldtEtAnnetVarsel : []),
      ...(spor === 'frist' && s.varsel
        ? [
            s.varsel.id,
            ...u.opplysninger
              .filter((o) => o.opplysning.dokument === s.varsel!.dokument)
              .map((o) => o.opplysning.id),
          ]
        : []),
    ].filter((x): x is string => !!x);
    return {
      ...BEREGNING,
      sak_id: journal[0].sak_id,
      saksversjon: u.versjon,
      spor,
      observasjon_event_id: journal.at(-1)!.event_id,
      tidsstempel: journal.at(-1)!.tidsstempel,
      hovedkategori: g?.innhold.hovedkategori ?? null,
      underkategori: g?.innhold.underkategori ?? null,
      krav_id: s.gjeldendeKrav?.id ?? null,
      te_krav: s.gjeldendeKrav?.innhold ?? null,
      svar_id: svar?.id ?? null,
      bh_standpunkt: svar?.standpunkter ?? [],
      bh_tall: tall?.art === 'beloep' ? tall.godkjent : tall?.art === 'dager' ? tall.vurdert : null,
      tall_subsidiaert:
        spor !== 'grunnlag' && tall ? standpunktetErSubsidiaert(u, spor, tall.id) : null,
      frosne_virkninger: svar?.beslutningsgrunnlag.virkninger ?? [],
      grunnlag_avklart: u.grunnlagAvklart,
      grunnlag_avvist: u.grunnlagAvvist,
      enighet: s.enighet?.grunnlag ?? null,
      enighet_holder: s.enighet?.holder ?? null,
      enighet_virkning: enighetensVirkning(u, spor),
      venter_paa_svar: venterPaaSvar(u, spor),
      svar_ikke_godtatt: svarIkkeGodtatt(u, spor),
      annet_varsel: svar ? u.svar[svar.id].gjaldtEtAnnetVarsel : [],
      kilde_ider: [...new Set(kilder)],
      kilde_brev: [...new Set(kilder.map((id) => u.elementer[id]?.hendelse ?? id))],
    };
  });
}

function maalingerVed(journal: Journalrad[]): Maaling[] {
  const u = utledJournal(journal, KJERNE);
  const sak = journal[0].sak_id;
  const resultat: Maaling[] = [];
  const observert = tidskilde(
    journal,
    journal.at(-1)!.event_id,
    'Målingens observasjonstid; syntetisk appregistrering, ikke levering'
  );
  const leggTil = (
    maal: string,
    spor: Spor,
    identitet: string,
    start: Datakilde,
    slutt: Datakilde | null,
    tilstand: string,
    kilder: string[],
    observasjon = observert
  ) => {
    resultat.push({
      ...BEREGNING,
      forloep_id: `${sak}/${spor}/${maal}/${identitet}`,
      sak_id: sak,
      spor,
      maal,
      maaleregelversjon: 'prove-1',
      kjent_fra_versjon: u.versjon,
      kjent_til_versjon: null,
      start,
      slutt,
      observert_ved: observasjon,
      tilstand,
      dager: slutt ? kalenderdager(start.verdi, slutt.verdi) : null,
      observerte_dager: kalenderdager(start.verdi, (slutt ?? observasjon).verdi),
      kilde_ider: [
        ...new Set(
          [start.element_id, slutt?.element_id, observasjon.element_id, ...kilder].filter(
            (x): x is string => !!x
          )
        ),
      ],
    });
  };
  for (const spor of SPOR) {
    const s = u.spor[spor];
    for (const krav of s.krav) {
      const svar = s.svar.find((sv) => sv.gjelder === krav.id);
      const erstatter = s.krav.find((k) => k.erstatter === krav.id);
      leggTil(
        'svartid_kravversjon',
        spor,
        krav.id,
        tidskilde(journal, krav.id, 'Kravversjonen registrert i appen'),
        svar
          ? tidskilde(journal, svar.id, 'Første svar på denne kravversjonen registrert i appen')
          : null,
        svar ? 'besvart' : erstatter ? 'erstattet_ubesvart' : 'venter',
        [krav.id, ...(svar ? [svar.id] : []), ...(erstatter ? [erstatter.id] : [])],
        erstatter && !svar
          ? tidskilde(
              journal,
              erstatter.id,
              'Erstatning avslutter observasjonen av ubesvart kravversjon'
            )
          : observert
      );
    }
    const foerste = s.krav[0];
    if (!foerste) continue;
    const foersteSvar = s.svar[0];
    leggTil(
      'ventetid_kravkjede',
      spor,
      foerste.id,
      tidskilde(journal, foerste.id, 'Første ubesvarte krav i kjeden registrert i appen'),
      foersteSvar
        ? tidskilde(journal, foersteSvar.id, 'Første appregistrerte svar i kravkjeden')
        : null,
      foersteSvar ? 'besvart' : 'venter',
      [s.gjeldendeKrav!.id, ...(foersteSvar ? [foersteSvar.id] : [])]
    );
    let avklart: { prefiks: Journalrad[]; holder: string } | null = null;
    for (let i = 1; i <= journal.length; i++) {
      const prefiks = journal.slice(0, i);
      const tidligere = utledJournal(prefiks, KJERNE);
      if (enighetensVirkning(tidligere, spor) === 'virksom') {
        avklart = { prefiks, holder: tidligere.spor[spor].enighet!.holder };
        break;
      }
    }
    leggTil(
      'tid_uavklart',
      spor,
      foerste.id,
      tidskilde(journal, foerste.id, 'Første krav registrert i appen'),
      avklart
        ? tidskilde(
            journal,
            avklart.prefiks.at(-1)!.event_id,
            'Første saksversjon med virksom enighet, etter kjernens lesing'
          )
        : null,
      avklart ? 'virksom_enighet' : 'uavklart',
      [s.gjeldendeKrav!.id, ...(avklart ? [avklart.holder, u.spor.grunnlag.gjeldendeSvar!.id] : [])]
    );
  }
  const grunnlag = u.spor.grunnlag.gjeldendeKrav;
  const frist = u.spor.frist;
  if (grunnlag && typeof grunnlag.innhold.klar_over_forholdet === 'string' && frist.krav.length) {
    const start: Datakilde = {
      ...tidskilde(journal, grunnlag.id, 'TEs oppgitte dato for kjennskap til forholdet'),
      felt: 'krav.innhold.klar_over_forholdet',
      verdi: grunnlag.innhold.klar_over_forholdet,
      presisjon: 'dato',
      oppgitt_av: 'TE',
    };
    const opplysning = u.opplysninger.find(
      (o) => o.opplysning.hva === 'sendt' && o.opplysning.dokument === frist.varsel?.dokument
    )?.opplysning;
    let slutt: Datakilde;
    if (opplysning && 'dato' in opplysning)
      slutt = {
        ...tidskilde(
          journal,
          opplysning.id,
          'TE oppgir at eksternt § 33.4-varsel ble sendt denne datoen; ikke verifisert levering'
        ),
        felt: 'opplysning.dato',
        verdi: opplysning.dato,
        presisjon: 'dato',
        oppgitt_av: opplysning.oppgittAv,
      };
    else
      slutt = tidskilde(
        journal,
        frist.krav[0].id,
        'Første fristkrav er det første varselet appen kjenner (OV-U5); dato til apphandling er en uttrykkelig prøvekonvensjon'
      );
    leggTil(
      'kjennskap_til_relevant_fristvarsel',
      'frist',
      grunnlag.id,
      start,
      slutt,
      opplysning ? 'partsoppgitt_eksternt_varsel' : 'foerste_appkjente_varsel',
      [grunnlag.id, frist.varsel?.id ?? frist.krav[0].id]
    );
  }
  return resultat;
}

/** Hvert prefiks regnes for seg; historiske målegrunnlag erstattes aldri. Til-versjonen er eksklusiv. */
export function projiser(journal: Journalrad[], prosjektId: string) {
  const u = utledJournal(journal, KJERNE);
  if (!u.forstaatt) throw new Error(JSON.stringify(u.begrensninger));
  const sakId = journal[0].sak_id;
  const felles = { sak_id: sakId };
  const brev: Rad[] = [],
    element: Rad[] = [],
    krav: Rad[] = [],
    svar: Rad[] = [],
    standpunkt: Rad[] = [],
    utsagn: Rad[] = [],
    opplysning: Rad[] = [],
    brevavsnitt: Rad[] = [],
    vedleggsbinding: Rad[] = [];
  for (const { versjon, dokument: d } of dokumenter(u)) {
    const anker = { ...felles, event_id: d.id, kjent_fra_versjon: versjon };
    brev.push({ ...anker, avsender: d.avsender, registrert: d.registrert });
    element.push({ ...anker, element_id: d.id, art: 'dokument' });
    const leggElement = (id: string, art: string, innhold: object, tabell: Rad[]) => {
      element.push({ ...anker, element_id: id, art });
      tabell.push({ ...anker, ...innhold });
    };
    for (const k of d.krav)
      leggElement(
        k.id,
        'krav',
        {
          ...k,
          beloep: k.innhold.beloep ?? null,
          dager: k.innhold.dager ?? null,
          metode: k.innhold.metode ?? null,
          hovedkategori: k.innhold.hovedkategori ?? null,
          underkategori: k.innhold.underkategori ?? null,
          klar_over_forholdet: k.innhold.klar_over_forholdet ?? null,
        },
        krav
      );
    for (const s of d.svar) {
      leggElement(s.id, 'svar', { ...s, standpunkter: undefined }, svar);
      for (const p of s.standpunkter)
        leggElement(
          p.id,
          'standpunkt',
          {
            ...p,
            svar_id: s.id,
            spor: s.spor,
            frossen_virkning:
              s.beslutningsgrunnlag.virkninger.find((v) => v.standpunkt === p.id)?.virkning ?? null,
          },
          standpunkt
        );
    }
    for (const x of d.utsagn) leggElement(x.id, x.art, x, utsagn);
    for (const o of d.opplysninger) leggElement(o.id, 'opplysning', o, opplysning);
    for (const [i, a] of (d.brevtekst ?? []).entries())
      brevavsnitt.push({ ...anker, avsnitt_nr: i + 1, ...a });
    for (const v of d.dokumentasjon)
      vedleggsbinding.push({
        ...anker,
        ...v,
        gjelder: d.utsagn.filter((x) => x.art === 'varsel').map((x) => x.id),
        bindingens_omfang: 'dokument; varselreferanse utpakket for dette forløpet',
      });
  }
  const sporhistorikk = journal.flatMap((_, i) => sporVed(journal.slice(0, i + 1)));
  const maaltForloep: Maaling[] = [];
  const siste = new Map<string, Maaling>();
  const sammenliknbar = (r: Maaling) =>
    JSON.stringify({ ...r, kjent_fra_versjon: undefined, kjent_til_versjon: undefined });
  for (let i = 1; i <= journal.length; i++) {
    for (const m of maalingerVed(journal.slice(0, i))) {
      const forrige = siste.get(m.forloep_id);
      if (forrige && sammenliknbar(forrige) === sammenliknbar(m)) continue;
      if (forrige) forrige.kjent_til_versjon = m.kjent_fra_versjon;
      maaltForloep.push(m);
      siste.set(m.forloep_id, m);
    }
  }
  return {
    sak: [
      {
        ...felles,
        prosjekt_id: prosjektId,
        sakstittel: journal[0].data.sakstittel,
        kilde_event_id: journal[0].event_id,
      },
    ],
    brev,
    element,
    krav,
    svar,
    standpunkt,
    utsagn,
    opplysning,
    brevavsnitt,
    vedleggsbinding,
    sporhistorikk,
    maalt_forloep: maaltForloep,
    maaleregel: MAALEREGLER,
  };
}

export function maalVed(rader: Maaling[], versjon: number) {
  return rader.filter(
    (r) =>
      r.kjent_fra_versjon <= versjon &&
      (r.kjent_til_versjon === null || versjon < r.kjent_til_versjon)
  );
}

/** Samme avgrensning av stående krav som server/saksliste.ts, uten å gi tallene ny domenevirkning. */
export function portefolje(journaler: Journalrad[][]) {
  const grupper = new Map<
    string,
    {
      hovedkategori: unknown;
      underkategori: unknown;
      krav_sum: number | null;
      krav_antall: number;
      ukjent_krav_antall: number;
      virksom_enighet_sum: number | null;
      betinget_enighet_sum: number | null;
      bh_subsidiaert_sum: number | null;
      kilde_ider: string[];
      kildeversjoner: { sak_id: string; versjon: number }[];
    }
  >();
  for (const j of journaler) {
    const u = utledJournal(j, KJERNE);
    if (!u.forstaatt) throw new Error('Ukjent sak kan ikke summeres i denne prøven');
    const g = u.spor.grunnlag.gjeldendeKrav;
    const key = JSON.stringify([g?.innhold.hovedkategori, g?.innhold.underkategori]);
    const r = grupper.get(key) ?? {
      hovedkategori: g?.innhold.hovedkategori ?? null,
      underkategori: g?.innhold.underkategori ?? null,
      krav_sum: null,
      krav_antall: 0,
      ukjent_krav_antall: 0,
      virksom_enighet_sum: null,
      betinget_enighet_sum: null,
      bh_subsidiaert_sum: null,
      kilde_ider: [],
      kildeversjoner: [],
    };
    r.kildeversjoner.push({ sak_id: j[0].sak_id, versjon: u.versjon });
    if (g) r.kilde_ider.push(g.id);
    const s = u.spor.vederlag;
    if (s.gjeldendeKrav && !s.trukket && !u.grunnlagAvvist && !u.spor.grunnlag.trukket) {
      const tall = s.gjeldendeKrav.innhold.beloep;
      if (typeof tall === 'number') {
        r.krav_sum = (r.krav_sum ?? 0) + tall;
        r.krav_antall++;
      } else r.ukjent_krav_antall++;
      r.kilde_ider.push(s.gjeldendeKrav.id);
    }
    const bhTall = s.gjeldendeSvar?.standpunkter.find((p) => p.art === 'beloep');
    if (bhTall?.art === 'beloep' && standpunktetErSubsidiaert(u, 'vederlag', bhTall.id)) {
      r.bh_subsidiaert_sum = (r.bh_subsidiaert_sum ?? 0) + bhTall.godkjent;
      r.kilde_ider.push(s.gjeldendeSvar!.id, bhTall.id);
    }
    const virkning = enighetensVirkning(u, 'vederlag');
    const tall = s.enighet?.grunnlag.utfall.beloep;
    if (typeof tall === 'number' && s.enighet) {
      if (virkning === 'virksom') r.virksom_enighet_sum = (r.virksom_enighet_sum ?? 0) + tall;
      if (virkning === 'betinget') r.betinget_enighet_sum = (r.betinget_enighet_sum ?? 0) + tall;
      r.kilde_ider.push(s.enighet.holder, s.enighet.grunnlag.svar);
    }
    grupper.set(key, r);
  }
  const rader = [...grupper.values()];
  return {
    grupper: rader,
    krav_sum: rader.reduce((n, r) => n + (r.krav_sum ?? 0), 0),
    krav_antall: rader.reduce((n, r) => n + r.krav_antall, 0),
    fristdager_sum: null,
    merknad:
      'Fristdager summeres ikke. null i en enighetssum betyr at gruppen ikke har tallgrunnlag med denne virkningen; det er ikke en enighet om 0.',
  };
}
