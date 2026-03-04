import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/svelte';
import { afterEach } from 'vitest';

// Polyfill Element.animate for jsdom (used by Svelte transitions)
if (typeof Element !== 'undefined' && !Element.prototype.animate) {
	Element.prototype.animate = function () {
		return { cancel: () => {}, finished: Promise.resolve(), onfinish: null } as unknown as Animation;
	};
}

afterEach(() => {
	cleanup();
});
