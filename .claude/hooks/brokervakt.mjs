#!/usr/bin/env node
// PreToolUse-hook for alle økter (#806): avviser skriving i token-brokeren, i hookoppsettet
// som verner den, og Bash-kommandoer som nevner brokeren eller wrangler. «ask» ble besvart
// automatisk i auto-modus, så vakten avviser. Oppdragsgiver låser opp ved å starte økta med
// BROKERVAKT_AV=1. Vakten leser miljøet til Claude, ikke til kommandoen. Hva den ikke
// fanger, står i verktoy/catenda-broker/README.md.
import { readFileSync } from 'node:fs';
import path from 'node:path';

const SKRIVEVERKTOY = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit'];

const VERNET_FIL =
  /(^|\/)(verktoy\/catenda-broker(\/|$)|\.claude\/(settings(\.local)?\.json|hooks\/brokervakt\.mjs)$)/;
const VERNET_I_BASH = /catenda-broker|brokervakt|wrangler|settings(\.local)?\.json/;

function avvis(grunn) {
  process.stderr.write(
    `${grunn} Token-brokeren og vernet rundt den endres bare med godkjenning fra ` +
      'oppdragsgiver, som starter økta med BROKERVAKT_AV=1 (#806).\n'
  );
  process.exit(2);
}

if (process.env.BROKERVAKT_AV === '1') process.exit(0);

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  avvis('Brokervakten kunne ikke lese kallet.');
}

const { tool_name: verktoy, tool_input: inn = {}, cwd = process.cwd() } = input;

if (SKRIVEVERKTOY.includes(verktoy)) {
  const fil = inn.file_path ?? inn.notebook_path ?? '';
  if (VERNET_FIL.test(path.resolve(cwd, fil).split(path.sep).join('/')))
    avvis(`Skriving i ${fil} er sperret.`);
} else if (verktoy === 'Bash' && VERNET_I_BASH.test(inn.command ?? '')) {
  avvis('Kommandoen nevner brokeren, wrangler eller hookoppsettet.');
}
