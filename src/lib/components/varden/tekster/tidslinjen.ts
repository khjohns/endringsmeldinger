import type { Part, Spor } from '#kjerne/typer.ts';
import type { Brevet, Brevref } from '../lesing';
import { FORHOLDET } from './forholdet';
import { KRAVET, SAKSDELEN, brevref, brevrefStor, brevtittel } from './felles';
import { dato, haerdet } from './format';
import { KRAVSKJEMA } from './kravskjema';

export const TIDSLINJE = haerdet({
  tittel: 'Tidslinje',
  oppfoeringer: (n: number) => `${n} ${n === 1 ? 'oppføring' : 'oppføringer'}`,
  oppgitt: (part: Part, b: Brevref) => `Oppgitt av ${part} i ${brevref(b)}`,
  /** Hva brevet gjør, kort, som i prototypen `grunnlagsoversikt.html`: «Krav om fristforlengelse». */
  hva: (b: Pick<Brevet, 'art' | 'spor' | 'avsender' | 'brevtittel' | 'varselhjemler'>) => {
    const spor = (['forhold', 'vederlag', 'frist'] as const).filter((s) => b.spor.includes(s));
    const om = (navn: Record<Spor, string>) => spor.map((s) => navn[s]).join(' og ');
    if (b.art === 'registrert') return FORHOLDET.registrertTittel(b.avsender);
    if (b.art === 'krav' && spor.length)
      return spor.includes('forhold') ? 'Påberopelse av forholdet' : `Krav om ${om(KRAVET)}`;
    if (b.art === 'svar' && spor.length) return `Svar på ${om(SAKSDELEN)}`;
    if (b.art === 'trekk' && spor.length)
      return spor.includes('forhold') ? 'Trekk av påberopelsen' : `Trekk av ${om(SAKSDELEN)}`;
    if (b.art === 'aksept' && spor.length) return `Godtar svaret på ${om(SAKSDELEN)}`;
    if (b.art === 'innsigelse') return 'Innsigelse';
    // Brevet med varselet har ingen frossen tittel (BF-45 U-8). Et brev med ett varsel fra
    // kravskjemaet heter som varselet der (prototype v4, #2360).
    const [h, ...flere] = b.varselhjemler;
    if (b.art === 'varsel' && h && !flere.length && KRAVSKJEMA.varselnavn[h])
      return KRAVSKJEMA.varselnavn[h];
    if (b.art === 'varsel' && spor.length) return `Varsel om ${om(KRAVET)}`;
    return brevtittel(b);
  },
  sendt: (part: Part, b: Brevref) => `${brevrefStor(b)} sendt av ${part}`,
  registrert: (part: Part, lagtTil: string) => `Sendt ifølge ${part}, lagt til ${dato(lagtTil)}`,
  tom: 'Ingen datoer eller brev ennå.',
  fristene: 'Fristene i kontrakten',
});
