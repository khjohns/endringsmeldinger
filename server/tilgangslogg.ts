import { sql, utenKontekst, type Pool } from './datalag.ts';
import { korrelasjonsId, loggFeil, tilgangsfelter } from './logg.ts';

export type Innloggingshendelse = 'innlogging_catenda' | 'innlogging_entra';

export type Innloggingsavvisning =
  | 'utilgjengelig'
  | 'ugyldig_forsoek'
  | 'leverandoer_avviste'
  | 'kode_mangler'
  | 'identitet_eller_medlemskap'
  | 'sesjon_feilet';

export interface ForsoktIdentitet {
  subjekt: string;
  tenant?: string;
}

type Avvisning =
  | { hendelse: Innloggingshendelse; grunn: Innloggingsavvisning; identitet?: ForsoktIdentitet }
  | { hendelse: 'autorisasjon'; grunn: 'csrf' | 'kontraktsrolle' | 'tilgang_nektet' };

export async function loggAvvisning(pool: Pool, avvisning: Avvisning): Promise<void> {
  const { hendelse, grunn } = avvisning;
  const { aktor_id, prosjekt_id } = tilgangsfelter();
  const forsokt = !aktor_id && 'identitet' in avvisning ? avvisning.identitet : undefined;
  try {
    await utenKontekst(pool)
      .input('hendelse', sql.VarChar(40), hendelse)
      .input('korrelasjon', sql.UniqueIdentifier, korrelasjonsId() ?? null)
      .input('grunn', sql.VarChar(40), grunn)
      .input('aktor', sql.UniqueIdentifier, aktor_id ?? null)
      .input('prosjekt', sql.NVarChar(100), prosjekt_id ?? null)
      .input('forsokt_subjekt', sql.UniqueIdentifier, forsokt?.subjekt ?? null)
      .input('forsokt_tenant', sql.UniqueIdentifier, forsokt?.tenant ?? null)
      .execute('koe_api.logg_tilgang');
  } catch (feil) {
    loggFeil('Tilgangsavvisningen kunne ikke logges', feil);
  }
}
