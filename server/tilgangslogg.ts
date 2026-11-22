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

export interface ForsoektIdentitet {
  subjekt: string;
  tenant?: string;
}

type Avvisning =
  | { hendelse: Innloggingshendelse; grunn: Innloggingsavvisning; identitet?: ForsoektIdentitet }
  | { hendelse: 'autorisasjon'; grunn: 'csrf' | 'kontraktsrolle' | 'tilgang_nektet' };

export async function loggAvvisning(pool: Pool, avvisning: Avvisning): Promise<void> {
  const { hendelse, grunn } = avvisning;
  const { aktor_id, prosjekt_id } = tilgangsfelter();
  const forsoekt = !aktor_id && 'identitet' in avvisning ? avvisning.identitet : undefined;
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
    loggFeil('Tilgangsavvisningen kunne ikke logges', feil);
  }
}
