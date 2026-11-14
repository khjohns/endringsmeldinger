/**
 * Det byggherrens svar på fristen leser av saken før svaret (G-4 i BF-20), gjennom lesepunktet.
 */

import { foresporselForFristsvar } from '$kjerne/spor/frist/utledning';
import type { Utledning } from '$kjerne/utledning/utled';

/**
 * Forespørselen etter punkt 33.6.2 svaret tar stilling til, eller `null` når svaret ikke har et
 * standpunkt til den (VS-U17, VS-U29), slik kjernen leser det.
 */
export const foresporselenISvaret = (u: Utledning) => foresporselForFristsvar(u);
