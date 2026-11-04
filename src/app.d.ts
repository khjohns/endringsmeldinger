// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    interface PageState {
      /** TE kommer til saken fra skjemaet for ny sak, og saken viser kvitteringen (#1414). */
      nySakSendt?: boolean;
    }
    // interface Platform {}
  }
}

export {};
