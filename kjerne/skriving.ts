/**
 * Én kommando blir hendelser i dagens lagrede form, eller en avvisning:
 * formen, utledningen av journalen, forutsetningene, nyttelastkontrollen og til
 * sist hendelsene med det serveren fryser. Et brev med flere svar blir én
 * hendelse per svar med samme `dokument_id`, fordi dagens journal har én
 * hendelse per svar. Formatet er ikke valgt (#273).
 */

import type { Journalrad } from './typer.ts';
import { avvisning } from './avvisning.ts';
import { formfeil, type Kommando, type Svarutkast } from './kommando.ts';
import { KRAVREFERANSE, lesJournal, SVARTYPER } from './leser.ts';
import type { Kjerne } from './versjon.ts';
import {
  beslutningsgrunnlag,
  enighetsgrunnlag,
  godkjennerHeleKravet,
  regnUtSvar,
  standpunkter,
} from './standpunkt.ts';
import { forhandsvisAksept, utled, type Utledning } from './utled.ts';
import type { Avvisning, Part } from './typer.ts';

/** Det serveren stempler kommandoen med. Klienten bestemmer ingen av dem. */
export interface Kontekst {
  sakId: string;
  aktorId: string;
  part: Part;
  teamId: string | null;
  tidspunkt: () => Date;
  nyId: () => string;
}

export type Utfall =
  | { godtatt: true; hendelser: Journalrad[] }
  | { godtatt: false; feil: 'UGYLDIG_FORM' | 'REGELBRUDD'; avvisning: Avvisning };

export function utledJournal(journal: Journalrad[], kjerne: Kjerne): Utledning {
  return utled(lesJournal(journal, kjerne.format), kjerne.regler);
}

const VURDERINGSFELT: Record<string, string> = {
  resultat: 'resultat',
  grunnlag_varslet_i_tide: 'grunnlag_varslet_i_tide',
  hovedkrav_vurdering: 'hovedkrav_vurdering',
  hovedkrav_godkjent_belop: 'hovedkrav_godkjent_belop',
  aksepterer_metode: 'aksepterer_metode',
  frist_varsel_ok: 'frist_varsel_ok',
  spesifisert_krav_ok: 'spesifisert_krav_ok',
  vilkar_oppfylt: 'vilkar_oppfylt',
};

const TREKKTYPE = {
  grunnlag: 'grunnlag_trukket',
  vederlag: 'vederlag_krav_trukket',
  frist: 'frist_krav_trukket',
};
const KRAVTYPE = {
  grunnlag: ['grunnlag_opprettet', 'grunnlag_oppdatert'],
  vederlag: ['vederlag_krav_sendt', 'vederlag_krav_oppdatert'],
  frist: ['frist_krav_sendt', 'frist_krav_oppdatert'],
};

function svardata(
  s: Svarutkast,
  u: Utledning,
  kjerne: Kjerne,
  dokumentId: string
): Record<string, unknown> {
  const data: Record<string, unknown> = {
    begrunnelse: 'Vurdert',
    regelversjon: s.regelversjon,
    dokument_id: dokumentId,
  };
  for (const [felt, lagret] of Object.entries(VURDERINGSFELT)) {
    const v = (s.vurderinger as Record<string, unknown>)[felt];
    if (v !== undefined && v !== null) data[lagret] = v;
  }
  // B-13: serverens verdier lagres, ikke klientens.
  const krav = u.spor[s.spor].gjeldendeKrav!;
  Object.assign(
    data,
    regnUtSvar(
      s.spor,
      s.vurderinger,
      { krav, grunnlagskrav: u.spor.grunnlag.gjeldendeKrav },
      kjerne.regler
    )
  );
  if (s.spor !== 'grunnlag') data[KRAVREFERANSE[s.spor]] = s.gjelder;
  return data;
}

export function vurder(
  kommando: unknown,
  kontekst: Kontekst,
  journal: Journalrad[],
  kjerne: Kjerne
): Utfall {
  const feil = formfeil(kommando);
  if (feil.length)
    return {
      godtatt: false,
      feil: 'UGYLDIG_FORM',
      avvisning: { regel: 'UGYLDIG_FORM', melding: feil.join('; ') },
    };
  const k = kommando as Kommando;
  const u = utledJournal(journal, kjerne);
  const brudd = avvisning(k, kontekst.part, u, kjerne.regler);
  if (brudd) return { godtatt: false, feil: 'REGELBRUDD', avvisning: brudd };

  const hendelser: Journalrad[] = [];
  const ny = (
    type: string,
    data: Record<string, unknown>,
    referanse: string | null = null
  ): Journalrad => {
    const id = kontekst.nyId();
    const h: Journalrad = {
      event_id: id,
      sak_id: kontekst.sakId,
      event_type: type as Journalrad['event_type'],
      versjon: (journal.at(-1)?.versjon ?? 0) + hendelser.length + 1,
      tidsstempel: kontekst.tidspunkt().toISOString(),
      aktor_id: kontekst.aktorId,
      aktor_rolle: kontekst.part,
      aktor_team_id: kontekst.teamId,
      refererer_til_event_id: referanse,
      data: kjerne.format > 1 ? { ...data, hendelsesformat: kjerne.format } : data,
    };
    hendelser.push(h);
    return h;
  };

  switch (k.type) {
    case 'krav': {
      const data: Record<string, unknown> = { ...k.innhold };
      if (k.varsel) data.frist_varsel = { dato_sendt: k.varsel.sendt };
      ny(KRAVTYPE[k.spor][u.spor[k.spor].krav.length ? 1 : 0], data);
      break;
    }
    case 'brev': {
      const dokumentId = kontekst.nyId();
      for (const s of k.svar)
        ny(`respons_${s.spor}`, svardata(s, u, kjerne, dokumentId), s.gjelder);
      break;
    }
    case 'revisjon':
      ny(
        `respons_${k.svar.spor}_oppdatert`,
        { ...svardata(k.svar, u, kjerne, kontekst.nyId()), original_respons_id: k.erstatter },
        k.svar.gjelder
      );
      break;
    case 'aksept':
      // Enighetsgrunnlaget er det TE fikk se; nyttelastkontrollen har vist at det er serverens.
      ny(
        'te_aksepterer_respons',
        {
          spor: k.spor,
          regelversjon: k.regelversjon,
          enighetsgrunnlag: forhandsvisAksept(u, k.svar),
        },
        k.svar
      );
      break;
    case 'trekk':
      ny(TREKKTYPE[k.spor], { begrunnelse: 'Trukket' });
      break;
    case 'varsel':
      ny('frist_varsel_registrert', {
        hjemmel: k.hjemmel,
        sendt: k.sendt,
        sendt_oppgitt_av: kontekst.part,
        dokumentasjon: k.dokumentasjon ?? [],
      });
      break;
    case 'bestridelse':
      ny('bestridelse_registrert', { gjelder: k.gjelder, hva: k.hva });
      break;
  }

  if (!frysBrev(journal, hendelser, kjerne))
    throw new Error('Kjernen forstår ikke brevet den selv skriver.');
  return { godtatt: true, hendelser };
}

/**
 * Fryser brevet i hvert svar blant `nye`: beslutningsgrunnlaget, og
 * enighetsgrunnlaget når svaret godkjenner hele kravet (GR-U7, GR-U10, MM-U9).
 * Gjelder også registrert korrespondanse (merknaden til MM-U9). `false`, og
 * ingenting fryses, når kjernen ikke forstår journalen med svarene.
 */
export function frysBrev(journal: Journalrad[], nye: Journalrad[], kjerne: Kjerne): boolean {
  const svar = nye.filter((h) => SVARTYPER[h.event_type] !== undefined);
  if (!svar.length) return true;
  const alle = [...journal, ...nye];
  const utkast = utled(
    lesJournal(alle, kjerne.format, new Set(svar.map((h) => h.event_id))),
    kjerne.regler
  );
  if (!utkast.forstatt) return false;
  for (const h of svar) {
    const s = utkast.svar[h.event_id].svar;
    const grunnlagskrav =
      s.spor === 'grunnlag'
        ? utkast.spor.grunnlag.krav.find((k) => k.id === s.gjelder)
        : utkast.spor.grunnlag.gjeldendeKrav;
    const st = standpunkter(s, grunnlagskrav, kjerne.regler);
    const brev = beslutningsgrunnlag(s, st, kjerne.regler);
    h.data.beslutningsgrunnlag = brev;
    h.data.enighetsgrunnlag = godkjennerHeleKravet(s, st)
      ? enighetsgrunnlag({ ...s, beslutningsgrunnlag: brev }, 'sammenfall')
      : null;
  }
  return utledJournal(alle, kjerne).forstatt;
}
