# 08 — Revisjonsspor for tvisteløsning

> Event-sourced historikk transformeres til en saksfremstilling klar for advokat, oppmann eller domstol.

## Nåsituasjon

Backend er allerede event-sourced (CloudEvents v1.0). Frontend har:
- `HendelsesLogg` — kronologisk hendelsesliste per sak
- `SporkortHistorikk` — ekspanderbar revisjonslogg per spor
- `BegrunnelseThread` — versjonert begrunnelseshistorikk med partsnavn
- `HistorikkResponse` — revisjonsdata med versjonering, aktør-info, endringstyper

**Hva mangler:** Evnen til å *generere* en sammenhengende saksfremstilling fra disse dataene — et dokument som kan brukes utenfor systemet. I dag må advokaten manuelt rekonstruere kronologien fra individuelle hendelser.

---

## Designprinsipper

1. **Saksfremstillingen er et dokument, ikke en skjerm.** Den bruker prosa-fonten (IBM Plex Sans), har dokumenttittel, og leser som en juridisk redegjørelse. Det er et dokument du *skriver ut* — eller eksporterer som PDF.
2. **Bevisene forblir i systemet.** Saksfremstillingen *refererer* til hendelser og vedlegg — den er ikke en kopi. Hver påstand har en sporbar kilde (event-id, tidsstempel, aktør).
3. **Nøytral tone.** Fremstillingen presenterer fakta kronologisk. Den argumenterer ikke for noen part. Begge parters handlinger og begrunnelser gjengis likeverdig.

---

## Funksjon 1: Saksfremstilling (per sak)

### Tilgang

Ny knapp i saksmappen (`/[prosjektId]/[sakId]`) i sidebar, under «Dokumentasjon»-seksjonen:

```
DOKUMENTASJON
────────────────────────
[📋 Generer saksfremstilling →]
```

Knappen bruker standard aksjonsknappmønster (vekt-bg, vekt tekst, vekt border 30%). Åpner en ny rute: `/[prosjektId]/[sakId]/saksfremstilling`.

### Rute: `/[prosjektId]/[sakId]/saksfremstilling`

Full-bredde dokumentvisning. Ingen sidebar, ingen sporkort. Ren leseflate.

### Layout

```
┌────────────────────────────────────────────────────────────────┐
│ ← Tilbake til saksmappe                         [Eksporter ↓] │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐      │
│  │                                                      │      │
│  │  SAKSFREMSTILLING                                    │      │
│  │                                                      │      │
│  │  KOE-2024-047                                        │      │
│  │  Endrede grunnforhold ved akse C5–C8                  │      │
│  │                                                      │      │
│  │  Prosjekt: E6 Kvithammar–Åsen                        │      │
│  │  Totalentreprenør: Veidekke Entreprenør AS            │      │
│  │  Byggherre: Statens vegvesen                          │      │
│  │  Generert: 21. mars 2026                              │      │
│  │                                                      │      │
│  │  ──────────────────────────────────────────────────   │      │
│  │                                                      │      │
│  │  1. KONTRAKTSFORHOLD                                 │      │
│  │                                                      │      │
│  │  Saken gjelder uforutsette grunnforhold (§23.1)      │      │
│  │  ved akse C5–C8. Totalentreprenør varslet endring     │      │
│  │  15. november 2025 med hjemmel i §32.2.               │      │
│  │                                                      │      │
│  │  Hovedkategori: Svikt i BH ytelse                    │      │
│  │  Underkategori: Uforutsette grunnforhold              │      │
│  │  Hjemmel: §23.1                                      │      │
│  │                                                      │      │
│  │  2. KRONOLOGISK HENDELSESFORLØP                      │      │
│  │                                                      │      │
│  │  15.11.2025  GRUNNLAG VARSLET                        │      │
│  │  Totalentreprenør varslet byggherre om endrede        │      │
│  │  grunnforhold med hjemmel i §32.2. Varsel sendt       │      │
│  │  per e-post.                                          │      │
│  │  → Vedlegg: Geoteknisk tilleggsrapport (V-001)       │      │
│  │  → Kilde: hendelse #evt-2025-1115-001                │      │
│  │                                                      │      │
│  │  02.12.2025  GRUNNLAG DOKUMENTERT                    │      │
│  │  Totalentreprenør spesifiserte grunnlaget med         │      │
│  │  dokumentasjon av avvikende grunnforhold.              │      │
│  │  → Vedlegg: Borelogg akse C5–C8 (V-002)             │      │
│  │  → Kilde: hendelse #evt-2025-1202-001                │      │
│  │                                                      │      │
│  │  ...                                                  │      │
│  │                                                      │      │
│  │  3. VEDERLAGSKRAV                                    │      │
│  │                                                      │      │
│  │  ┌──────────────────────────────────────────┐        │      │
│  │  │ Metode         Regningsarbeid (§34.4)    │        │      │
│  │  │ Krevd          2 400 000 kr              │        │      │
│  │  │ Godkjent       —                         │        │      │
│  │  │ Omtvistet      2 400 000 kr              │        │      │
│  │  │ R&D tillegg    350 000 kr                │        │      │
│  │  │ Prod.tap       180 000 kr                │        │      │
│  │  └──────────────────────────────────────────┘        │      │
│  │                                                      │      │
│  │  4. FRISTFORLENGELSE                                 │      │
│  │                                                      │      │
│  │  Krevd: 45 dager                                     │      │
│  │  Godkjent: —                                          │      │
│  │  Hjemmel: §33.1 b)                                   │      │
│  │                                                      │      │
│  │  5. BEGRUNNELSER                                     │      │
│  │                                                      │      │
│  │  5.1 Totalentreprenørs begrunnelse                   │      │
│  │  (versjon 1, 15.11.2025)                             │      │
│  │  «Ved boring for pelefundament...»                   │      │
│  │                                                      │      │
│  │  5.2 Byggherrens standpunkt                          │      │
│  │  Ingen respons mottatt per 21. mars 2026.            │      │
│  │                                                      │      │
│  │  6. VEDLEGGSLISTE                                    │      │
│  │                                                      │      │
│  │  V-001  Geoteknisk tilleggsrapport     15.11.2025    │      │
│  │  V-002  Borelogg akse C5–C8            02.12.2025    │      │
│  │  V-003  Kostnadsoppstilling            08.01.2026    │      │
│  │                                                      │      │
│  │  7. STATUS                                           │      │
│  │                                                      │      │
│  │  Overordnet: Sendt                                   │      │
│  │  Grunnlag: Sendt (ubesvart)                          │      │
│  │  Vederlag: Sendt, rev. 1 (ubesvart)                  │      │
│  │  Frist: Spesifisert (ubesvart)                       │      │
│  │                                                      │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Typografi

- **Seksjonsoverskrifter** (1., 2., 3...): font-data 11px 600 uppercase 0.06em ink-muted. Med nummerering — juridisk konvensjon.
- **Brødtekst:** font-prose 14px 400 line-height 1.7 ink. Videre linjehøyde enn standard (1.6) fordi dette er et leseoptimert dokument.
- **Datoer i hendelsesforløp:** font-data 12px 500 ink. Venstremarg, fast bredde (80px).
- **Hendelsestype:** font-data 11px 600 uppercase ink-secondary. Etter dato.
- **Vedleggsreferanser:** font-data 12px ink-muted, med → prefix. Kobling til faktisk fil.
- **Kildereferanser:** font-data 10px ink-ghost. Event-ID for sporbarhet.
- **Beløpstabeller:** font-data 13px tabular-nums. Wire border, felt bg, sm radius.
- **Sitater (begrunnelser):** font-prose 13px 400 ink-secondary, indent 20px, border-left 2px wire.

### Dokumentbredde

Maks 720px sentrert. Print-optimert: `@media print` fjerner header, bruker A4-marginer.

```css
.dokument {
  max-width: 720px;
  margin: 0 auto;
  padding: 48px 32px;
  background: var(--color-felt);
  border: 1px solid var(--color-wire);
  border-radius: var(--radius-lg);
}

@media print {
  .dokument {
    max-width: none;
    border: none;
    padding: 0;
    background: white;
  }
  .dokument-header-bar { display: none; }
}
```

---

## Funksjon 2: Eksport

### Eksportknapp

Øverst til høyre i dokumentvisningen. Dropdown med to valg:

```
[Eksporter ↓]
  ┌──────────────────┐
  │ Skriv ut / PDF    │  ← window.print() med @media print
  │ Kopier som tekst  │  ← clipboard API, ren tekst
  └──────────────────┘
```

Dropdown: felt bg, wire-strong border, sm radius, 8px padding. Ingen skygge — konsistent med designsystemet.

**Skriv ut / PDF:** Bruker nettleserens print-dialog. `@media print` styler dokumentet for A4. Ingen ekstern PDF-generator nødvendig.

**Kopier som tekst:** Genererer en plaintext-versjon med markdown-lignende formattering. Nyttig for å lime inn i e-post eller Word.

---

## Funksjon 3: Porteføljefremstilling (alle saker)

### Tilgang

Ny knapp i OversiktSidebar, under «Nøkkeltall»-seksjonen:

```
[📋 Porteføljeoversikt →]
```

Åpner rute: `/[prosjektId]/portefolje`.

### Innhold

Samleoversikt over alle saker — *ikke* full saksfremstilling per sak, men en komprimert oppsummering egnet for prosjektmøter og sluttoppgjørsforhandlinger.

```
PORTEFØLJEOVERSIKT
E6 Kvithammar–Åsen
Generert: 21. mars 2026

────────────────────────────────────────

SAMMENDRAG

Antall saker:          12
Aktive:                 8
Avklarte:               4

Samlet krevd:    18 400 000 kr
Samlet godkjent:  6 200 000 kr
Samlet omtvistet: 12 200 000 kr
Godkjenningsgrad:       34%

Samlet fristforlengelse krevd:     145 dager
Samlet fristforlengelse godkjent:   60 dager

────────────────────────────────────────

SAKSOVERSIKT

Nr    Sak                              Status              Krevd         Godkjent      Omtvistet
───   ──────────────────────────────   ────────────────   ──────────   ──────────   ──────────
1     KOE-047 Grunnforhold C5–C8       Sendt              2 400 000            —     2 400 000
2     KOE-031 Forsinkede tegninger     Under behandling     850 000            —       850 000
3     KOE-019 Omlegging VA             Omforent           1 250 000    1 200 000        50 000
...

────────────────────────────────────────

FORDELING ETTER KONTRAKTSFORHOLD

ENDRING (5 saker)
  Krevd: 8 200 000 kr / Godkjent: 4 100 000 kr / Omtvistet: 4 100 000 kr

SVIKT (4 saker)
  Krevd: 7 600 000 kr / Godkjent: 1 800 000 kr / Omtvistet: 5 800 000 kr

ANDRE (2 saker)
  Krevd: 2 100 000 kr / Godkjent: 300 000 kr / Omtvistet: 1 800 000 kr

FORCE MAJEURE (1 sak)
  Fristforlengelse: 20 dager krevd / 0 godkjent

────────────────────────────────────────

PREKLUSJONSRISIKO

3 saker har frister som utløper innen 14 dager:
  KOE-047  Spesifisering vederlag (§34.2)     7 dager igjen
  KOE-082  Varsel fristforlengelse (§33.4)     3 dager igjen
  KOE-091  Svar på BH avslag (§33.8)          12 dager igjen
```

### Typografi og layout

Samme dokumentmønster som saksfremstillingen (720px sentrert, felt bg, wire border). Men tabellene bruker font-data gjennomgående — dette er en oppslagstabell, ikke narrativ prosa.

**Sakstabellen:** Full bredde, font-data 12px, tabular-nums for alle tall. Sticky header. Sortert etter urgency (default) eller sak-id. Beløp høyreforankret. Omtvistet i vekt-farge.

---

## Funksjon 4: Hendelseslogg med kildesporbarhet

### Konsept

Utvider eksisterende `HendelsesLogg`-komponent med en «kilde»-kolonne som viser event-ID og tidsstempel med sekundpresisjon. Synlig via toggle — skjult som standard.

### Interaksjon

```
HENDELSESLOGG
────────────────────────────────────────────────
[Vis kilder ◻]

15.11.2025  Grunnlag varslet          Veidekke Entreprenør AS
02.12.2025  Grunnlag dokumentert      Veidekke Entreprenør AS
```

Med «Vis kilder» aktivert:

```
HENDELSESLOGG
────────────────────────────────────────────────
[Vis kilder ☑]

15.11.2025 09:14:33  Grunnlag varslet     Veidekke Entreprenør AS
                     evt-2025-1115-001    via e-post

02.12.2025 14:02:11  Grunnlag dokumentert Veidekke Entreprenør AS
                     evt-2025-1202-001    via system
```

**Kilde-linje:** font-data 10px ink-ghost. Vises som undertekst under hendelsen. Event-ID + kanal.

### Teknisk

Krever at CloudEvents i backend inkluderer `id` (allerede i spec) og at frontend-typen `TimelineEvent` eksponerer det. Kanalen (e-post/system/brev) kan legges til som extension attribute i CloudEvents-formatet.

---

## Funksjon 5: Vedleggskatalog med bevisnummerering

### Konsept

Alle vedlegg i en sak nummereres sekvensielt (V-001, V-002, ...) og kobles til hendelsen de ble lastet opp i. Denne koblingen er grunnlaget for vedleggslisten i saksfremstillingen.

### Datamodell (utvidelse)

```typescript
interface VedleggMedBevisref {
  bevisref: string;           // "V-001", auto-generert
  fil: AttachmentFile;        // eksisterende type
  hendelse_id: string;        // CloudEvent.id som vedlegget hører til
  hendelse_type: string;      // "GRUNNLAG_VARSLET" etc.
  opplastet_dato: string;     // ISO-dato
  opplastet_av: string;       // partsnavn
}
```

### Visning i saksmappen

I «Filer»-fanen i BegrunnelseThread, utvides hver fil med bevisref:

```
V-001  Geoteknisk tilleggsrapport.pdf     1.2 MB    15.11.2025
V-002  Borelogg akse C5–C8.xlsx           340 KB    02.12.2025
V-003  Kostnadsoppstilling.pdf            890 KB    08.01.2026
```

Bevisref i font-data 11px 500 ink-muted. Filnavn i font-ui 12px 500 ink. Størrelse og dato i font-data 11px ink-muted.

---

## Komponentstruktur

```
src/routes/
├── [prosjektId]/
│   ├── portefolje/
│   │   └── +page.svelte              # NY — porteføljefremstilling
│   └── [sakId]/
│       └── saksfremstilling/
│           └── +page.svelte          # NY — saksfremstilling

src/lib/components/
├── dokument/
│   ├── Saksfremstilling.svelte       # NY — hovedkomponent for saksfremstilling
│   ├── Portefoljeoversikt.svelte     # NY — porteføljedokument
│   ├── DokumentHeader.svelte         # NY — tittel, parter, dato
│   ├── HendelsesSection.svelte       # NY — kronologisk hendelsesforløp
│   ├── KravSection.svelte            # NY — vederlag/frist-tabell
│   ├── BegrunnelseSection.svelte     # NY — partenes begrunnelser
│   ├── VedleggsSection.svelte        # NY — nummerert vedleggsliste
│   └── EksportDropdown.svelte        # NY — eksport-meny
├── saksmappe/
│   └── HendelsesLogg.svelte          # ENDRET — kildesporbarhet-toggle
└── shared/
    └── DokumentShell.svelte          # NY — 720px sentrert dokumentramme

src/lib/domain/
└── saksfremstilling.ts               # NY — genererer strukturert fremstilling fra events
```

### Domenelogikk: `saksfremstilling.ts`

```typescript
interface Saksfremstilling {
  meta: {
    sakId: string;
    tittel: string;
    prosjekt: string;
    te: string;
    bh: string;
    genererttDato: string;
  };
  kontraktsforhold: {
    hovedkategori: string;
    underkategori: string;
    hjemmel: string;
    beskrivelse: string;
  };
  hendelser: FremstillingsHendelse[];
  vederlag: VederlagOppsummering | null;
  frist: FristOppsummering | null;
  begrunnelser: BegrunnelseVersjon[];
  vedlegg: VedleggMedBevisref[];
  status: StatusOppsummering;
}

interface FremstillingsHendelse {
  dato: string;
  type: string;              // menneskelig label
  typeKode: string;          // event type enum
  aktor: string;             // partsnavn
  beskrivelse: string;       // generert fra event-data
  vedlegg: string[];         // bevisref-er (V-001, V-002)
  kildeId: string;           // CloudEvent.id
}

function genererSaksfremstilling(
  state: CaseState,
  timeline: TimelineEvent[],
  historikk: HistorikkResponse,
  kontraktsinnstillinger: ContractSettings
): Saksfremstilling
```

Funksjonen er **ren** — ingen side-effekter, ingen API-kall. Tar inn eksisterende data og produserer en strukturert fremstilling. Komponentene rendrer denne strukturen til HTML.

---

## Hva dette IKKE er

- **Ikke en template-editor.** Brukeren redigerer ikke saksfremstillingen. Den genereres automatisk fra data. Redigering skjer i saksmappen — fremstillingen reflekterer.
- **Ikke en juridisk analyse.** Fremstillingen presenterer fakta. Den trekker ingen konklusjoner om partenes rettigheter.
- **Ikke en erstatning for advokat.** Dokumentet er et arbeidsverktøy — et utgangspunkt for juridisk rådgivning, ikke et ferdig prosesskriv.
- **Ingen ny backend.** Alt genereres fra eksisterende data (state + timeline + historikk). Eneste backend-endring: event-ID og kanal eksponeres i API-responsen.
- **Ingen tredjepartsavhengigheter.** PDF via nettleserens print-dialog. Ingen wkhtmltopdf, puppeteer eller lignende.
