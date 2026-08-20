import { useState, useEffect, useRef } from "react";
import {
  FileText, DollarSign, Shield, ChevronRight, Eye,
  Paperclip, ScrollText, History, AlertTriangle, X,
  ArrowRightLeft, ChevronDown, ChevronUp, Scale, Clock, Building2, HardHat,
  Layers, MessageSquare, Lock, ExternalLink, BookOpen, Pencil, Sun, Moon,
  Diamond, Banknote, ArrowLeft
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════════════════════ */

const CASE = {
  project: "Kystveien Vest",
  id: "KOE-104",
  title: "Uforutsette grunnforhold: Fjell i byggegrop akse 1–3",
  te: { name: "Byggnor", role: "TE" },
  bh: { name: "Kystveien Eiendom", role: "BH" },
  status: "Venter på TE",
  statusDetail: "BH har svart, TE vurderer",
};

const TRACKS = [
  {
    id: "ansvar", label: "Ansvarsgrunnlag", icon: Scale, type: "binary",
    te: { position: "Svikt", ref: "§ 23.1", argument: "Massivt fjell i akse 1–3 på kote +2,8 fremkommer ikke av geoteknisk rapport rev. B (datert 14.02.2023). Rapportens boreprogram omfatter totalt seks punkter langs traseen, men ingen av disse er plassert i det aktuelle området mellom akse 1 og akse 3. Nærmeste borepunkt (BH-04) ligger 38 meter sørvest, og viser løsmassedybde på 6,2 meter — vesentlig dypere enn det som faktisk forelå.\n\nTE har etter § 23.1 rett til å legge til grunn at forholdene er som beskrevet i kontraktsgrunnlaget. Geoteknisk rapport er en del av dette grunnlaget, jf. kontraktens pkt. 2.1 litra c. Når rapporten ikke dekker det aktuelle området, og interpolerte verdier avviker vesentlig fra faktiske forhold, utgjør dette en svikt i byggherrens opplysninger." },
    bh: { position: "Avvist", ref: "§ 23.1 (2)", status: "bestridt", argument: "Forbeholdet i konkurransegrunnlagets pkt. 4.2 angir eksplisitt en toleranse på ±2 meter for antatt bergkote i hele prosjektområdet. Påtruffet fjell på kote +2,8 ligger innenfor denne toleransen sett opp mot interpolert bergkote på +1,4 (avvik: 1,4 meter). TE har akseptert dette forbeholdet ved kontraktsinngåelse uten å ta forbehold i tilbudet.\n\nVidere påpeker BH at TE under befaringen 22.01.2023 ble gjort oppmerksom på usikkerheten i grunnforholdene i den nordlige delen av traseen. Referatet fra befaringen dokumenterer at dette ble drøftet. TE stilte ingen oppfølgingsspørsmål og tok ingen forbehold." },
  },
  {
    id: "vederlag", label: "Vederlag", icon: Banknote, type: "numeric", unit: "kr",
    te: { position: 450000, ref: "§ 34.1 / § 34.4", argument: "Kravet er spesifisert som regningsarbeid iht. § 34.4 med følgende poster:\n\n1. Pigging med ekstern borerigg: 285 000 kr. TEs egen borerigg (Atlas Copco ROC D7) var ikke dimensjonert for den aktuelle fjellkvaliteten (gneis med trykkfasthet >180 MPa). Det ble nødvendig å leie inn ekstern borerigg fra Brødrene Myhre AS med operatør.\n\n2. Ekstra masseflytting: 87 000 kr. Fjellmassene krevde separat håndtering grunnet sulfidholdig gneis. Transport til godkjent mottak, 22 km fra anleggsområdet.\n\n3. Rigg og drift: 48 000 kr. Dagmulkt-fri forlengelse av riggperiode i 10 arbeidsdager.\n\n4. Prosjektledelse og administrasjon: 30 000 kr. Ekstra koordinering, oppdatering av fremdriftsplan, varsling og dokumentasjon." },
    bh: { position: 300000, ref: "§ 34.1", status: "subsidiært", subsidiary: true, argument: "Post 1 aksepteres ikke fullt ut. TE hadde tilgjengelig borerigg på prosjektet, og det er ikke dokumentert at denne var utilstrekkelig. Eksternt utstyr (150 000 kr av posten) avvises. Øvrige poster aksepteres betinget av at ansvarsgrunnlag foreligger." },
    gap: { subsidiary: 150000, principal: 450000 },
  },
  {
    id: "frist", label: "Fristforlengelse", icon: Clock, type: "numeric", unit: "dager",
    te: { position: 14, ref: "§ 33.1", argument: "Pigging og masseflytting i akse 1–3 medførte full stans i 10 arbeidsdager. Etterfølgende tilpasning av armeringsplan og forskaling tok ytterligere 4 dager. Kritisk linje ble forskjøvet tilsvarende." },
    bh: { position: 7, ref: "§ 33.1", status: "subsidiært", subsidiary: true, argument: "BH aksepterer 7 dager for selve piggingen. Tilpasning av armeringsplan (4 dager) og delvis overlapp med masseflytting (3 dager) anses som parallelle aktiviteter. Subsidiært tilbud." },
    gap: { subsidiary: 7, principal: 14 },
  },
];

const PROVISIONS = [
  { ref: "§ 23.1", title: "Risiko for forhold ved grunnen", text: "Totalentreprenøren har risikoen for forhold ved grunnen med mindre forholdene avviker fra det totalentreprenøren hadde grunn til å regne med.", note: "Sentral bestemmelse for grunnforhold-tvister. Vurderingen er objektiv." },
  { ref: "§ 23.1 (2)", title: "Avvik innenfor angitt toleranse", text: "Dersom byggherren har angitt toleranser for grunnforhold, bærer totalentreprenøren risikoen for avvik innenfor toleransen.", note: "Forbeholdet i pkt. 4.2 om ±2m er et slikt toleranseforbehold." },
  { ref: "§ 34.1", title: "Retten til vederlagsjustering", text: "Har totalentreprenøren krav på vederlagsjustering, fastsettes vederlaget som utgangspunkt etter enhetspriser eller på grunnlag av avtalt regningsarbeidshonorar." },
  { ref: "§ 34.4", title: "Regningsarbeid", text: "Skal vederlaget fastsettes på grunnlag av regning, har totalentreprenøren krav på dekning av nødvendige kostnader med tillegg av avtalt eller sedvanlig påslag.", note: "TE har ført løpende timelister og materiallogg." },
  { ref: "§ 33.1", title: "Fristforlengelse ved endringer", text: "Totalentreprenøren har krav på fristforlengelse dersom fremdriften hindres som følge av forhold byggherren har risikoen for." },
];

const EVENTS = [
  { date: "14.04", time: "09:15", actor: "BH", text: "Bestrider ansvar. Subsidiær utmåling: 300 000 kr / 7 dager.", type: "response",
    snapshot: {
      ansvar: { status: "bestridt", te: { pos: "Svikt", ref: "§ 23.1", text: "Massivt fjell i akse 1–3 på kote +2,8 fremkommer ikke av geoteknisk rapport rev. B. Rapportens boreprogram dekker ikke aktuelt område. TE har etter § 23.1 rett til å legge til grunn at forholdene er som beskrevet." }, bh: { pos: "Avvist", ref: "§ 23.1 (2)", text: "Forbeholdet i pkt. 4.2 angir toleranse på ±2 meter. Påtruffet fjell ligger innenfor toleransen. TE har akseptert forbeholdet ved kontraktsinngåelse." } },
      vederlag: { status: "subsidiært", te: { pos: "450 000 kr", ref: "§ 34.1 / § 34.4", text: "Pigging med ekstern borerigg (285 000), ekstra masseflytting (87 000), rigg og drift (48 000) og prosjektledelse (30 000). Regningsarbeid iht. § 34.4." }, bh: { pos: "300 000 kr", ref: "§ 34.1", text: "Eksternt borerigg-utstyr (150 000) avvises. Øvrige poster aksepteres betinget av ansvarsgrunnlag." } },
      frist: { status: "subsidiært", te: { pos: "14 dager", ref: "§ 33.1", text: "Full stans i 10 arbeidsdager. Tilpasning av armeringsplan tok ytterligere 4 dager." }, bh: { pos: "7 dager", ref: "§ 33.1", text: "7 dager for pigging aksepteres. Tilpasning anses som parallelle aktiviteter." } },
    },
  },
  { date: "13.04", time: "15:42", actor: "TE", text: "Reviderer vederlagskrav 350 000 → 450 000 kr.", type: "revision",
    diff: { field: "vederlag", from: 350000, to: 450000, delta: "+100 000 kr",
      textChanges: [{ type: "added", text: "Mobilisering/demobilisering utgjør 45 000 kr. Riggkostnad dokumentert med tilbud fra to leverandører." }],
      prevText: "Pigging med borerigg utgjør 235 000 kr. TEs borerigg ble benyttet i 8 arbeidsdager. Ekstra masseflytting utgjør 67 000 kr til deponi 4 km unna.",
    },
    snapshot: {
      ansvar: { status: "venter", te: { pos: "Svikt", ref: "§ 23.1", text: "Massivt fjell i akse 1–3 fremkommer ikke av geoteknisk rapport rev. B." }, bh: null },
      vederlag: { status: "venter", te: { pos: "450 000 kr", ref: "§ 34.1 / § 34.4", text: "Pigging med ekstern borerigg (285 000), ekstra masseflytting (87 000), rigg og drift (48 000) og prosjektledelse (30 000). Revidert med mobilisering/demobilisering." }, bh: null },
      frist: { status: "venter", te: { pos: "14 dager", ref: "§ 33.1", text: "Full stans i 10 arbeidsdager. Tilpasning tok 4 dager." }, bh: null },
    },
  },
  { date: "12.04", time: "11:20", actor: "TE", text: "Fristspesifikasjon: 14 arbeidsdager.", type: "claim",
    snapshot: {
      ansvar: { status: "venter", te: { pos: "Svikt", ref: "§ 23.1", text: "Massivt fjell i akse 1–3 fremkommer ikke av geoteknisk rapport rev. B." }, bh: null },
      vederlag: { status: "venter", te: { pos: "350 000 kr", ref: "§ 34.1", text: "Pigging med borerigg, ekstra masseflytting, rigg og drift." }, bh: null },
      frist: { status: "venter", te: { pos: "14 dager", ref: "§ 33.1", text: "Full stans i 10 arbeidsdager. Tilpasning tok 4 dager." }, bh: null },
    },
  },
  { date: "12.04", time: "11:10", actor: "TE", text: "Vederlagskrav: 350 000 kr.", type: "claim",
    snapshot: {
      ansvar: { status: "venter", te: { pos: "Svikt", ref: "§ 23.1", text: "Massivt fjell fremkommer ikke av geoteknisk rapport." }, bh: null },
      vederlag: { status: "venter", te: { pos: "350 000 kr", ref: "§ 34.1", text: "Pigging med borerigg, ekstra masseflytting, rigg og drift." }, bh: null },
      frist: { status: null, te: null, bh: null },
    },
  },
  { date: "12.04", time: "11:00", actor: "TE", text: "Sak opprettet. Svikt iht. § 23.1.", type: "create",
    snapshot: {
      ansvar: { status: "venter", te: { pos: "Svikt", ref: "§ 23.1", text: "Massivt fjell i akse 1–3 på kote +2,8 fremkommer ikke av geoteknisk rapport rev. B." }, bh: null },
      vederlag: { status: null, te: null, bh: null },
      frist: { status: null, te: null, bh: null },
    },
  },
];

const ATTACHMENTS = [
  { name: "Geoteknisk rapport rev. B", pages: 42, type: "pdf" },
  { name: "Foto byggegrop 11.04", pages: null, type: "image" },
  { name: "Kostnadsoppstilling", pages: 3, type: "pdf" },
  { name: "Fremdriftsplan rev. 4", pages: 8, type: "pdf" },
];

const DRAFTS = {
  ansvar: { text: "Vi fastholder at forbeholdet i pkt. 4.2 er tilstrekkelig klart.", value: null },
  vederlag: { text: "Vurderer 280k — borerigg-argumentet har noe for seg.", value: 280000 },
};

/* ═══════════════════════════════════════════════════════════════════════════
   KINETIC NUMBER
   ═══════════════════════════════════════════════════════════════════════════ */

function KNum({ value, unit, dur = 550 }) {
  const [d, setD] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    const s = performance.now();
    const tick = (n) => {
      const p = Math.min((n - s) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setD(Math.round(value * e));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => raf.current && cancelAnimationFrame(raf.current);
  }, [value, dur]);
  if (unit === "kr") return <>{d.toLocaleString("nb-NO")} kr</>;
  return <>{d}{d === 1 ? " dag" : " dager"}</>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function Kontraktsbordet() {
  const [theme, setTheme] = useState("light");
  const [activeTrack, setActiveTrack] = useState(0);
  const [perspective, setPerspective] = useState("bh");
  const [rightTab, setRightTab] = useState("bestemmelser");
  const [showDraft, setShowDraft] = useState(false);
  const [expandedSide, setExpandedSide] = useState(null);
  const [activeEvent, setActiveEvent] = useState(null);
  const [showPrev, setShowPrev] = useState(false);

  const track = TRACKS[activeTrack];
  const isBH = perspective === "bh";
  const fmt = (v, u) => u === "kr" ? v.toLocaleString("nb-NO") + " kr" : v + (v === 1 ? " dag" : " dager");
  const gapPct = (t) => t.gap ? ((t.te.position - t.bh.position) / t.te.position) * 100 : 0;

  return (
    <div data-theme={theme} className="kb">

      {/* Header — gold accent stripe */}
      <div className="kb-gold-stripe" />
      <header className="kb-header">
        <div className="kb-header-left">
          <div className="kb-plate"><span>NS 8407</span></div>
          <div className="kb-header-meta">
            <span className="kb-project">{CASE.project}</span>
            <span className="kb-header-parties">
              {CASE.te.role}: {CASE.te.name} · {CASE.bh.role}: {CASE.bh.name}
            </span>
          </div>
        </div>
        <div className="kb-header-right">
          <div className="kb-perspective-toggle">
            {["te", "bh"].map(p => (
              <button key={p} className={`kb-persp ${perspective === p ? "kb-persp-on" : ""}`}
                onClick={() => setPerspective(p)}>
                {p === "te" ? <HardHat size={12} /> : <Building2 size={12} />}
                {p.toUpperCase()}
              </button>
            ))}
          </div>
          <button className="kb-theme-btn" onClick={() => setTheme(t => t === "light" ? "dark" : "light")}>
            {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
          </button>
        </div>
      </header>

      {/* Three panels */}
      <div className="kb-panels">

        {/* LEFT */}
        <aside className="kb-left">
          {/* Case anchor */}
          <div className="kb-case-anchor">
            <span className="kb-case-badge">{CASE.id}</span>
            <span className="kb-case-title">{CASE.title}</span>
          </div>

          {/* Track cards */}
          <div className="kb-tracks-label">Spor</div>
          {TRACKS.map((t, i) => {
            const Icon = t.icon;
            const active = i === activeTrack;
            const roman = ["I", "II", "III"][i];
            const hasDraft = isBH && DRAFTS[t.id];
            return (
              <button key={t.id}
                className={`kb-track ${active ? "kb-track-on" : ""}`}
                onClick={() => { setActiveTrack(i); setShowDraft(false); setExpandedSide(null); }}>
                <div className="kb-track-top">
                  <Icon size={13} className="kb-track-icon" />
                  <span className="kb-track-label">{roman}. {t.label}</span>
                  {hasDraft && <div className="kb-stamp kb-stamp-sm kb-stamp-draft">Kladd</div>}
                  {!hasDraft && (
                    <div className={`kb-stamp kb-stamp-sm ${t.bh.status === "bestridt" ? "kb-stamp-red" : "kb-stamp-green"}`}>
                      {t.bh.status}
                    </div>
                  )}
                </div>
                {t.type === "binary" ? (
                  <div className="kb-track-binary">
                    <span>{t.te.position}</span>
                    <ArrowRightLeft size={9} style={{ opacity: 0.2 }} />
                    <span className="kb-track-binary-bh">{t.bh.position}</span>
                  </div>
                ) : (
                  <div className="kb-track-numeric">
                    <div className="kb-track-krevd">Krevd: {fmt(t.te.position, t.unit)}</div>
                    {/* Dual bars */}
                    <div className="kb-track-dual-bar">
                      <span className="kb-track-bar-tag">subs.</span>
                      <div className="kb-track-bar-bg">
                        <div className="kb-track-bar-green" style={{ width: `${(t.bh.position / t.te.position) * 100}%` }} />
                      </div>
                      <span className="kb-track-bar-val">{fmt(t.bh.position, t.unit).replace(' kr', '').replace(' dager', '').replace(' dag', '')}</span>
                    </div>
                    <div className="kb-track-dual-bar">
                      <span className="kb-track-bar-tag">prins.</span>
                      <div className="kb-track-bar-bg">
                        <div className="kb-track-bar-red" style={{ width: "0%" }} />
                      </div>
                      <span className="kb-track-bar-val">0</span>
                    </div>
                    {/* GAP */}
                    <div className="kb-track-gap">
                      <span className="kb-track-gap-label">GAP</span>
                      <span className="kb-track-gap-vals">
                        s. {fmt(t.gap.subsidiary, t.unit)} &nbsp; p. {fmt(t.gap.principal, t.unit)}
                      </span>
                    </div>
                  </div>
                )}
              </button>
            );
          })}

          {/* Draft */}
          {isBH && DRAFTS[track.id] && (
            <div className="kb-draft">
              <button className="kb-draft-toggle" onClick={() => setShowDraft(!showDraft)}>
                <div className="kb-stamp kb-stamp-sm kb-stamp-draft">Kladd</div>
                <Pencil size={11} style={{ opacity: 0.5 }} />
                <span>Internt — ikke synlig for motpart</span>
                <ChevronDown size={11} style={{
                  transform: showDraft ? "rotate(180deg)" : "none",
                  transition: "transform 0.2s", marginLeft: "auto",
                }} />
              </button>
              {showDraft && (
                <div className="kb-draft-body">
                  <p className="kb-draft-text">{DRAFTS[track.id].text}</p>
                  {DRAFTS[track.id].value && (
                    <div className="kb-draft-value">Vurdert: {fmt(DRAFTS[track.id].value, track.unit)}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Samlet eksponering */}
          <div className="kb-exposure">
            <div className="kb-exposure-label">Samlet eksponering</div>
            <div className="kb-exposure-row">
              <span className="kb-exposure-tag">Subsidiært</span>
              <span className="kb-exposure-green">
                {fmt(TRACKS[1].gap.subsidiary, "kr")} + {TRACKS[2].gap.subsidiary}d
              </span>
            </div>
            <div className="kb-exposure-row">
              <span className="kb-exposure-tag">Prinsipalt</span>
              <span className="kb-exposure-red">
                {fmt(TRACKS[1].gap.principal, "kr")} + {TRACKS[2].gap.principal}d
              </span>
            </div>
          </div>
        </aside>

        {/* CENTER */}
        <main className="kb-center">
          {activeEvent ? (
            /* ── SNAPSHOT MODE ── */
            <div className="kb-snap">
              <div className="kb-snap-banner">
                <button className="kb-snap-back" onClick={() => { setActiveEvent(null); setShowPrev(false); }}>
                  <ArrowLeft size={13} /> Tilbake til nåtid
                </button>
                <div className="kb-snap-meta">
                  <History size={12} />
                  <span className="kb-snap-date">{activeEvent.date} kl. {activeEvent.time}</span>
                  <span className="kb-snap-label">{activeEvent.text}</span>
                </div>
              </div>
              {[
                { key: "ansvar", label: "I. Ansvar", icon: Scale },
                { key: "vederlag", label: "II. Vederlag", icon: Banknote },
                { key: "frist", label: "III. Frist", icon: Clock },
              ].map(({ key, label, icon: Icon }) => {
                const s = activeEvent.snapshot[key];
                const isDiff = activeEvent.type === "revision" && activeEvent.diff?.field === key;
                if (!s.status) return (
                  <div key={key} className="kb-snap-empty">
                    <Icon size={13} /> <span>{label}</span>
                    <span className="kb-snap-na">Ikke opprettet</span>
                  </div>
                );
                return (
                  <div key={key} className="kb-snap-track">
                    <div className="kb-snap-track-head">
                      <Icon size={13} />
                      <span className="kb-snap-track-label">{label}</span>
                      {s.status === "bestridt" && <div className="kb-stamp kb-stamp-sm kb-stamp-red">Bestridt</div>}
                      {s.status === "subsidiært" && <div className="kb-stamp kb-stamp-sm kb-stamp-green">Subsidiært</div>}
                      {s.status === "venter" && <div className="kb-stamp kb-stamp-sm kb-stamp-gold">Venter</div>}
                    </div>
                    {/* TE card */}
                    {s.te && (
                      <div className={`kb-card ${isDiff ? "kb-card-diffed" : ""}`}>
                        <div className="kb-sidebar kb-sidebar-te">
                          <HardHat size={12} />
                          <span className="kb-sidebar-name">{CASE.te.name}</span>
                          <div className="kb-sidebar-pos">{s.te.pos}</div>
                          <div className="kb-sidebar-ref">{s.te.ref}</div>
                        </div>
                        <div className="kb-prose">
                          {isDiff && (
                            <div className="kb-diff-header">
                              <span className="kb-diff-badge">Revidert</span>
                              <span className="kb-diff-from">{fmt(activeEvent.diff.from, "kr")}</span>
                              <span className="kb-diff-arrow">→</span>
                              <span className="kb-diff-to">{fmt(activeEvent.diff.to, "kr")}</span>
                              <span className="kb-diff-delta">{activeEvent.diff.delta}</span>
                            </div>
                          )}
                          <p className="kb-snap-text">{s.te.text}</p>
                          {isDiff && activeEvent.diff.textChanges?.map((c, ci) => (
                            <div key={ci} className="kb-diff-added">
                              <span className="kb-diff-marker">+</span>
                              <p>{c.text}</p>
                            </div>
                          ))}
                          {isDiff && (
                            <>
                              <button className="kb-diff-prev-btn" onClick={() => setShowPrev(!showPrev)}>
                                {showPrev ? "Skjul forrige versjon" : "Vis forrige versjon"}
                              </button>
                              {showPrev && (
                                <div className="kb-diff-prev">
                                  <div className="kb-diff-prev-label">Forrige ({fmt(activeEvent.diff.from, "kr")})</div>
                                  <p>{activeEvent.diff.prevText}</p>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    {/* BH card */}
                    {s.bh ? (
                      <div className={`kb-card ${s.status === "subsidiært" ? "kb-card-sub" : ""}`}>
                        <div className={`kb-sidebar ${s.status === "bestridt" ? "kb-sidebar-red" : "kb-sidebar-bh"}`}>
                          <Building2 size={12} />
                          <span className="kb-sidebar-name">{CASE.bh.name}</span>
                          <div className="kb-sidebar-pos">{s.bh.pos}</div>
                          <div className="kb-sidebar-ref">{s.bh.ref}</div>
                          {s.status === "bestridt" && <div className="kb-stamp kb-stamp-red">Bestridt</div>}
                        </div>
                        <div className="kb-prose">
                          <p className="kb-snap-text">{s.bh.text}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="kb-card kb-card-waiting">
                        <div className="kb-sidebar kb-sidebar-bh">
                          <Building2 size={12} />
                          <span className="kb-sidebar-name">{CASE.bh.name}</span>
                        </div>
                        <div className="kb-prose"><p className="kb-snap-na">Ikke besvart</p></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
          /* ── NORMAL MODE ── */
          <>
          <div className="kb-section-header">
            <h2 className="kb-section-title">{track.label}</h2>
            <div className={`kb-section-underline ${track.bh.subsidiary ? "kb-section-underline-green" : "kb-section-underline-gold"}`} />
            {track.type === "numeric" && track.gap && (
              <div className="kb-section-gap">
                Gap: <span className="kb-section-gap-val">
                  <KNum value={track.gap.subsidiary} unit={track.unit} key={track.id + "-gap"} />
                </span>
                <span className="kb-section-gap-tag">subsidiært</span>
              </div>
            )}
          </div>

          {/* Subsidiary notice */}
          {track.bh.subsidiary && (
            <div className="kb-sub-notice">
              <Diamond size={11} className="kb-sub-diamond" />
              <span>Ansvarsgrunnlaget er bestridt. BHs posisjon på dette sporet er subsidiær — betinget av at ansvar foreligger.</span>
            </div>
          )}

          {/* Dual document — bento layout */}
          <div className="kb-dual">
            {/* TE card */}
            <div className={`kb-card ${expandedSide === "bh" ? "kb-card-gone" : ""} ${expandedSide === "te" ? "kb-card-full" : ""}`}>
              <div className="kb-sidebar kb-sidebar-te">
                <HardHat size={13} />
                <span className="kb-sidebar-name">{CASE.te.name}</span>
                <div className="kb-sidebar-pos">
                  {track.type === "binary"
                    ? track.te.position
                    : <KNum value={track.te.position} unit={track.unit} key={track.id + "-te"} />
                  }
                </div>
                <div className="kb-sidebar-ref">{track.te.ref}</div>
              </div>
              <div className="kb-prose">
                {expandedSide === "te" ? (
                  <div className="kb-reading">
                    <p className="kb-reading-text">{track.te.argument}</p>
                    <button className="kb-back-btn" onClick={() => setExpandedSide(null)}>
                      <ChevronUp size={13} /> Tilbake til sammenligning
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="kb-truncated">
                      <p className="kb-arg-text">{track.te.argument}</p>
                    </div>
                    <button className="kb-read-btn" onClick={() => setExpandedSide("te")}>
                      <BookOpen size={12} /> Les hele begrunnelsen
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* BH card */}
            <div className={`kb-card ${expandedSide === "te" ? "kb-card-gone" : ""} ${expandedSide === "bh" ? "kb-card-full" : ""} ${track.bh.subsidiary && !expandedSide ? "kb-card-sub" : ""}`}>
              {track.bh.subsidiary && !expandedSide && <div className="kb-sub-diamond-marker"><Diamond size={9} fill="var(--green)" /></div>}
              <div className={`kb-sidebar ${track.bh.status === "bestridt" ? "kb-sidebar-red" : "kb-sidebar-bh"}`}>
                <Building2 size={13} />
                <span className="kb-sidebar-name">{CASE.bh.name}</span>
                <div className="kb-sidebar-pos">
                  {track.type === "binary"
                    ? track.bh.position
                    : <KNum value={track.bh.position} unit={track.unit} key={track.id + "-bh"} />
                  }
                </div>
                <div className="kb-sidebar-ref">{track.bh.ref}</div>
                {track.bh.status === "bestridt" && <div className="kb-stamp kb-stamp-red">Bestridt</div>}
              </div>
              <div className="kb-prose">
                {expandedSide === "bh" ? (
                  <div className="kb-reading">
                    <p className="kb-reading-text">{track.bh.argument}</p>
                    <button className="kb-back-btn" onClick={() => setExpandedSide(null)}>
                      <ChevronUp size={13} /> Tilbake til sammenligning
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="kb-truncated">
                      <p className="kb-arg-text">{track.bh.argument}</p>
                    </div>
                    <button className="kb-read-btn" onClick={() => setExpandedSide("bh")}>
                      <BookOpen size={12} /> Les hele begrunnelsen
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Gap viz */}
          {track.type === "numeric" && track.gap && !expandedSide && (
            <div className="kb-gap-viz">
              <span className="kb-gap-viz-label">Posisjonsoversikt</span>
              <div className="kb-gap-viz-bar">
                <div className="kb-gap-seg-ok" style={{ width: `${100 - gapPct(track)}%` }}>
                  BH: {fmt(track.bh.position, track.unit)}
                </div>
                <div className="kb-gap-seg-gap" style={{ width: `${gapPct(track)}%` }}>
                  Gap: {fmt(track.te.position - track.bh.position, track.unit)}
                </div>
              </div>
            </div>
          )}

          {/* Draft in center — below gap */}
          {isBH && DRAFTS[track.id] && !expandedSide && (
            <div className="kb-center-draft">
              <div className="kb-center-draft-head">
                <div className="kb-stamp kb-stamp-sm kb-stamp-draft">Kladd</div>
                <span className="kb-center-draft-label">Internt — ikke synlig for motpart</span>
                {DRAFTS[track.id].value && (
                  <span className="kb-center-draft-amount">{fmt(DRAFTS[track.id].value, track.unit)}</span>
                )}
              </div>
              <p className="kb-center-draft-text">{DRAFTS[track.id].text}</p>
            </div>
          )}
          </>
          )}
        </main>

        {/* RIGHT */}
        <aside className="kb-right">
          <div className="kb-right-tabs">
            {[
              { id: "bestemmelser", label: "Bestemmelser", icon: ScrollText },
              { id: "hendelser", label: "Historikk", icon: History },
              { id: "vedlegg", label: "Vedlegg", icon: Paperclip },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id}
                  className={`kb-tab ${rightTab === tab.id ? "kb-tab-on" : ""}`}
                  onClick={() => setRightTab(tab.id)}>
                  <Icon size={12} /> {tab.label}
                </button>
              );
            })}
          </div>
          <div className="kb-right-body">
            {rightTab === "bestemmelser" && PROVISIONS.map(p => (
              <div key={p.ref} className="kb-provision">
                <div className="kb-provision-ref">{p.ref}</div>
                <div className="kb-provision-title">{p.title}</div>
                <p className="kb-provision-text">{p.text}</p>
                {p.note && <p className="kb-provision-note">{p.note}</p>}
              </div>
            ))}
            {rightTab === "hendelser" && EVENTS.map((e, i) => (
              <button key={i} className={`kb-event ${activeEvent === e ? "kb-event-active" : ""}`}
                onClick={() => { setActiveEvent(e); setShowPrev(false); }}>
                <div className="kb-event-time">
                  <span className="kb-event-date">{e.date}</span>
                  <span className="kb-event-hour">{e.time}</span>
                </div>
                <div className="kb-event-line">
                  <div className={`kb-event-marker ${e.actor === "TE" ? "kb-event-te" : "kb-event-bh"}`}>{e.actor}</div>
                  {i < EVENTS.length - 1 && <div className="kb-event-connector" />}
                </div>
                <div className="kb-event-body">
                  <span className="kb-event-text">{e.text}</span>
                  {e.type === "revision" && <span className="kb-event-type-badge">Revisjon</span>}
                </div>
              </button>
            ))}
            {rightTab === "vedlegg" && ATTACHMENTS.map((a, i) => (
              <div key={i} className="kb-attach">
                <div className="kb-attach-icon">{a.type === "image" ? <Eye size={13} /> : <FileText size={13} />}</div>
                <div className="kb-attach-info">
                  <div className="kb-attach-name">{a.name}</div>
                  {a.pages && <div className="kb-attach-meta">{a.pages} sider</div>}
                </div>
                <ExternalLink size={11} style={{ opacity: 0.25 }} />
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* Action bar */}
      <footer className="kb-action">
        <div className="kb-action-status">
          <div className="kb-action-dot" />
          <span className="kb-stamp kb-stamp-gold">Venter</span>
          <span className="kb-action-detail">{CASE.statusDetail}</span>
        </div>
        <div className="kb-action-buttons">
          {isBH ? (
            <>
              <button className="kb-btn kb-btn-sec">Avvis alle spor</button>
              <button className="kb-btn kb-btn-pri">Send svar</button>
            </>
          ) : (
            <>
              <button className="kb-btn kb-btn-sec">Revider krav</button>
              <button className="kb-btn kb-btn-pri">Godta BHs posisjon</button>
            </>
          )}
        </div>
      </footer>

      {/* ═══════════════════════════════════════════════════════
          STYLES — system-v2 design language
          ═══════════════════════════════════════════════════════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;1,7..72,400&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');

        /* ── Light tokens ────────────────── */
        [data-theme="light"] {
          --canvas: #FEFDFB;
          --paper: #F5F3EE;
          --paper-in: #EFEDE7;
          --paper-sub: #F9F8F4;
          --plate: #1C1917;

          --ink: #1C1917;
          --ink-2: #4A4945;
          --ink-3: #6B6A66;
          --ink-4: #898780;

          --gold: #A98015;
          --gold-bg: #FFF8E8;
          --gold-border: #F0D880;
          --green: #034B45;
          --green-bg: #ECF5F3;
          --green-border: #A0CCC4;
          --red: #CC3030;
          --red-bg: #FFF0EE;

          --draft: #5A6048;
          --draft-bg: #F6F7F2;
          --draft-border: #C8CCB0;

          --edge: 1.5px solid #1C1917;
          --rule: 1px solid rgba(28,25,23,0.10);
          --rule-subtle: 1px solid rgba(28,25,23,0.06);

          --btn-shadow: 0 2px 6px rgba(28,25,23,0.15);
          --btn-shadow-hover: 0 4px 12px rgba(28,25,23,0.18);
        }

        /* ── Dark tokens ─────────────────── */
        [data-theme="dark"] {
          --canvas: #000000;
          --paper: #111110;
          --paper-in: #1A1918;
          --paper-sub: #141312;
          --plate: #000000;

          --ink: #F0EDE5;
          --ink-2: #B8B4A8;
          --ink-3: #878380;
          --ink-4: #6A6662;

          --gold: #F0C840;
          --gold-bg: #1E1A0E;
          --gold-border: #4A4018;
          --green: #50D0B8;
          --green-bg: #0E1E1A;
          --green-border: #183028;
          --red: #EA3E3E;
          --red-bg: #1E1010;

          --draft: #909080;
          --draft-bg: #141410;
          --draft-border: #2E2E24;

          --edge: 1.5px solid #2A2828;
          --rule: 1px solid rgba(240,237,229,0.06);
          --rule-subtle: 1px solid rgba(240,237,229,0.03);

          --btn-shadow: 0 0 12px rgba(240,200,64,0.2);
          --btn-shadow-hover: 0 0 20px rgba(240,200,64,0.3);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        button { cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; border: none; background: none; color: inherit; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--ink-4); border-radius: 3px; opacity: 0.3; }

        .kb {
          font-family: 'Plus Jakarta Sans', sans-serif;
          background: var(--canvas);
          color: var(--ink);
          min-height: 100vh;
          display: flex; flex-direction: column;
        }

        /* ── Gold stripe ─────────────────── */
        .kb-gold-stripe { height: 3px; background: var(--gold); flex-shrink: 0; }

        /* ── Header ──────────────────────── */
        .kb-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 24px;
          border-bottom: var(--edge);
          background: var(--canvas);
          flex-shrink: 0;
        }
        .kb-header-left { display: flex; align-items: center; gap: 12px; }
        .kb-plate {
          background: var(--plate); color: var(--gold);
          font-family: 'IBM Plex Mono', monospace; font-size: 10px; font-weight: 700;
          padding: 4px 10px; border-radius: 2px; letter-spacing: 0.04em;
        }
        .kb-header-meta { display: flex; flex-direction: column; }
        .kb-project { font-size: 14px; font-weight: 700; color: var(--ink); }
        .kb-header-parties { font-size: 11px; color: var(--ink-3); }
        .kb-header-right { display: flex; align-items: center; gap: 8px; }
        .kb-perspective-toggle {
          display: flex; border: var(--edge); border-radius: 4px; overflow: hidden;
        }
        .kb-persp {
          display: flex; align-items: center; gap: 5px;
          padding: 5px 12px; font-family: 'IBM Plex Mono', monospace;
          font-size: 11px; font-weight: 700; color: var(--ink-3);
          border-right: var(--edge);
          transition: all 0.1s ease;
        }
        .kb-persp:last-child { border-right: none; }
        .kb-persp-on { background: var(--paper); color: var(--ink); }
        .kb-theme-btn {
          width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          color: var(--ink-3); border: var(--rule); border-radius: 4px;
        }

        /* ── Panels ──────────────────────── */
        .kb-panels {
          display: grid; grid-template-columns: 286px 1fr 364px;
          flex: 1; overflow: hidden;
        }

        /* ── Left ────────────────────────── */
        .kb-left {
          border-right: var(--edge);
          padding: 16px;
          display: flex; flex-direction: column; gap: 8px;
          overflow-y: auto;
        }
        .kb-case-anchor {
          display: flex; align-items: baseline; gap: 8px;
          margin-bottom: 8px;
        }
        .kb-case-badge {
          background: var(--plate); color: var(--canvas);
          font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 700;
          padding: 2px 8px; border-radius: 2px;
        }
        .kb-case-title {
          font-family: 'Literata', serif; font-size: 13px; color: var(--ink-2);
          line-height: 1.35;
        }
        .kb-tracks-label {
          font-size: 11px; font-weight: 700; color: var(--ink-4);
          text-transform: uppercase; letter-spacing: 0.08em;
          padding: 4px 0;
        }

        .kb-track {
          display: flex; flex-direction: column; gap: 6px;
          padding: 10px 12px;
          background: transparent;
          border: var(--rule-subtle);
          border-left: 3px solid transparent;
          border-radius: 0 4px 4px 0;
          text-align: left;
          transition: all 0.15s ease;
        }
        .kb-track:hover { background: var(--paper-in); }
        .kb-track-on {
          background: var(--paper);
          border-left-color: var(--gold);
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
        .kb-track-top { display: flex; align-items: center; gap: 6px; }
        .kb-track-icon { color: var(--ink-3); }
        .kb-track-label { font-size: 13px; font-weight: 600; flex: 1; }
        .kb-track-binary {
          display: flex; align-items: center; gap: 6px; padding-left: 19px;
          font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 600;
          color: var(--ink-2);
        }
        .kb-track-binary-bh { color: var(--red); }
        .kb-track-numeric { padding-left: 19px; display: flex; flex-direction: column; gap: 4px; }
        .kb-track-krevd {
          font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 700;
          color: var(--ink);
        }
        .kb-track-dual-bar {
          display: grid; grid-template-columns: 32px 1fr 40px;
          align-items: center; gap: 4px;
        }
        .kb-track-bar-tag {
          font-family: 'IBM Plex Mono', monospace; font-size: 9px; font-weight: 600;
          color: var(--ink-4);
        }
        .kb-track-bar-bg {
          height: 3px; border-radius: 2px; background: var(--paper-in);
          overflow: hidden;
        }
        .kb-track-bar-green { height: 100%; background: var(--green); opacity: 0.6; border-radius: 2px; }
        .kb-track-bar-red { height: 100%; background: var(--red); opacity: 0.5; border-radius: 2px; }
        .kb-track-bar-val {
          font-family: 'IBM Plex Mono', monospace; font-size: 9px; font-weight: 600;
          color: var(--ink-3); text-align: right;
        }
        .kb-track-gap {
          display: flex; align-items: center; gap: 6px;
          padding: 3px 6px; margin-top: 2px;
          background: var(--paper-in); border-radius: 2px;
        }
        .kb-track-gap-label {
          font-family: 'IBM Plex Mono', monospace; font-size: 9px; font-weight: 700;
          color: var(--ink-4); letter-spacing: 0.04em;
        }
        .kb-track-gap-vals {
          font-family: 'IBM Plex Mono', monospace; font-size: 9px; font-weight: 600;
          color: var(--green);
        }

        /* ── Stamps ──────────────────────── */
        .kb-stamp {
          display: inline-flex; align-items: center; gap: 4px;
          font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700;
          font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
          padding: 3px 10px; border: 1.5px solid currentColor;
          border-radius: 4px; line-height: 1;
          box-shadow: 1px 1px 0 currentColor;
          transform: rotate(-0.5deg);
        }
        .kb-stamp-sm { font-size: 9px; padding: 2px 7px; border-width: 1px; box-shadow: 1px 1px 0 currentColor; }
        .kb-stamp-red { color: var(--red); background: var(--red-bg); }
        .kb-stamp-green { color: var(--green); background: var(--green-bg); }
        .kb-stamp-gold { color: var(--gold); background: var(--gold-bg); }
        .kb-stamp-draft {
          color: var(--draft); background: var(--draft-bg);
          border-style: dashed; box-shadow: none; transform: none;
        }

        /* ── Exposure ────────────────────── */
        .kb-exposure {
          margin-top: auto;
          padding: 12px; background: var(--paper); border: var(--rule);
          border-radius: 4px;
          display: flex; flex-direction: column; gap: 4px;
        }
        .kb-exposure-label {
          font-size: 10px; font-weight: 700; color: var(--ink-4);
          text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px;
        }
        .kb-exposure-row { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; }
        .kb-exposure-green {
          font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 700;
          color: var(--green);
        }
        .kb-exposure-red {
          font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 700;
          color: var(--red);
        }
        .kb-exposure-tag {
          font-size: 11px; font-weight: 600;
          color: var(--ink-2);
        }

        /* ── Draft ───────────────────────── */
        .kb-draft { margin-top: 8px; }
        .kb-draft-toggle {
          display: flex; align-items: center; gap: 6px;
          width: 100%; padding: 8px 10px;
          font-size: 11px; color: var(--draft);
          background: var(--draft-bg);
          border: 1.5px dashed var(--draft-border);
          border-radius: 4px; text-align: left;
        }
        .kb-draft-body {
          padding: 10px 12px; margin-top: -1px;
          background: var(--draft-bg);
          border: 1.5px dashed var(--draft-border);
          border-top: none;
          border-radius: 0 0 4px 4px;
        }
        .kb-draft-text {
          font-family: 'Literata', serif; font-size: 13px; font-style: italic;
          color: var(--draft); line-height: 1.6; margin-bottom: 4px;
        }
        .kb-draft-value {
          font-family: 'IBM Plex Mono', monospace; font-size: 13px;
          font-weight: 700; color: var(--draft);
        }

        /* ── Center ──────────────────────── */
        .kb-center {
          padding: 24px 32px;
          overflow-y: auto;
          display: flex; flex-direction: column; gap: 16px;
        }
        .kb-section-header { display: flex; flex-direction: column; gap: 4px; }
        .kb-section-title {
          font-size: 20px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.01em;
        }
        .kb-section-underline { height: 2px; width: 40px; }
        .kb-section-underline-gold { background: var(--gold); }
        .kb-section-underline-green { background: var(--green); }
        .kb-section-gap {
          font-size: 12px; color: var(--ink-3); margin-top: 4px;
        }
        .kb-section-gap-val {
          font-family: 'IBM Plex Mono', monospace; font-weight: 700;
          color: var(--green); font-size: 14px;
        }
        .kb-section-gap-tag { font-size: 10px; color: var(--ink-4); margin-left: 4px; }

        /* Subsidiary notice */
        .kb-sub-notice {
          display: flex; align-items: flex-start; gap: 8px;
          padding: 10px 14px;
          background: var(--green-bg);
          border: 1px solid var(--green-border);
          border-radius: 4px;
          font-family: 'Literata', serif; font-size: 13px; font-style: italic;
          color: var(--green); line-height: 1.5;
        }
        .kb-sub-diamond { flex-shrink: 0; margin-top: 3px; }

        /* ── Card layout — bento ──────────── */
        .kb-dual {
          display: flex; flex-direction: column; gap: 8px;
        }
        .kb-card {
          display: grid; grid-template-columns: 130px 1fr;
          background: var(--paper);
          border: var(--rule);
          border-radius: 4px;
          overflow: hidden;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          min-height: 0; position: relative;
        }
        .kb-card-sub {
          border-left: 2.5px dashed var(--green-border);
          border-radius: 0 4px 4px 0;
        }
        .kb-sub-diamond-marker { position: absolute; left: -6px; top: 18px; z-index: 1; }
        .kb-card-gone { overflow: hidden; opacity: 0; max-height: 0; padding: 0; pointer-events: none; border: none; }
        .kb-card-full { max-width: 720px; margin: 0 auto; grid-template-columns: 1fr; }

        .kb-sidebar {
          padding: 18px 14px;
          display: flex; flex-direction: column; gap: 6px; align-items: flex-start;
          border-right: var(--rule);
        }
        .kb-sidebar-te { background: var(--paper-sub); }
        .kb-sidebar-bh { background: var(--paper-sub); }
        .kb-sidebar-red { background: var(--red-bg); }
        .kb-sidebar-name { font-size: 11px; font-weight: 700; }
        .kb-sidebar-pos {
          font-family: 'IBM Plex Mono', monospace; font-size: 18px; font-weight: 700;
          font-variant-numeric: tabular-nums; margin-top: 4px; color: var(--ink);
        }
        .kb-sidebar-ref {
          font-family: 'IBM Plex Mono', monospace; font-size: 9px; font-weight: 600;
          color: var(--ink-3);
        }
        .kb-prose {
          padding: 18px 24px;
          display: flex; flex-direction: column; gap: 6px;
        }
        .kb-card-full .kb-sidebar { display: none; }
        .kb-card-full .kb-prose { padding: 20px 24px; }

        /* Truncated text — mask fade */
        .kb-truncated {
          height: 96px; overflow: hidden;
          mask-image: linear-gradient(to bottom, black 40%, transparent 100%);
          -webkit-mask-image: linear-gradient(to bottom, black 40%, transparent 100%);
        }
        .kb-arg-text {
          font-family: 'Literata', serif; font-size: 14px; line-height: 1.75;
          color: var(--ink-2); white-space: pre-wrap;
        }
        .kb-read-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 12px; font-size: 12px; font-weight: 600;
          color: var(--gold); background: var(--gold-bg);
          border: 1px solid var(--gold-border);
          border-radius: 4px; align-self: flex-start;
          transition: all 0.15s ease;
        }
        .kb-read-btn:hover { box-shadow: 0 1px 4px rgba(0,0,0,0.06); }

        /* Full reading mode */
        .kb-reading { display: flex; flex-direction: column; }
        .kb-reading-text {
          font-family: 'Literata', serif; font-size: 16px; line-height: 1.75;
          color: var(--ink-2); white-space: pre-wrap; max-width: 62ch;
        }
        .kb-back-btn {
          display: inline-flex; align-items: center; gap: 5px;
          margin-top: 16px; padding: 5px 12px;
          font-size: 12px; font-weight: 500; color: var(--ink-3);
          background: var(--paper-in); border-radius: 4px; align-self: flex-start;
        }

        /* ── Gap viz — bento box ──────────── */
        .kb-gap-viz {
          padding: 10px 16px;
          background: var(--paper-in);
          border-radius: 4px;
          display: flex; align-items: center; gap: 10px;
        }
        .kb-gap-viz-label {
          font-family: 'IBM Plex Mono', monospace; font-size: 9px; font-weight: 700;
          color: var(--ink-4); letter-spacing: 0.06em; text-transform: uppercase;
          flex-shrink: 0;
        }
        .kb-gap-viz-bar {
          display: flex; flex: 1; height: 22px; gap: 2px; border-radius: 4px; overflow: hidden;
        }
        .kb-gap-seg-ok {
          display: flex; align-items: center; justify-content: center;
          background: var(--green); opacity: 0.8;
          border-radius: 4px 0 0 4px;
          font-family: 'IBM Plex Mono', monospace; font-size: 10px; font-weight: 700;
          color: white; min-width: 60px;
        }
        .kb-gap-seg-gap {
          display: flex; align-items: center; justify-content: center;
          background: var(--red); opacity: 0.85;
          border-radius: 0 4px 4px 0;
          font-family: 'IBM Plex Mono', monospace; font-size: 10px; font-weight: 700;
          color: white; min-width: 60px;
        }

        /* ── Center draft ────────────────── */
        .kb-center-draft {
          padding: 12px 16px;
          background: var(--draft-bg);
          border: 1.5px dashed var(--draft-border);
          border-radius: 4px;
        }
        .kb-center-draft-head {
          display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
        }
        .kb-center-draft-label { font-size: 11px; color: var(--draft); }
        .kb-center-draft-amount {
          font-family: 'IBM Plex Mono', monospace; font-size: 14px; font-weight: 700;
          color: var(--draft); margin-left: auto;
        }
        .kb-center-draft-text {
          font-family: 'Literata', serif; font-size: 13px; font-style: italic;
          color: var(--draft); line-height: 1.55;
        }

        /* ── Right ───────────────────────── */
        .kb-right {
          border-left: var(--edge);
          display: flex; flex-direction: column; overflow-y: auto;
        }
        .kb-right-tabs {
          display: flex; border-bottom: var(--rule); flex-shrink: 0;
        }
        .kb-tab {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 4px;
          padding: 10px 6px; font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.04em;
          color: var(--ink-4);
          border-bottom: 2px solid transparent;
          transition: all 0.15s ease;
        }
        .kb-tab-on { color: var(--ink); border-bottom-color: var(--gold); }
        .kb-right-body { flex: 1; overflow-y: auto; padding: 12px; }

        .kb-provision {
          padding: 12px; border: var(--rule-subtle); border-radius: 4px;
          margin-bottom: 6px; display: flex; flex-direction: column; gap: 3px;
          background: var(--paper-in);
          transition: border-color 0.15s;
        }
        .kb-provision:hover { border-color: var(--gold-border); }
        .kb-provision-ref {
          font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 700;
          color: var(--green);
        }
        .kb-provision-title { font-size: 13px; font-weight: 600; }
        .kb-provision-text {
          font-family: 'Literata', serif; font-size: 12px; line-height: 1.55;
          color: var(--ink-3);
        }
        .kb-provision-note {
          font-family: 'Literata', serif; font-size: 12px; font-style: italic;
          color: var(--green); line-height: 1.5; margin-top: 2px;
        }

        .kb-event {
          display: grid; grid-template-columns: 44px 28px 1fr;
          gap: 4px; min-height: 44px;
          padding: 6px 4px; border-radius: 4px;
          text-align: left; cursor: pointer;
          transition: background 0.15s;
        }
        .kb-event:hover { background: var(--paper); }
        .kb-event-active { background: var(--gold-bg); border: 1px solid var(--gold-border); }
        .kb-event-time { text-align: right; padding-top: 2px; }
        .kb-event-date {
          font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 600;
          display: block; color: var(--ink-2);
        }
        .kb-event-hour {
          font-family: 'IBM Plex Mono', monospace; font-size: 9px; color: var(--ink-4);
        }
        .kb-event-line { display: flex; flex-direction: column; align-items: center; padding-top: 2px; }
        .kb-event-marker {
          width: 22px; height: 22px; border-radius: 4px;
          display: flex; align-items: center; justify-content: center;
          font-family: 'IBM Plex Mono', monospace; font-size: 8px; font-weight: 700;
          flex-shrink: 0;
        }
        .kb-event-te { background: var(--plate); color: var(--canvas); }
        .kb-event-bh { background: var(--canvas); color: var(--plate); border: 1.5px solid var(--plate); }
        .kb-event-connector { width: 1px; flex: 1; background: var(--paper-in); margin-top: 3px; }
        .kb-event-body { padding-top: 2px; }
        .kb-event-text {
          font-size: 12px; line-height: 1.45; color: var(--ink-2); display: block;
        }
        .kb-event-type-badge {
          display: inline-block; margin-top: 3px;
          font-size: 9px; font-weight: 700; color: var(--gold);
          background: var(--gold-bg); padding: 1px 5px; border-radius: 2px;
          letter-spacing: 0.04em; text-transform: uppercase;
        }

        /* ── Snapshot mode ───────────────── */
        .kb-snap { display: flex; flex-direction: column; gap: 12px; }
        .kb-snap-banner {
          display: flex; flex-direction: column; gap: 6px;
          padding: 14px 18px;
          background: var(--gold-bg); border: 1px solid var(--gold-border); border-radius: 4px;
        }
        .kb-snap-back {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 12px; font-weight: 600; color: var(--gold);
          align-self: flex-start; padding: 3px 10px;
          background: white; border: 1px solid var(--gold-border); border-radius: 4px;
        }
        .kb-snap-meta {
          display: flex; align-items: center; gap: 6px; color: var(--gold);
        }
        .kb-snap-date {
          font-family: 'IBM Plex Mono', monospace; font-size: 13px; font-weight: 700;
        }
        .kb-snap-label { font-size: 12px; color: var(--ink-2); }

        .kb-snap-empty {
          display: flex; align-items: center; gap: 6px;
          padding: 10px 14px; border: var(--rule-subtle); border-radius: 4px;
          color: var(--ink-4); font-size: 13px;
        }
        .kb-snap-na {
          font-family: 'Literata', serif; font-size: 12px; font-style: italic;
          margin-left: auto;
        }
        .kb-snap-track { display: flex; flex-direction: column; gap: 6px; }
        .kb-snap-track-head {
          display: flex; align-items: center; gap: 6px;
          padding: 0 2px;
        }
        .kb-snap-track-label { font-size: 13px; font-weight: 700; }
        .kb-snap-text {
          font-family: 'Literata', serif; font-size: 13.5px; line-height: 1.7;
          color: var(--ink-2);
        }
        .kb-snap-na {
          font-family: 'Literata', serif; font-size: 13px; font-style: italic;
          color: var(--ink-4);
        }
        .kb-card-waiting { opacity: 0.5; }
        .kb-card-diffed { border-color: var(--gold-border); }

        /* Inline diff inside card */
        .kb-diff-header {
          display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
          padding: 5px 10px; margin-bottom: 8px;
          background: var(--gold-bg); border-radius: 4px;
          font-family: 'IBM Plex Mono', monospace; font-size: 12px;
        }
        .kb-diff-badge {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 9px; font-weight: 700; letter-spacing: 0.06em;
          text-transform: uppercase; color: var(--gold);
          background: white; padding: 1px 5px;
          border: 1px solid var(--gold-border); border-radius: 2px;
        }
        .kb-diff-from { color: var(--ink-3); text-decoration: line-through; }
        .kb-diff-arrow { color: var(--ink-4); }
        .kb-diff-to { font-weight: 700; }
        .kb-diff-delta {
          font-size: 10px; font-weight: 700; color: var(--red);
          padding: 1px 5px; background: var(--red-bg); border-radius: 2px;
        }
        .kb-diff-added {
          display: flex; gap: 6px; padding: 8px 10px; margin-top: 6px;
          background: var(--green-bg); border-left: 2px solid var(--green);
          border-radius: 0 4px 4px 0;
        }
        .kb-diff-marker {
          font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 700;
          color: var(--green); flex-shrink: 0;
        }
        .kb-diff-added p {
          font-family: 'Literata', serif; font-size: 13px; line-height: 1.6;
          color: var(--green);
        }
        .kb-diff-prev-btn {
          font-size: 11px; font-weight: 600; color: var(--ink-3);
          padding: 3px 0; margin-top: 6px;
          text-decoration: underline; text-underline-offset: 2px;
        }
        .kb-diff-prev-btn:hover { color: var(--ink); }
        .kb-diff-prev {
          margin-top: 6px; padding: 10px 12px;
          background: var(--red-bg); border-left: 2px solid var(--red);
          border-radius: 0 4px 4px 0;
        }
        .kb-diff-prev-label {
          font-size: 10px; font-weight: 700; color: var(--red);
          margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.04em;
        }
        .kb-diff-prev p {
          font-family: 'Literata', serif; font-size: 13px; line-height: 1.6;
          color: var(--ink-3);
        }
        }

        .kb-attach {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 10px; border-radius: 4px; cursor: pointer;
          border: var(--rule-subtle); margin-bottom: 4px;
          transition: border-color 0.15s;
        }
        .kb-attach:hover { border-color: var(--ink-4); }
        .kb-attach-icon {
          width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center;
          background: var(--paper-in); border-radius: 4px; color: var(--ink-4);
        }
        .kb-attach-info { flex: 1; }
        .kb-attach-name { font-size: 12px; font-weight: 500; }
        .kb-attach-meta { font-size: 10px; color: var(--ink-4); }

        /* ── Action bar ──────────────────── */
        .kb-action {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 24px;
          border-top: var(--edge);
          background: var(--canvas);
          flex-shrink: 0;
        }
        .kb-action-status { display: flex; align-items: center; gap: 8px; }
        .kb-action-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--gold);
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .kb-action-detail { font-size: 12px; color: var(--ink-3); }
        .kb-action-buttons { display: flex; gap: 8px; }

        .kb-btn {
          font-weight: 700; font-size: 12px;
          text-transform: uppercase; letter-spacing: 0.03em;
          border-radius: 4px; border: 1.5px solid;
          padding: 7px 18px;
          transition: all 0.1s ease;
        }
        .kb-btn:hover { transform: translateY(-1px); }
        .kb-btn:active { transform: translateY(1px); }
        .kb-btn-pri {
          background: var(--plate); color: var(--canvas);
          border-color: var(--plate);
          box-shadow: var(--btn-shadow);
        }
        .kb-btn-pri:hover { box-shadow: var(--btn-shadow-hover); }
        .kb-btn-sec {
          background: var(--canvas); color: var(--ink);
          border-color: rgba(28,25,23,0.25);
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }

        /* ── Focus visibility ─────────────── */
        .kb-track:focus-visible,
        .kb-tab:focus-visible,
        .kb-persp:focus-visible,
        .kb-btn:focus-visible,
        .kb-read-btn:focus-visible,
        .kb-back-btn:focus-visible,
        .kb-draft-toggle:focus-visible,
        .kb-theme-btn:focus-visible,
        .kb-attach:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px var(--gold-border);
        }

        @media (prefers-reduced-motion: reduce) {
          .kb-action-dot { animation: none; }
          .kb-btn:hover, .kb-btn:active { transform: none; }
          .kb-dual, .kb-col { transition: none; }
        }
      `}</style>
    </div>
  );
}
