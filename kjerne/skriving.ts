/**
 * Én kommando blir ett dokument i journalen, eller en avvisning: formen,
 * utledningen av journalen, forutsetningene, nyttelastkontrollen og til sist
 * raden med det serveren fryser. Et brev med flere svar er én rad (4.1 i
 * designnotatet). Serveren gir hvert krav, svar, utsagn og hver opplysning en ny
 * ID, og relasjonene står som `gjelder` og `erstatter` (4.2).
 */

import { avvisning } from './avvisning.ts';
import { HJEMMEL } from './format.ts';
import { formfeil, type Kommando, type Svarutkast } from './kommando.ts';
import { lesJournal, standpunkterISvaret, Uforstaatt } from './leser.ts';
import { beslutningsgrunnlag, regnUtSvar } from './standpunkt.ts';
import { grunnlagskravFor, utled, type Utledning } from './utled.ts';
import type { Kjerne } from './versjon.ts';
import type { Avvisning, Beslutningsgrunnlag, Journalrad, Krav, Part, Spor } from './typer.ts';

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

/** Kjernen forstår ikke raden den selv skriver. Raden lagres ikke (MM-U2). */
export class Skrivefeil extends Error {}

type Data = Record<string, unknown>;

export function utledJournal(journal: Journalrad[], kjerne: Kjerne): Utledning {
  return utled(lesJournal(journal, kjerne.format), kjerne.regler);
}

/**
 * Beslutningsgrunnlaget i formatet. Virkningene viser til standpunktet, og arten
 * leses derfra. Standpunktene uten virkning står for seg, fordi det er appens
 * vurdering og ikke noe byggherren har sagt (HF-U2).
 */
function lagret({ virkninger, ...resten }: Beslutningsgrunnlag): Data {
  const uten = virkninger.filter((v) => v.virkning === 'uten_virkning');
  return {
    ...resten,
    virkninger: virkninger
      .filter((v) => v.virkning !== 'uten_virkning')
      .map(({ standpunkt, virkning }) => ({ standpunkt, virkning })),
    ...(uten.length ? { uten_virkning: uten.map((v) => v.standpunkt) } : {}),
  };
}

/**
 * Fryser brevet i et lagret svar (MM-U9, MM-U11, GR-U12). `grunnlagskrav` er
 * kravet et grunnlagssvar gjelder, ellers gjeldende grunnlagskrav. Kaster
 * `Uforstaatt` når standpunktene ikke kan leses.
 */
function frys(svar: Data, grunnlagskrav: Krav | null | undefined, kjerne: Kjerne): Data {
  const spor = svar.spor as Spor;
  const innhold = {
    spor,
    standpunkter: standpunkterISvaret(spor, svar),
    utregning: (svar.utregning ?? {}) as Data,
  };
  return lagret(beslutningsgrunnlag(innhold, grunnlagskrav, kjerne.regler));
}

/** Standpunktene byggherren har tatt, i rekkefølgen brevet setter dem. En vurdering som ikke er gjort, utelates (KA-U4). */
function standpunkter(s: Svarutkast, krav: Krav, u: Utledning, nyId: () => string): Data[] {
  const v = s.vurderinger;
  const ut: Data[] = [];
  if (s.spor === 'grunnlag') {
    if (typeof v.grunnlag_varslet_i_tide === 'boolean')
      ut.push({
        id: nyId(),
        art: 'rettidighet',
        gjelder: krav.id,
        hjemmel: HJEMMEL.grunnlag,
        i_tide: v.grunnlag_varslet_i_tide,
      });
    ut.push({ id: nyId(), art: 'grunnlag', resultat: v.resultat });
  } else if (s.spor === 'vederlag') {
    ut.push({ id: nyId(), art: 'beloep' });
  } else {
    // MM-U1: vurderingen gjelder varselet som er registrert nå, ellers varselet utledet av kravet.
    if (typeof v.frist_varsel_ok === 'boolean')
      ut.push({
        id: nyId(),
        art: 'rettidighet',
        gjelder: u.spor.frist.varsel?.id ?? krav.id,
        hjemmel: HJEMMEL.frist,
        i_tide: v.frist_varsel_ok,
      });
    if (typeof v.vilkar_oppfylt === 'boolean')
      ut.push({ id: nyId(), art: 'hindring', oppfylt: v.vilkar_oppfylt });
    ut.push({ id: nyId(), art: 'dager' });
  }
  return ut;
}

function svar(
  s: Svarutkast,
  u: Utledning,
  kjerne: Kjerne,
  nyId: () => string,
  erstatter?: string
): Data {
  const krav = u.spor[s.spor].gjeldendeKrav!;
  const e: Data = {
    id: nyId(),
    spor: s.spor,
    gjelder: s.gjelder,
    ...(erstatter ? { erstatter } : {}),
    standpunkter: standpunkter(s, krav, u, nyId),
  };
  // B-13: serverens utregning lagres, ikke klientens.
  if (s.spor !== 'grunnlag')
    e.utregning = regnUtSvar(
      s.spor,
      s.vurderinger,
      { krav, grunnlagskrav: u.spor.grunnlag.gjeldendeKrav },
      kjerne.regler
    );
  e.beslutningsgrunnlag = frys(
    e,
    grunnlagskravFor({ spor: s.spor, gjelder: s.gjelder }, u),
    kjerne
  );
  return e;
}

/** Innholdet i dokumentet kommandoen gir. */
function dokument(k: Kommando, u: Utledning, kjerne: Kjerne, nyId: () => string): Data {
  switch (k.type) {
    case 'krav': {
      const forrige = u.spor[k.spor].gjeldendeKrav;
      const data: Data = {
        krav: [
          { id: nyId(), spor: k.spor, ...(forrige ? { erstatter: forrige.id } : {}), ...k.innhold },
        ],
      };
      // MM-U1: et varsel i kravet registreres første gang det kommer.
      // HF-U1: datoen gjelder varselet, ikke kravet, som er sendt i appen.
      if (k.varsel && !u.spor.frist.varsel) {
        const varsel = nyId();
        data.utsagn = [{ id: varsel, art: 'varsel', hjemmel: '33.4' }];
        data.opplysninger = [{ id: nyId(), hva: 'sendt', dato: k.varsel.sendt, gjelder: varsel }];
      }
      return data;
    }
    case 'brev':
      return { svar: k.svar.map((s) => svar(s, u, kjerne, nyId)) };
    case 'revisjon':
      return { svar: [svar(k.svar, u, kjerne, nyId, k.erstatter)] };
    case 'aksept':
      // KA-U10: aksepten viser til svaret og lagrer regelversjonen TE fikk se.
      return {
        utsagn: [{ id: nyId(), art: 'aksept', gjelder: k.svar, regelversjon: k.regelversjon }],
      };
    case 'trekk':
      return { utsagn: [{ id: nyId(), art: 'trekk', gjelder: u.spor[k.spor].gjeldendeKrav!.id }] };
    case 'varsel':
      return {
        utsagn: [{ id: nyId(), art: 'varsel', hjemmel: k.hjemmel }],
        opplysninger: [{ id: nyId(), hva: 'sendt', dato: k.sendt }],
        ...(k.dokumentasjon?.length ? { dokumentasjon: k.dokumentasjon } : {}),
      };
    case 'bestridelse':
      return { utsagn: [{ id: nyId(), art: 'bestridelse', gjelder: k.gjelder, hva: k.hva }] };
  }
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
  const lest = lesJournal(journal, kjerne.format);
  const u = utled(lest, kjerne.regler);
  const brudd = avvisning(k, kontekst.part, u, kjerne.regler);
  if (brudd) return { godtatt: false, feil: 'REGELBRUDD', avvisning: brudd };

  const eventId = kontekst.nyId();
  let data: Data;
  try {
    data = dokument(k, u, kjerne, kontekst.nyId);
  } catch (feil) {
    // Frysingen leser standpunktene kjernen nettopp skrev; kan den ikke det, er raden feil.
    if (feil instanceof Uforstaatt)
      throw new Skrivefeil(`Kjernen forstår ikke dokumentet den selv skriver: ${feil.message}`);
    throw feil;
  }
  const rad: Journalrad = {
    event_id: eventId,
    sak_id: kontekst.sakId,
    event_type: 'dokument_registrert',
    versjon: (journal.at(-1)?.versjon ?? 0) + 1,
    tidsstempel: kontekst.tidspunkt().toISOString(),
    aktor_id: kontekst.aktoerId,
    aktor_rolle: kontekst.part,
    aktor_team_id: kontekst.teamId,
    refererer_til_event_id: null,
    format: kjerne.format,
    data,
  };
  // Kjernen må forstå det den selv skriver (MM-U2, 7.1.2 i designnotatet). Hver rad leses
  // for seg, så bare den nye leses; hele journalen utledes på nytt med den.
  const etter = utled([...lest, ...lesJournal([rad], kjerne.format)], kjerne.regler);
  if (!etter.forstaatt)
    throw new Skrivefeil(
      `Kjernen forstår ikke dokumentet den selv skriver: ${etter.begrensninger.map((b) => b.grunn).join('; ')}`
    );
  return { godtatt: true, hendelser: [rad] };
}

/**
 * Fryser brevet i hvert svar i en rad som er registrert uten kommandoen, for
 * eksempel registrert korrespondanse (merknaden til MM-U9, GR-U12). Kategorien
 * brevet regnes med, leses fra radene før, også når saken ikke er forstått.
 * Kaster `Uforstaatt` når et svar ikke kan leses.
 */
export function frysBrev(rad: Journalrad, foer: Journalrad[], kjerne: Kjerne): void {
  const grunnlagskrav: Krav[] = [];
  for (const h of lesJournal(foer, kjerne.format))
    if (h.art === 'dokument')
      grunnlagskrav.push(...h.dokument.krav.filter((k) => k.spor === 'grunnlag'));
  for (const s of (rad.data.svar ?? []) as Data[]) {
    // Kategorien gjelder bare svaret på grunnlaget (§ 32.2, GR-U12).
    const krav = s.spor === 'grunnlag' ? grunnlagskrav.find((k) => k.id === s.gjelder) : null;
    s.beslutningsgrunnlag = frys(s, krav, kjerne);
  }
}
