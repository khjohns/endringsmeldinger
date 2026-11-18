import { haerdet } from './format';
import { PARTENS, stor } from '#kjerne/frosset/brevdeler.ts';
import type { Part } from '#kjerne/typer.ts';
import type { Brevref } from '../lesing';
import { brevref, brevrefStor } from './felles';

/**
 * Skjemaet for TEs nye versjon av påberopelsen (BF-10).
 */
export const NYVERSJON = haerdet({
  tekst: 'Begrunnelse',
  /** Begrunnelsen kreves (oppdragsgiver 07.11, PR 1650). Knappen er aktiv (MM-U32). */
  manglerTekst: 'Skriv en begrunnelse for å gå videre.',
  /** Brevene TE bygger på, til høyre for utkastet. Ett er åpent om gangen. */
  tidligere: 'Tidligere brev om forholdet',
  brevrad: (b: Brevref & { avsender: Part }) =>
    `${brevrefStor(b)} · ${
      b.art === 'svar'
        ? `${stor(PARTENS[b.avsender])} svar`
        : b.art === 'krav'
          ? `${stor(PARTENS[b.avsender])} påberopelse`
          : stor(brevref(b))
    }`,
  utenTekst: 'Teksten i dette brevet står ikke her. Åpne det fra oversikten.',
  /**
   * Brevrelasjonene i brevkontrollen: rekkefølgen og henvisningen, ikke hva brevene sier i forhold
   * til hverandre, og uten eier på TEs eget brev (oppdragsgiver 07.11, PR 1650; språkfila).
   */
  forrigeBrev: 'Forrige brev',
  forrigeBrevet: (krav: Brevref) => `Påberopelsen i ${brevref(krav)}`,
  viserTilBrev: (svar: Brevref) => `Byggherrens svar i ${brevref(svar)}`,
  /** D-6 og 10d: en registrert enighet står (KA-U52 punkt 5). */
  enighet: (svar: Brevref) =>
    `Du godtok svaret i ${brevref(svar)}. Enigheten står, og det nye brevet avviker fra den.`,
  forkastTekst: 'Begrunnelsen du har skrevet i utkastet, slettes. Det kan ikke gjøres om.',
  /** Overskriften i sendepanelet (oppdragsgiver 07.11, PR 1650). */
  kontroller: 'Kontroller og send',
  sendTekst: 'Send til byggherren',
  tilbakeTil: 'utkastet',
  kanIkkeLages: 'Brevet kan ikke lages ennå.',
  kvittering: 'Brevet er sendt til byggherren.',
});
