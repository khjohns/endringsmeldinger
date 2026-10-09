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
import {
  HENDELSESTYPER,
  KRAVREFERANSE,
  lesJournal,
  svarreferanse,
  svarutsagn,
  SVARTYPER,
  utledetVarsel,
} from './leser.ts';
import type { Regelsett } from './regler/regelsett.ts';
import { beslutningsgrunnlag, regnUtSvar, standpunkter } from './standpunkt.ts';
import { grunnlagskravFor, utled, type Utledning } from './utled.ts';
import type { Kjerne } from './versjon.ts';
import type { Avvisning, Part } from './typer.ts';

/** Det serveren stempler kommandoen med. Klienten bestemmer ingen av dem. */
export interface Kontekst {
  sakId: string;
  aktoerId: string;
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

const VURDERINGSFELT = [
  'resultat',
  'grunnlag_varslet_i_tide',
  'hovedkrav_vurdering',
  'hovedkrav_godkjent_belop',
  'aksepterer_metode',
  'frist_varsel_ok',
  'spesifisert_krav_ok',
  'vilkar_oppfylt',
];

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
  for (const felt of VURDERINGSFELT) {
    const v = (s.vurderinger as Record<string, unknown>)[felt];
    if (v !== undefined && v !== null) data[felt] = v;
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
      aktor_id: kontekst.aktoerId,
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
      ny(HENDELSESTYPER[k.spor].krav[u.spor[k.spor].krav.length ? 1 : 0], data);
      break;
    }
    case 'brev': {
      const dokumentId = kontekst.nyId();
      for (const s of k.svar)
        ny(HENDELSESTYPER[s.spor].svar[0], svardata(s, u, kjerne, dokumentId), s.gjelder);
      break;
    }
    case 'revisjon':
      ny(
        HENDELSESTYPER[k.svar.spor].svar[1],
        { ...svardata(k.svar, u, kjerne, kontekst.nyId()), original_respons_id: k.erstatter },
        k.svar.gjelder
      );
      break;
    case 'aksept':
      // KA-U10: aksepten viser til svaret og lagrer regelversjonen TE fikk se.
      ny('te_aksepterer_respons', { spor: k.spor, regelversjon: k.regelversjon }, k.svar);
      break;
    case 'trekk':
      ny(HENDELSESTYPER[k.spor].trekk, { begrunnelse: 'Trukket' });
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

  // Et svar fryser brevet (MM-U9). Kjernen må forstå det den selv har skrevet.
  const svar = hendelser.filter((h) => SVARTYPER[h.event_type]);
  for (const h of svar) frysSvar(h, u, kjerne.regler);
  if (svar.length && !utledJournal([...journal, ...hendelser], kjerne).forstaatt)
    throw new Error('Kjernen forstår ikke brevet den selv skriver.');
  return { godtatt: true, hendelser };
}

/**
 * Fryser brevet i svarraden: beslutningsgrunnlaget, som også er innholdet i en
 * enighet om svaret (MM-U9, KA-U10). `u` er utledningen av journalen før raden.
 * Gjelder også registrert korrespondanse (merknaden til MM-U9). Kaster
 * `Uforstaatt` når raden ikke kan leses.
 */
export function frysSvar(rad: Journalrad, u: Utledning, regler: Regelsett): void {
  const spor = SVARTYPER[rad.event_type];
  const gjelder = svarreferanse(rad, spor);
  const fristvarsel = u.spor.frist.varsel?.id ?? utledetVarsel(gjelder);
  const svar = {
    spor,
    utsagn: svarutsagn(spor, rad.event_id, gjelder, rad.data, fristvarsel),
    utregning: rad.data,
  };
  const krav = grunnlagskravFor({ spor, gjelder }, u);
  rad.data.beslutningsgrunnlag = beslutningsgrunnlag(
    svar,
    standpunkter(svar, krav, regler),
    regler
  );
}
