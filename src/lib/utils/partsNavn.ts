/**
 * Maps a rolle code ('TE' | 'BH') to the actual party name,
 * falling back to generic labels if names are not available.
 */
export function getPartsNavn(
	rolle: 'TE' | 'BH',
	teNavn?: string,
	bhNavn?: string,
): string {
	if (rolle === 'TE') return teNavn ?? 'Totalentreprenør';
	return bhNavn ?? 'Byggherre';
}
