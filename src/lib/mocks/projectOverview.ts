import { SCENARIOS } from '$lib/mockup/scenarios';
import { HOVEDKATEGORI_FRA_KATALOGEN } from '$kjerne/format/koder';
import type { CaseListHendelse, Sakslinje } from '$lib/types/api';
import type { SakState } from '$lib/types/timeline';
import type { Aktivitetssak } from '$lib/components/saksoversikt/activity';
import { demoNoekkeltall } from './sakslinje';

export const demoScenarioIds = Object.fromEntries(
  SCENARIOS.map((scenario) => [scenario.sak.sak_id, scenario.id])
);

type Demospor = SakState['grunnlag'] | SakState['vederlag'] | SakState['frist'];

/** Sporet har et krav: det er sendt og ikke trukket eller utenfor saken. */
const harKrav = (spor: Demospor) =>
  spor.antall_versjoner > 0 && !['utkast', 'trukket', 'ikke_relevant'].includes(spor.status);
const enige = (spor: Demospor) =>
  harKrav(spor) && (spor.te_akseptert || spor.bh_resultat === 'godkjent');

/**
 * Demosakene oversatt til linja fra serveren (#1023). Demoen har Python-tilstanden,
 * så oversettelsen etterlikner det kjernen ville lest: et krav uten svar venter på
 * svar, et svar uten aksept står uten enighet, og et vederlags- eller fristsvar er
 * subsidiært når ansvaret er avslått (MM-U28, MM-U29).
 */
function demolinje(sak: SakState): Sakslinje {
  const { grunnlag, vederlag, frist } = sak;
  const avslaatt = grunnlag.bh_resultat === 'avslatt';
  const virkning = grunnlag.bh_resultat === 'godkjent' ? 'virksom' : 'betinget';
  const foreligger = (spor: Demospor, subsidiaert: boolean) => {
    const venter = harKrav(spor) && !spor.bh_resultat;
    const ikkeGodtatt = harKrav(spor) && !!spor.bh_resultat && !enige(spor);
    return {
      etiketter: [
        ...(venter ? ['venter_paa_svar'] : []),
        ...(subsidiaert && spor.bh_resultat && spor !== grunnlag ? ['subsidiaert'] : []),
        ...(enige(spor) ? [virkning === 'virksom' ? 'oppgjort' : 'enige_betinget'] : []),
        ...(spor.status === 'trukket' ? ['trukket'] : []),
      ],
      venter_paa_svar: venter,
      svar_ikke_godtatt: ikkeGodtatt,
    };
  };
  const resultat = <T extends string>(r: string | undefined) =>
    (r === 'avslatt' ? 'avslaatt' : r === 'hold_tilbake' ? 'tilbakeholdelse' : r) as T;
  const vederlagSvar = harKrav(vederlag) && vederlag.bh_resultat;
  const fristSvar = harKrav(frist) && frist.bh_resultat;
  const avgjort = [grunnlag, vederlag, frist].every((s) => !harKrav(s) || enige(s));
  return {
    sak_id: sak.sak_id,
    sakstype: 'standard',
    sakstittel: sak.sakstittel,
    opprettet: sak.opprettet ?? '',
    siste_hendelse: sak.siste_aktivitet ?? sak.opprettet ?? '',
    hovedkategori: HOVEDKATEGORI_FRA_KATALOGEN[String(grunnlag.hovedkategori)] ?? null,
    forstaatt: true,
    saksbetegnelse:
      grunnlag.status === 'trukket'
        ? 'grunnlaget_trukket'
        : avslaatt && grunnlag.te_akseptert
          ? 'avslaget_paa_grunnlaget_godtatt'
          : harKrav(grunnlag) && avgjort
            ? 'kravene_avgjort'
            : null,
    grunnlag: {
      ...foreligger(grunnlag, false),
      svar:
        harKrav(grunnlag) && grunnlag.bh_resultat
          ? { resultat: resultat(grunnlag.bh_resultat) }
          : null,
    },
    vederlag: {
      ...foreligger(vederlag, avslaatt),
      krav:
        harKrav(vederlag) && vederlag.krevd_belop != null
          ? { beloep: vederlag.krevd_belop, metode: 'tilbud' }
          : null,
      svar: vederlagSvar
        ? {
            resultat: resultat(vederlag.bh_resultat),
            beloep:
              (avslaatt ? vederlag.subsidiaer_godkjent_belop : null) ??
              vederlag.godkjent_belop ??
              0,
            subsidiaert: avslaatt,
          }
        : null,
      enighet: enige(vederlag) ? { beloep: vederlag.godkjent_belop ?? null, virkning } : null,
    },
    frist: {
      ...foreligger(frist, avslaatt),
      krav: harKrav(frist) && frist.krevd_dager != null ? { dager: frist.krevd_dager } : null,
      svar: fristSvar
        ? {
            resultat: resultat(frist.bh_resultat),
            dager: (avslaatt ? frist.subsidiaer_godkjent_dager : null) ?? frist.godkjent_dager ?? 0,
            subsidiaert: avslaatt,
          }
        : null,
      enighet: enige(frist) ? { dager: frist.godkjent_dager ?? null, virkning } : null,
    },
  };
}

/** Sakslisten og aktiviteten i demoen bruker de samme sakene som den redigerbare demoen. */
export const demoSakslinjer: Sakslinje[] = SCENARIOS.map(({ sak }) => demolinje(sak));
export const demoOversiktNoekkeltall = demoNoekkeltall(demoSakslinjer);

export const demoAktivitet: Aktivitetssak[] = SCENARIOS.map(({ sak, timeline }) => ({
  sak_id: sak.sak_id,
  sakstittel: sak.sakstittel,
  hendelser: timeline
    .filter((event) => event.spor && event.time)
    .map(
      (event): CaseListHendelse => ({
        type: event.spor === 'grunnlag' ? 'K' : event.spor === 'vederlag' ? 'V' : 'F',
        dato: event.time!,
        id: event.id,
        rolle: event.actorrole,
        label: event.summary ?? event.type,
      })
    ),
}));
