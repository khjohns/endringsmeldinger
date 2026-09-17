One-line: the sticky right-hand panel that holds authority (prokura), the sequential approval chain and the send action — replacing the "brev og godkjenning" modal.

```jsx
const actors = [
  { name: 'Kari Hansen', role: 'Prosjektleder · deg', limit: 200000 },
  { name: 'Ola Nilsen', role: 'Prosjektdirektør', limit: 500000 },
  { name: 'Anne Berg', role: 'Avdelingsleder', limit: 3000000 },
];
const { requiresApproval, decider, route } = ApprovalPanel.resolveRoute({ amount: 2930000, actors });

<ApprovalPanel
  eyebrow={requiresApproval ? 'Krever godkjenning' : 'Klar for sending'}
  title={requiresApproval ? `${decider.role} må godkjenne` : 'Du kan sende selv'}
  description={<>Samlet standpunkt <b>2 930 000 kr</b> overstiger din fullmakt. Svaret går sekvensielt gjennom fullmaktskjeden og sendes til entreprenøren når siste godkjenner har signert.</>}
  figures={[
    { label: 'Høyeste samlede standpunkt', value: '2 930 000 kr', over: requiresApproval },
    { label: 'Din fullmakt · Prosjektleder', value: '200 000 kr' },
  ]}
  calculation={{ summaryLabel: 'Se beregning · fullmaktsmatrise januar 2026', rows: [
    { label: 'Prinsipalt standpunkt', value: '0 kr' },
    { label: 'Subsidiært standpunkt', value: '2 930 000 kr' },
  ], note: 'Høyeste samlede standpunkt legges til grunn. Alternative standpunkter summeres ikke.' }}
  chain={requiresApproval ? route : undefined}
  content={{ label: 'Innhold:', value: 'Økonomi · 1 vurdering', actionLabel: 'Endre', onAction: backToStep1 }}
  confirmLabel="Jeg har kontrollert brevet og vedleggene."
  confirmed={confirmed} onConfirmChange={setConfirmed}
  primaryLabel={requiresApproval ? 'Send til godkjenning' : 'Send svar'}
  primaryIcon={<i data-lucide="send"></i>}
  onPrimary={send}
  secondaryLabel="Se PDF"
  footnote="Entreprenøren får tilgang først etter siste godkjenning."
/>
```

Rules this panel encodes — keep them when porting:

- **No modal.** It sits in the page's right column as step 3 of the flow (`position: sticky`, pushed with the content), never in an overlay. Same placement on *svar på krav* and on *endringsordre*.
- **One anatomy, three states.** Inside authority → no chain, primary "Send svar". Above authority → chain + "Send til godkjenning". After sending → same panel, `state: 'done' | 'active' | 'waiting'` on the chain, no confirm box, tertiary "Trekk fra godkjenning".
- **The chain is derived, never picked.** Use `ApprovalPanel.resolveRoute`; it returns only the links the amount requires and marks the one who decides (`decider`). Handle `exceedsAllAuthority` explicitly — do not silently send to the highest limit.
- **Authority sits next to the button**, and the calculation stays collapsed behind one line. Everything else the old modal carried (which assessments are included, sendings in the case, attachments) belongs to the editing step, the case page and the document.
- **The footnote states the consequence** for the counterparty and what gets locked — one sentence, at the button.
- Figures are pre-formatted `nb-NO` strings (`toLocaleString('nb-NO')` + ` kr`); `resolveRoute` formats `metaLabel` for you.
