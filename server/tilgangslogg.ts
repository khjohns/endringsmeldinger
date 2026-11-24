import { sql, utenKontekst, type Pool } from './datalag.ts';
import { korrelasjonsId, loggAdvarsel, loggFeil, tilgangsfelter } from './logg.ts';

export type Innloggingshendelse = 'innlogging_catenda' | 'innlogging_entra';

export type Innloggingsavvisning =
  | 'utilgjengelig'
  | 'ugyldig_forsoek'
  | 'leverandoer_avviste'
  | 'kode_mangler'
  | 'identitet_eller_medlemskap'
  | 'sesjon_feilet';

export interface ForsoektIdentitet {
  subjekt: string;
  tenant?: string;
}

type Avvisning =
  | { hendelse: Innloggingshendelse; grunn: Innloggingsavvisning; identitet?: ForsoektIdentitet }
  | { hendelse: 'autorisasjon'; grunn: 'csrf' | 'kontraktsrolle' | 'tilgang_nektet' };

/**
 * Struping av avvisningene uten aktør og uten forsøkt identitet, som hvem som helst kan
 * utløse uten innlogging: høyst én rad per server, hendelse, grunn og minutt (#2251).
 * Antallet som ikke ble skrevet, går til driftsloggen med den neste raden som skrives
 * for samme hendelse og grunn.
 */
export interface Struping {
  /** Serveren strupingen gjelder for, så hver server har sin egen telling. */
  eier: object;
  naa: Date;
}

const strupet = new WeakMap<object, Map<string, { minutt: number; utelatt: number }>>();

/** Om avvisningen skal skrives, etter strupingen. */
function slipperGjennom({ eier, naa }: Struping, hendelse: string, grunn: string): boolean {
  let perGrunn = strupet.get(eier);
  if (!perGrunn) strupet.set(eier, (perGrunn = new Map()));
  const noekkel = `${hendelse}:${grunn}`;
  const minutt = Math.floor(naa.getTime() / 60_000);
  const sist = perGrunn.get(noekkel);
  if (sist?.minutt === minutt) {
    sist.utelatt++;
    return false;
  }
  if (sist?.utelatt)
    loggAdvarsel('Avvisninger uten sesjon ble ikke skrevet i tilgangsloggen', {
      antall: sist.utelatt,
      utfall: noekkel,
    });
  perGrunn.set(noekkel, { minutt, utelatt: 0 });
  return true;
}

export async function loggAvvisning(
  pool: Pool,
  avvisning: Avvisning,
  struping?: Struping
): Promise<void> {
  const { hendelse, grunn } = avvisning;
  const { aktor_id, prosjekt_id } = tilgangsfelter();
  const forsoekt = !aktor_id && 'identitet' in avvisning ? avvisning.identitet : undefined;
  const strupes = struping && !aktor_id && !forsoekt;
  if (strupes && !slipperGjennom(struping, hendelse, grunn)) return;
  try {
    await utenKontekst(pool)
      .input('hendelse', sql.VarChar(40), hendelse)
      .input('korrelasjon', sql.UniqueIdentifier, korrelasjonsId() ?? null)
      .input('grunn', sql.VarChar(40), grunn)
      .input('aktor', sql.UniqueIdentifier, aktor_id ?? null)
      .input('prosjekt', sql.NVarChar(100), prosjekt_id ?? null)
      .input('forsoekt_subjekt', sql.UniqueIdentifier, forsoekt?.subjekt ?? null)
      .input('forsoekt_tenant', sql.UniqueIdentifier, forsoekt?.tenant ?? null)
      .execute('koe_api.logg_tilgang');
  } catch (feil) {
    // Raden ble ikke skrevet, så minuttets plass er ledig for neste avvisning med samme grunn.
    if (strupes) strupet.get(struping.eier)?.delete(`${hendelse}:${grunn}`);
    loggFeil('Tilgangsavvisningen kunne ikke logges', feil, 'error', {
      utfall: `${hendelse}:${grunn}`,
    });
  }
}
