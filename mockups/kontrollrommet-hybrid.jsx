import { useState, useEffect } from "react";
import {
  Check, X, XSquare, Clock, Banknote, Scale,
  AlertTriangle, ArrowRight, Paperclip, Plus, Pencil, ExternalLink,
  ChevronLeft, Bold, Italic, List, ListOrdered, RotateCcw, RotateCw, Upload, Send, Circle,
} from "lucide-react";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400;1,6..72,500&display=swap');

  :root {
    --canvas: #F8F7F4; --paper: #FFFFFF; --paper-inset: #F6F5F1;
    --paper-sub: #FAFAF7; --plate: #1C1917;
    --ink: #1C1917; --ink-2: #4A4945; --ink-3: #7A7975; --ink-4: #A8A7A2;
    --edge: 2px solid #1C1917;
    --rule: 1px solid rgba(28,25,23,0.12);
    --rule-subtle: 1px solid rgba(28,25,23,0.07);
    --ochre: #B8860B; --ochre-bg: #FBF6EA; --ochre-border: #DDD0A0;
    --red: #991B1B; --red-bg: #FDF2F2; --green: #166534;
    --draft: #6B5E2F; --draft-bg: #FDFBF0; --draft-border: #DBD2A8;
  }

  * { box-sizing: border-box; margin: 0; }
  body { background: var(--canvas); color: var(--ink); font-family: 'Space Grotesk', sans-serif; -webkit-font-smoothing: antialiased; }
  .font-serif { font-family: 'Newsreader', serif; }
  .font-mono { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }

  .stamp { display: inline-block; font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; padding: 4px 12px; border: 2px solid currentColor; line-height: 1; box-shadow: 2px 2px 0 currentColor; }
  .stamp-red { color: var(--red); transform: rotate(-1.2deg); background: var(--red-bg); }
  .stamp-ochre { color: var(--ochre); transform: rotate(-0.6deg); background: var(--ochre-bg); }
  .stamp-draft { color: var(--draft); border-style: dashed; transform: rotate(-0.8deg); background: var(--draft-bg); box-shadow: none; }
  .stamp-sm { font-size: 9px; padding: 3px 8px; border-width: 1.5px; box-shadow: 1px 1px 0 currentColor; }
  .stamp-sm.stamp-draft { box-shadow: none; }
  .stamp-sm.stamp-flat { box-shadow: none; transform: none; }

  .btn { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; border-radius: 0; cursor: pointer; transition: all 60ms linear; }
  .btn:active { transform: translate(2px, 2px); }
  .btn-primary { background: var(--plate); color: white; border: 2px solid var(--plate); box-shadow: 3px 3px 0 rgba(28,25,23,0.2); }
  .btn-primary:hover { box-shadow: 2px 2px 0 rgba(28,25,23,0.2); transform: translate(1px, 1px); }
  .btn-secondary { background: var(--paper); color: var(--ink); border: 2px solid var(--ink); box-shadow: 2px 2px 0 rgba(28,25,23,0.12); }
  .btn-secondary:hover { box-shadow: 1px 1px 0 rgba(28,25,23,0.12); transform: translate(1px, 1px); }
  .btn-danger { background: var(--paper); color: var(--red); border: 2px solid var(--red); box-shadow: 2px 2px 0 rgba(153,27,27,0.12); }
  .btn-danger:hover { box-shadow: 1px 1px 0 rgba(153,27,27,0.12); transform: translate(1px, 1px); }
  .btn-sm { font-size: 10px; padding: 6px 12px; box-shadow: 2px 2px 0 rgba(28,25,23,0.08); }
  .btn-sm:hover { box-shadow: 1px 1px 0 rgba(28,25,23,0.08); transform: translate(1px, 1px); }

  .m-row { cursor: pointer; border-left: 3px solid transparent; transition: background 80ms; }
  .m-row:hover { background: var(--paper-inset); }
  .m-row:active { background: var(--paper); }
  .m-row.on { background: var(--paper); border-left-color: var(--ochre); }

  .tab { padding: 10px 16px; font-family: 'Space Grotesk', sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink-4); cursor: pointer; border-bottom: 2px solid transparent; background: none; border-top: none; border-left: none; border-right: none; transition: all 100ms; }
  .tab:hover { color: var(--ink-2); background: var(--paper-inset); }
  .tab.on { color: var(--ink); border-bottom-color: var(--ochre); background: transparent; }

  .sub-zone { position: relative; margin-left: 24px; padding-left: 20px; border-left: 2px dashed var(--ochre-border); }
  .sub-zone::before { content: ''; position: absolute; left: -6px; top: 0; width: 10px; height: 10px; background: var(--ochre); transform: rotate(45deg); }

  .att { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--paper); border: var(--rule-subtle); cursor: pointer; transition: border-color 100ms, box-shadow 100ms; }
  .att:hover { border-color: var(--ink); box-shadow: 2px 2px 0 rgba(28,25,23,0.04); }

  .best-card { padding: 16px; background: var(--paper-inset); border: var(--rule-subtle); transition: border-color 100ms; cursor: default; }
  .best-card:hover { border-color: var(--ochre-border); }

  .pill { padding: 8px 16px; font-size: 13px; font-weight: 600; border: 2px solid var(--ink-4); background: var(--paper); color: var(--ink-2); cursor: pointer; transition: all 80ms; }
  .pill:hover { border-color: var(--ink); color: var(--ink); }
  .pill.yes { background: var(--green); color: white; border-color: var(--green); }
  .pill.no { background: var(--red); color: white; border-color: var(--red); }

  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--ink-4); }
`;

const TE = "Byggnor";
const BH = "Kystveien Eiendom";
const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, section: 32 };

const DD = {
  ansvar: {
    label: "Ansvarsgrunnlag", num: "I", icon: Scale, type: "binary", status: "disputed",
    te: { position: "Svikt", ref: "§ 23.1" }, bh: { position: "Avvist", ref: "§ 23.1 (2)" },
    best: [
      { ref: "§ 23.1", title: "Risiko for forhold ved grunnen", text: "Totalentreprenøren har risikoen for forhold ved grunnen med mindre det foreligger avvik fra det som fremkommer av kontrakten, herunder byggegrunn og grunnforhold som er beskrevet eller forutsatt.", note: "Svikt-vurderingen knytter seg til hva TE med rimelighet burde ha oppdaget." },
      { ref: "§ 23.1 (2)", title: "Avvik innenfor angitt toleranse", text: "Dersom kontraktsgrunnlaget angir toleranser, bærer totalentreprenøren risikoen for avvik innenfor disse.", note: "Forbeholdet i pkt. 4.2 angir ±2 m variasjon." },
      { ref: "§ 34.2", title: "Krav om endringsordre", text: "Dersom totalentreprenøren mener det foreligger en endring, skal han varsle byggherren uten ugrunnet opphold.", note: "Kravet tapes hvis ikke varslet i tide." },
    ],
    teT: "Under utgraving i akse 1–3 støtte vi på massivt fjell som ikke fremkommer av de geotekniske rapportene (vedlegg 3 i kontrakten). Dybden på fjellet krever sprengning fremfor pigging. Dette utgjør en vesentlig endring av forutsetningene for tilbudet og representerer en svikt ved byggherrens leveranse av grunnlagsdata.",
    bhT: "Kravet avvises i sin helhet. I geoteknisk rapport punkt 4.2 er det tatt uttrykkelig forbehold om at fjellkoter kan variere med inntil 2 meter i dette området. At fjellet ligger høyere enn antatt faller dermed innenfor entreprenørens risiko iht. NS 8407 § 23.1, 2. ledd.",
    bhL: "Standpunkt",
    att: [{ n: "Geoteknisk rapport rev. B", p: 42 }, { n: "Foto byggegrop 11.04" }],
    note: { d: "14.04", t: "Sjekk pkt. 4.2 — gjelder kun vertikale avvik, ikke horisontal utbredelse." },
    draft: { text: "Vi fastholder at forbeholdet i pkt. 4.2 er tilstrekkelig klart. Bør gjennomgå den geologiske kartleggingen på nytt." },
    draftState: "draft",
  },
  vederlag: {
    label: "Økonomi", num: "II", icon: Banknote, type: "numeric", status: "subsidiary",
    te: { value: 450000, unit: ",-" }, bh: { prinsipal: 0, subsidiaer: 300000, unit: ",-" },
    best: [
      { ref: "§ 34.1", title: "Retten til vederlagsjustering", text: "Totalentreprenøren har krav på vederlagsjustering dersom det foreligger en endring eller annet forhold byggherren bærer risikoen for.", note: "Kravet tapes hvis ikke varslet i tide." },
      { ref: "§ 34.4", title: "Regningsarbeid", text: "Arbeidet avregnes etter medgåtte kostnader med påslag. Totalentreprenøren skal føre løpende oversikt over timer og materialer.", note: "Byggherren skal gis mulighet til å kontrollere omfanget fortløpende." },
    ],
    teT: "Sprengningsarbeidene krevde innleie av spesialisert borerigg samt ekstra mannskap i 14 arbeidsdager. Total kostnad beregnet som regningsarbeid iht. NS 8407 § 30: maskin og mannskap kr 300.000,-, leie eksternt utstyr kr 150.000,-. Totalt kr 450.000,- eksklusiv mva.",
    bhT: "Dersom det mot formodning skulle konstateres rett til endring, aksepteres kun påløpte kostnader for den faktiske sprengningen. Kostnader knyttet til leie av eksternt utstyr (150.000,-) avvises subsidiært da entreprenøren uansett skulle hatt borerigg på plassen.",
    bhL: "Subsidiær utmåling",
    att: [{ n: "Kostnadsoppstilling", p: 3 }], note: null,
    draft: { text: "Vurderer 280k — borerigg-argumentet har noe for seg.", value: 280000 },
    draftState: "draft",
  },
  frist: {
    label: "Frist", num: "III", icon: Clock, type: "numeric", status: "subsidiary",
    te: { value: 14, unit: " dgr" }, bh: { prinsipal: 0, subsidiaer: 7, unit: " dgr" },
    best: [
      { ref: "§ 33.1", title: "Fristforlengelse ved endringer", text: "Totalentreprenøren har krav på fristforlengelse dersom fremdriften hindres som følge av endringer eller andre forhold byggherren bærer risikoen for.", note: null },
      { ref: "§ 33.5", title: "Utmåling av fristforlengelse", text: "Fristforlengelsen skal svare til den virkning kontraktsforholdet har hatt på fremdriften.", note: null },
    ],
    teT: "Sprengningsarbeidene medførte full stans i grunnarbeidet i akse 1–3 i 14 arbeidsdager. Arbeidet ligger på kritisk linje for råbyggsfasen, og forsinkelsen forplanter seg direkte til sluttfristen.",
    bhT: "Tidsbruken for selve sprengningen vurderes å utgjøre maksimalt 7 arbeidsdager. Resterende dager avvises da arbeidet ikke i sin helhet ligger på kritisk linje iht. fremdriftsplan rev. 4.",
    bhL: "Subsidiær utmåling",
    att: [{ n: "Fremdriftsplan rev. 4", p: 8 }], note: null, draft: null, draftState: "empty",
  },
};

const EVT = [
  { d: "14.04", t: "09:15", a: "BH", n: BH, s: "Ansvar bestridt", x: "Prinsipalt avslag." },
  { d: "14.04", t: "09:15", a: "BH", n: BH, s: "Subsidiær utmåling", x: "300.000,- / 7 dager." },
  { d: "13.04", t: "15:42", a: "TE", n: TE, s: "Vederlag revidert", x: "350k → 450k." },
  { d: "12.04", t: "11:20", a: "TE", n: TE, s: "Frist spesifisert", x: "14 arbeidsdager." },
  { d: "12.04", t: "11:15", a: "TE", n: TE, s: "Vederlagskrav sendt", x: "Regningsarbeid § 30." },
  { d: "12.04", t: "11:05", a: "TE", n: TE, s: "Ansvarsgrunnlag sendt", x: "Svikt / § 23.1." },
  { d: "12.04", t: "11:00", a: "TE", n: TE, s: "Opprettet", x: "KOE-104." },
];

const fmt = n => n.toLocaleString("nb-NO");
const act = (s, r) => s === "empty" ? (r === "TE" ? "Revider" : "Besvar") : s === "draft" ? "Fortsett" : "Revider svar";

function DualBar({ te, sub, prin }) {
  return (
    <div>
      {[{ label: "subs.", val: sub, color: "var(--ochre)" }, { label: "prins.", val: prin, color: "var(--red)" }].map((b, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: i === 0 ? 4 : 0 }}>
          <span className="font-mono" style={{ fontSize: 9, width: 32, textAlign: "right", color: "var(--ink-3)", fontWeight: 600 }}>{b.label}</span>
          <div style={{ flex: 1, height: 5, background: "var(--paper)", border: "var(--rule-subtle)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(b.val / te) * 100}%`, background: b.color }} />
          </div>
          <span className="font-mono" style={{ fontSize: 10, fontWeight: 600, minWidth: 48, textAlign: "right", color: b.val === 0 ? "var(--ink-4)" : "var(--ink)" }}>{fmt(b.val)}</span>
        </div>
      ))}
    </div>
  );
}

function DateSep({ date }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: S.sm, margin: `${S.lg}px 0 ${S.md}px` }}>
      <div style={{ flex: 1, height: 1, background: "var(--ochre-border)" }} />
      <span className="font-mono" style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-3)" }}>{date}</span>
      <div style={{ flex: 1, height: 1, background: "var(--ochre-border)" }} />
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState("BH");
  const [sel, setSel] = useState("ansvar");
  const [rTab, setRTab] = useState("bestemmelser");
  const [mode, setMode] = useState("read");
  const [ch, setCh] = useState({});
  const [begr, setBegr] = useState("");
  const [saving, setSaving] = useState(false);

  const d = DD[sel]; const Ic = d.icon; const isSub = sel !== "ansvar";
  const subV = DD.vederlag.te.value - DD.vederlag.bh.subsidiaer;
  const prinV = DD.vederlag.te.value - DD.vederlag.bh.prinsipal;
  const subF = DD.frist.te.value - DD.frist.bh.subsidiaer;
  const prinF = DD.frist.te.value - DD.frist.bh.prinsipal;
  const draftCount = Object.values(DD).filter(x => x.draftState === "draft").length;

  const grouped = {};
  EVT.forEach(e => { if (!grouped[e.d]) grouped[e.d] = []; grouped[e.d].push(e); });

  const goForm = (k) => { setSel(k); setMode("form"); setRTab("begrunnelse"); setBegr(DD[k].draft?.text || ""); setCh({}); };
  const tc = (k, v) => setCh(p => ({ ...p, [k]: p[k] === v ? null : v }));

  useEffect(() => { if (mode !== "form") return; setSaving(true); const t = setTimeout(() => setSaving(false), 600); return () => clearTimeout(t); }, [begr, ch, mode]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ═══ HEADER ═══ */}
        <header style={{ height: 52, borderBottom: "var(--edge)", background: "var(--paper)", display: "flex", alignItems: "stretch", justifyContent: "space-between", flexShrink: 0, zIndex: 30, position: "relative" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "var(--ochre)" }} />
          <div style={{ display: "flex", alignItems: "center" }}>
            {mode === "form" && (
              <button onClick={() => { setMode("read"); setRTab("bestemmelser"); }} style={{ display: "flex", alignItems: "center", gap: 4, padding: `0 ${S.lg}px`, fontSize: 13, fontWeight: 600, color: "var(--ink-3)", background: "none", border: "none", cursor: "pointer", borderRight: "var(--rule)", height: "100%" }}>
                <ChevronLeft style={{ width: 16, height: 16 }} /> Oversikt
              </button>
            )}
            <div style={{ display: "flex", alignItems: "center", padding: `0 ${S.lg}px`, borderRight: "var(--edge)", height: "100%", background: "var(--plate)", color: "var(--ochre)" }}>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em" }}>NS 8407</span>
            </div>
            <div style={{ padding: `0 ${S.lg}px`, display: "flex", alignItems: "center", gap: S.md }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Kystveien Vest</span>
              <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500 }}>{TE} → {BH}</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", padding: `0 ${S.lg}px`, gap: S.md }}>
            {mode === "form" && (
              <div style={{ display: "flex", alignItems: "center", gap: S.sm, marginRight: S.md }}>
                <div style={{ width: 6, height: 6, background: saving ? "var(--ochre)" : "var(--green)", transition: "background 200ms" }} />
                <span className="font-mono" style={{ fontSize: 10, color: "var(--ink-4)" }}>{saving ? "Lagrer..." : "Lagret"}</span>
              </div>
            )}
            <span className="font-mono" style={{ fontSize: 10, color: "var(--ink-4)", letterSpacing: "0.06em" }}>VIS SOM</span>
            <div style={{ display: "flex", border: "var(--edge)" }}>
              {["TE", "BH"].map(r => (
                <button key={r} onClick={() => setRole(r)} className="font-mono"
                  style={{ padding: `${S.xs}px ${S.lg - 2}px`, fontSize: 11, fontWeight: 700, background: role === r ? "var(--plate)" : "var(--paper)", color: role === r ? "white" : "var(--ink-3)", border: "none", cursor: "pointer", borderRight: r === "TE" ? "var(--edge)" : "none", transition: "all 80ms" }}>{r}</button>
              ))}
            </div>
          </div>
        </header>

        {/* ═══ CONSISTENCY STRIP (form mode) ═══ */}
        {mode === "form" && (
          <div style={{ borderBottom: "var(--rule)", background: "var(--draft-bg)", padding: `${S.sm}px ${S.xxl}px`, display: "flex", alignItems: "center", gap: S.xl, flexShrink: 0 }}>
            <span className="font-mono" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--draft)" }}>Dine svar:</span>
            {Object.entries(DD).map(([k, dd]) => {
              const active = k === sel; const ds = dd.draftState;
              return (
                <button key={k} onClick={() => { setSel(k); setBegr(dd.draft?.text || ""); }}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: `${S.xs}px ${S.md}px`, fontSize: 12, fontWeight: active ? 700 : 500, color: active ? "var(--draft)" : ds === "draft" ? "var(--ink-2)" : "var(--ink-4)", background: active ? "rgba(107,94,47,0.08)" : "transparent", border: "none", cursor: "pointer", transition: "all 80ms" }}>
                  {ds === "draft" ? <Pencil style={{ width: 10, height: 10 }} /> : <Circle style={{ width: 10, height: 10 }} />}
                  <span>{dd.label}:</span>
                  <span className="font-mono" style={{ fontSize: 11, fontWeight: 700 }}>
                    {ds === "empty" ? "—" : k === "ansvar" ? "Bestridt" : dd.draft?.value ? fmt(dd.draft.value) + ",-" : "Kladd"}
                  </span>
                </button>
              );
            })}
            <span className="font-mono" style={{ fontSize: 10, color: "var(--ink-4)", marginLeft: "auto" }}>{draftCount}/3 påbegynt</span>
          </div>
        )}

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* ═══ LEFT (read only) ═══ */}
          {mode === "read" && (
            <aside style={{ width: 300, flexShrink: 0, borderRight: "var(--edge)", display: "flex", flexDirection: "column", overflowY: "auto", background: "var(--canvas)" }}>
              <div style={{ background: "var(--plate)", color: "white", padding: `${S.xl}px ${S.xxl}px`, borderBottom: "var(--edge)" }}>
                <div className="font-mono" style={{ fontSize: 9, color: "var(--ink-4)", fontWeight: 600, letterSpacing: "0.1em", marginBottom: S.xs }}>IDENTIFIKATOR</div>
                <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}>KOE-104</div>
                <div style={{ marginTop: S.md }}><span className="stamp stamp-sm stamp-ochre stamp-flat">Venter</span></div>
              </div>
              <div style={{ padding: `${S.xl}px ${S.xxl}px ${S.lg}px` }}>
                <h2 className="font-serif" style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.4 }}>Uforutsette grunnforhold: Fjell i byggegrop akse 1–3</h2>
              </div>
              <div style={{ padding: `0 ${S.sm}px` }}>
                {Object.entries(DD).map(([k, dd]) => {
                  const on = sel === k; const DI = dd.icon;
                  return (
                    <div key={k} onClick={() => { setSel(k); setRTab("bestemmelser"); }} className={`m-row ${on ? "on" : ""}`} style={{ padding: `${S.md}px`, marginBottom: 2 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: S.sm }}>
                        <div style={{ display: "flex", alignItems: "center", gap: S.sm }}>
                          <DI style={{ width: 14, height: 14, color: "var(--ink-3)" }} />
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{dd.num}. {dd.label}</span>
                        </div>
                        {dd.draftState === "draft" && <span className="stamp stamp-sm stamp-draft">Kladd</span>}
                      </div>
                      {dd.type === "numeric" ? (
                        <div style={{ marginBottom: S.sm }}>
                          <div className="font-mono" style={{ fontSize: 11, fontWeight: 600, marginBottom: S.sm }}>Krevd: {fmt(dd.te.value)}{dd.te.unit}</div>
                          <DualBar te={dd.te.value} sub={dd.bh.subsidiaer} prin={dd.bh.prinsipal} />
                          <div style={{ marginTop: S.sm, padding: `${S.xs}px ${S.md}px`, background: "var(--paper)", border: "var(--rule-subtle)", display: "flex", justifyContent: "space-between" }}>
                            <span className="font-mono" style={{ fontSize: 9, fontWeight: 600, color: "var(--ink-4)" }}>GAP</span>
                            <div style={{ display: "flex", gap: S.md }}>
                              <span className="font-mono" style={{ fontSize: 10, fontWeight: 600, color: "var(--ochre)" }}>s. {fmt(dd.te.value - dd.bh.subsidiaer)}{dd.te.unit}</span>
                              <span className="font-mono" style={{ fontSize: 10, fontWeight: 600, color: "var(--red)" }}>p. {fmt(dd.te.value - dd.bh.prinsipal)}{dd.te.unit}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: S.sm }}>
                          <span className="font-mono" style={{ fontSize: 11, fontWeight: 600 }}>{dd.te.position}</span>
                          <span className="font-mono" style={{ fontSize: 11, fontWeight: 600, color: "var(--red)" }}>{dd.bh.position}</span>
                        </div>
                      )}
                      <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); goForm(k); }} style={{ width: "100%" }}>
                        {act(dd.draftState, role)} <ArrowRight style={{ width: 12, height: 12 }} />
                      </button>
                    </div>
                  );
                })}
              </div>
              <div style={{ height: 1, background: "var(--ochre-border)", margin: `${S.lg}px ${S.xxl}px` }} />
              <div style={{ padding: `0 ${S.xxl}px ${S.xxl}px` }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: S.md }}>Samlet eksponering</div>
                <div style={{ padding: S.md, background: "var(--paper)", border: "var(--rule-subtle)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: S.sm }}>
                    <span className="font-mono" style={{ fontSize: 10, fontWeight: 600, color: "var(--ochre)" }}>Subsidiært</span>
                    <span className="font-mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--ochre)" }}>{fmt(subV)},- + {subF}d</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="font-mono" style={{ fontSize: 10, fontWeight: 600, color: "var(--red)" }}>Prinsipalt</span>
                    <span className="font-mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--red)" }}>{fmt(prinV)},- + {prinF}d</span>
                  </div>
                </div>
              </div>
            </aside>
          )}

          {/* ═══ CENTER ═══ */}
          <main style={{ flex: 1, overflowY: "auto", background: "var(--canvas)", position: "relative" }}>
            {mode === "read" ? (
              /* ──── READ ──── */
              <div style={{ maxWidth: 840, margin: "0 auto", padding: `${S.section + S.sm}px ${S.section + S.sm}px 120px` }}>
                <div style={{ display: "flex", alignItems: "center", gap: S.md, marginBottom: S.section }}>
                  <span className="font-mono" style={{ fontSize: 12, fontWeight: 700, background: "var(--plate)", color: "white", padding: `2px ${S.sm}px` }}>KOE-104</span>
                  <span className="font-serif" style={{ fontSize: 14, color: "var(--ink-3)" }}>Uforutsette grunnforhold — Fjell i byggegrop akse 1–3</span>
                </div>
                <div style={{ borderBottom: "2px solid var(--ochre)", paddingBottom: S.md, marginBottom: S.section }}>
                  <div style={{ display: "flex", alignItems: "center", gap: S.md }}>
                    <Ic style={{ width: 18, height: 18, color: "var(--ink-2)" }} />
                    <h2 style={{ fontSize: 20, fontWeight: 700, textTransform: "uppercase", letterSpacing: "-0.01em" }}>{d.num}. {d.label}{isSub ? " (Sub.)" : ""}</h2>
                  </div>
                </div>
                {isSub && (
                  <div style={{ marginBottom: S.section }}>
                    <div className="sub-zone" style={{ background: "var(--ochre-bg)", padding: `${S.lg}px ${S.xl}px`, border: "var(--rule-subtle)" }}>
                      <span className="stamp stamp-sm stamp-ochre" style={{ marginBottom: S.sm, display: "inline-block" }}>Subsidiært</span>
                      <p className="font-serif" style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink-2)", fontStyle: "italic" }}>Ansvarsgrunnlaget er prinsipalt bestridt. Utmåling er utelukkende subsidiær — ingen erkjennelse av ansvar.</p>
                    </div>
                  </div>
                )}
                <div className={isSub ? "sub-zone" : ""}>
                  <div style={{ display: "flex", borderTop: "var(--edge)", borderLeft: "var(--rule)", borderRight: "var(--rule)", borderBottom: "var(--rule)", background: "var(--paper)" }}>
                    <div style={{ width: 180, flexShrink: 0, padding: S.xl, borderRight: "var(--edge)", background: "var(--paper-sub)", display: "flex", flexDirection: "column" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: S.md }}>{TE}</div>
                      {d.type === "binary" ? (<>
                        <div className="font-mono" style={{ fontSize: 11, fontWeight: 700, background: "var(--plate)", color: "white", padding: "3px 8px", display: "inline-block", width: "fit-content", marginBottom: S.sm }}>{d.te.position.toUpperCase()}</div>
                        <div className="font-mono" style={{ fontSize: 11, fontWeight: 500, color: "var(--ink-2)" }}>{d.te.ref}</div>
                      </>) : (
                        <div className="font-mono" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}>{fmt(d.te.value)}{d.te.unit}</div>
                      )}
                    </div>
                    <div style={{ flex: 1, padding: S.xxl }}><p className="font-serif" style={{ fontSize: 17, lineHeight: 1.75, color: "var(--ink)" }}>{d.teT}</p></div>
                  </div>
                  <div style={{ display: "flex", borderTop: "var(--edge)", borderLeft: "var(--rule)", borderRight: "var(--rule)", borderBottom: "var(--rule)", background: d.status === "disputed" ? "var(--red-bg)" : "var(--paper)", position: "relative" }}>
                    <div style={{ width: 180, flexShrink: 0, padding: S.xl, borderRight: "var(--edge)", display: "flex", flexDirection: "column", background: d.status === "disputed" ? "var(--red)" : "var(--paper-sub)", color: d.status === "disputed" ? "white" : "var(--ink)" }}>
                      <div style={{ fontSize: 12, fontWeight: d.status === "disputed" ? 700 : 500, color: d.status === "disputed" ? "rgba(255,255,255,0.8)" : "var(--ink-2)", marginBottom: S.md }}>{BH}</div>
                      {d.status === "disputed" ? (
                        <div style={{ display: "flex", alignItems: "center", gap: S.sm }}><XSquare style={{ width: 18, height: 18 }} /><span style={{ fontSize: 16, fontWeight: 700, textTransform: "uppercase" }}>Avslått</span></div>
                      ) : (
                        <div className="font-mono" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}>{fmt(d.bh.subsidiaer)}{d.bh.unit}</div>
                      )}
                      {d.status === "disputed" && <div className="font-mono" style={{ fontSize: 9, fontWeight: 700, marginTop: "auto", paddingTop: S.md, borderTop: "1px solid rgba(255,255,255,0.3)", opacity: 0.8 }}>PRINSIPALT BESTRIDT</div>}
                    </div>
                    <div style={{ flex: 1, padding: S.xxl, position: "relative" }}>
                      {d.status === "disputed" && <div style={{ position: "absolute", top: S.lg, right: S.xl }}><span className="stamp stamp-red">Bestridt</span></div>}
                      {d.status === "subsidiary" && <div style={{ position: "absolute", top: S.lg, right: S.xl }}><span className="stamp stamp-ochre">Subsidiært</span></div>}
                      <div style={{ background: d.status === "disputed" ? "rgba(255,255,255,0.5)" : "var(--paper-inset)", border: "var(--rule-subtle)", padding: S.xl, marginTop: d.status ? S.section : 0 }}>
                        <p className="font-serif" style={{ fontSize: 17, lineHeight: 1.75, color: d.status === "disputed" ? "var(--red)" : "var(--ink-2)" }}>{d.bhT}</p>
                      </div>
                    </div>
                  </div>
                  {d.draft && (
                    <div style={{ padding: `${S.xl}px ${S.xxl}px`, background: "var(--draft-bg)", border: "2px dashed var(--draft-border)", marginTop: S.sm }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: S.lg }}>
                        <div style={{ display: "flex", alignItems: "center", gap: S.md }}>
                          <span className="stamp stamp-sm stamp-draft">Kladd</span>
                          <Pencil style={{ width: 12, height: 12, color: "var(--draft)" }} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--draft)" }}>Internt — ikke synlig for motpart</span>
                          {d.draft.value && <span className="font-mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--draft)", marginLeft: S.sm }}>{fmt(d.draft.value)},-</span>}
                        </div>
                        <button className="btn btn-secondary btn-sm" onClick={() => goForm(sel)} style={{ flexShrink: 0 }}><Pencil style={{ width: 12, height: 12 }} /> Fortsett</button>
                      </div>
                      <p className="font-serif" style={{ fontSize: 15, lineHeight: 1.65, fontStyle: "italic", color: "var(--draft)" }}>{d.draft.text}</p>
                    </div>
                  )}
                  {!d.draft && (
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: S.xl }}>
                      <button className="btn btn-primary" onClick={() => goForm(sel)}>{act(d.draftState, role)} <ArrowRight style={{ width: 14, height: 14 }} /></button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ──── FORM ──── */
              <div style={{ maxWidth: 840, margin: "0 auto", padding: `${S.section}px ${S.section + S.sm}px 120px` }}>
                <div style={{ display: "flex", alignItems: "center", gap: S.md, marginBottom: S.xxl }}>
                  <span className="font-mono" style={{ fontSize: 12, fontWeight: 700, background: "var(--plate)", color: "white", padding: `2px ${S.sm}px` }}>KOE-104</span>
                  <span className="font-serif" style={{ fontSize: 14, color: "var(--ink-3)" }}>Uforutsette grunnforhold — Fjell i byggegrop akse 1–3</span>
                </div>
                {/* TE context */}
                <div style={{ marginBottom: S.section + S.sm, padding: S.xxl, background: "var(--paper-sub)", borderTop: "var(--edge)", borderLeft: "var(--rule)", borderRight: "var(--rule)", borderBottom: "var(--rule)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: S.md }}>
                    <div style={{ display: "flex", alignItems: "center", gap: S.sm }}>
                      <Ic style={{ width: 14, height: 14, color: "var(--ink-3)" }} />
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)" }}>{d.label} — {TE}s krav</span>
                    </div>
                    <span className="font-mono" style={{ fontSize: 11, fontWeight: 500, background: "var(--paper-inset)", border: "var(--rule-subtle)", padding: `2px ${S.sm}px`, color: "var(--ink-2)" }}>{d.best[0].ref}</span>
                  </div>
                  {d.type === "numeric" && <div className="font-mono" style={{ fontSize: 22, fontWeight: 700, marginBottom: S.md, letterSpacing: "-0.02em" }}>{fmt(d.te.value)}{d.te.unit === " dgr" ? " dager" : d.te.unit}</div>}
                  <p className="font-serif" style={{ fontSize: 15, lineHeight: 1.65, color: "var(--ink-3)" }}>{d.teT}</p>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: S.section }}>Byggherrens standpunkt</div>
                {/* Q1 */}
                <div style={{ marginBottom: S.section + S.sm }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: S.md }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-2)" }}>Fremsatt krav</span>
                    <span className="font-mono" style={{ fontSize: 11, background: "var(--paper-inset)", border: "var(--rule-subtle)", padding: `2px ${S.sm}px`, color: "var(--ink-3)" }}>§ 33.6.1</span>
                  </div>
                  <p style={{ fontSize: 14, color: "var(--ink-2)", marginBottom: S.lg }}>Ble kravet fremsatt uten ugrunnet opphold?</p>
                  <div style={{ display: "flex", gap: S.sm }}>
                    <button className={`pill ${ch.q1 === "ja" ? "yes" : ""}`} onClick={() => tc("q1", "ja")}>Ja, i tide</button>
                    <button className={`pill ${ch.q1 === "nei" ? "no" : ""}`} onClick={() => tc("q1", "nei")}>Nei, for sent</button>
                  </div>
                </div>
                <div style={{ height: 1, background: "rgba(28,25,23,0.08)", marginBottom: S.section + S.sm }} />
                {/* Q2 */}
                <div style={{ marginBottom: S.section + S.sm }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: S.md }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-2)" }}>Årsakssammenheng</span>
                    <span className="font-mono" style={{ fontSize: 11, background: "var(--paper-inset)", border: "var(--rule-subtle)", padding: `2px ${S.sm}px`, color: "var(--ink-3)" }}>{d.best[0].ref}</span>
                  </div>
                  <p style={{ fontSize: 14, color: "var(--ink-2)", marginBottom: S.lg }}>
                    {sel === "frist" ? "Foreligger det en hindring på fremdriften?" : sel === "vederlag" ? "Har forholdet medført nødvendige merkostnader?" : "Foreligger det en svikt ved byggherrens ytelse?"}
                  </p>
                  <div style={{ display: "flex", gap: S.sm }}>
                    <button className={`pill ${ch.q2 === "ja" ? "yes" : ""}`} onClick={() => tc("q2", "ja")}>{sel === "frist" ? "Ja, hindring" : sel === "vederlag" ? "Ja, merkostnad" : "Ja, svikt"}</button>
                    <button className={`pill ${ch.q2 === "nei" ? "no" : ""}`} onClick={() => tc("q2", "nei")}>{sel === "frist" ? "Nei" : sel === "vederlag" ? "Nei" : "Nei, TE-risiko"}</button>
                  </div>
                </div>
                {d.type === "numeric" && (<>
                  <div style={{ height: 1, background: "rgba(28,25,23,0.08)", marginBottom: S.section + S.sm }} />
                  <div style={{ marginBottom: S.section }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: S.md }}>
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-2)" }}>Utmåling</span>
                      <span className="font-mono" style={{ fontSize: 11, background: "var(--paper-inset)", border: "var(--rule-subtle)", padding: `2px ${S.sm}px`, color: "var(--ink-3)" }}>{d.best[1]?.ref || d.best[0].ref}</span>
                    </div>
                    <span className="stamp stamp-sm stamp-ochre stamp-flat" style={{ marginBottom: S.lg, display: "inline-block" }}>Subsidiært</span>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: S.section }}>
                      <div>
                        <div style={{ fontSize: 12, color: "var(--ink-4)", marginBottom: S.xs }}>Krevd</div>
                        <div className="font-mono" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>{fmt(d.te.value)}{d.te.unit === " dgr" ? " dager" : d.te.unit}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-2)", marginBottom: S.sm }}>{sel === "frist" ? "Godkjent dager" : "Godkjent beløp"}</div>
                        <input type="text" placeholder={sel === "frist" ? "dager" : "beløp"} className="font-mono"
                          style={{ width: 180, fontSize: 18, fontWeight: 700, padding: `${S.sm}px ${S.lg}px`, background: "var(--paper-inset)", border: "var(--edge)", color: "var(--ink)", outline: "none" }}
                          onFocus={e => e.target.style.borderColor = "var(--ochre)"}
                          onBlur={e => e.target.style.borderColor = "#1C1917"} />
                      </div>
                    </div>
                  </div>
                </>)}
              </div>
            )}

            {/* Action bar */}
            <div style={{ position: "sticky", bottom: 0, background: "var(--paper)", borderTop: "var(--edge)", padding: `${S.md}px ${S.xxl}px`, zIndex: 20, boxShadow: "0 -4px 16px rgba(0,0,0,0.05)" }}>
              <div style={{ maxWidth: 840, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: S.md }}>
                  <div style={{ width: 8, height: 8, background: "var(--ochre)" }} />
                  <div>
                    <div className="font-mono" style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "var(--ink-4)" }}>{mode === "form" ? "REDIGERER KLADD" : "SAKSSTATUS"}</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {mode === "form" ? <span style={{ color: "var(--ink-2)" }}>Autolagret — lukk eller send</span> : (<>
                        <span style={{ color: "var(--ochre)" }}>Subs. {fmt(subV)},- / {subF}d</span>
                        <span style={{ color: "var(--ink-4)", margin: `0 ${S.sm}px` }}>·</span>
                        <span style={{ color: "var(--red)" }}>Prins. {fmt(prinV)},- / {prinF}d</span>
                      </>)}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: S.sm }}>
                  {mode === "form" ? (<>
                    <button onClick={() => { setMode("read"); setRTab("bestemmelser"); }} className="btn btn-secondary">Lukk kladd</button>
                    <button className="btn btn-primary"><Send style={{ width: 14, height: 14 }} /> Send svar</button>
                  </>) : role === "TE" ? (<>
                    <button className="btn btn-danger"><XSquare style={{ width: 14, height: 14 }} /> Trekk</button>
                    <button className="btn btn-primary"><Check style={{ width: 14, height: 14 }} /> Godta</button>
                  </>) : (
                    <div style={{ display: "flex", alignItems: "center", gap: S.md, padding: `${S.sm}px ${S.lg}px`, border: "var(--rule)", background: "var(--paper-inset)" }}>
                      <div style={{ width: 6, height: 6, background: "var(--ochre)" }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)" }}>Avventer {TE}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>

          {/* ═══ RIGHT ═══ */}
          <aside style={{ width: 300, flexShrink: 0, borderLeft: "var(--edge)", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--paper)" }}>
            <div style={{ display: "flex", flexShrink: 0, borderBottom: "var(--rule)" }}>
              {(mode === "read" ? ["bestemmelser", "historikk", "vedlegg"] : ["begrunnelse", "historikk", "filer"]).map(t => (
                <button key={t} onClick={() => setRTab(t)} className={`tab ${rTab === t ? "on" : ""}`}>
                  {t === "bestemmelser" ? "Bestemmelser" : t === "historikk" ? "Historikk" : t === "vedlegg" ? "Vedlegg" : t === "begrunnelse" ? "Begrunnelse" : "Filer"}
                </button>
              ))}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: S.xl, display: "flex", flexDirection: "column" }}>

              {rTab === "bestemmelser" && d.best.map((b, i) => (
                <div key={i} className="best-card" style={{ marginBottom: S.lg }}>
                  <div className="font-mono" style={{ fontSize: 12, fontWeight: 700, marginBottom: S.sm }}>{b.ref} {b.title}</div>
                  <p className="font-serif" style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-2)", marginBottom: b.note ? S.md : 0 }}>{b.text}</p>
                  {b.note && <p className="font-serif" style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ochre)", fontStyle: "italic" }}>{b.note}</p>}
                </div>
              ))}

              {rTab === "historikk" && (
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", left: 10, top: S.sm, bottom: 0, width: 2, background: "rgba(28,25,23,0.06)" }} />
                  {Object.entries(grouped).map(([date, events], gi) => (
                    <div key={date}>
                      <DateSep date={date} />
                      {events.map((e, i) => (
                        <div key={i} style={{ position: "relative", paddingLeft: S.section + S.xs, marginBottom: S.xl, opacity: gi === 0 ? 1 : 0.5, transition: "opacity 100ms" }}
                          onMouseEnter={ev => ev.currentTarget.style.opacity = 1}
                          onMouseLeave={ev => ev.currentTarget.style.opacity = gi === 0 ? 1 : 0.5}>
                          <div className="font-mono" style={{ position: "absolute", left: 0, top: 1, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, zIndex: 1, background: e.a === "TE" ? "var(--plate)" : "var(--paper)", color: e.a === "TE" ? "white" : "var(--ink)", border: "2px solid var(--plate)" }}>{e.a}</div>
                          <div className="font-mono" style={{ fontSize: 10, color: "var(--ink-4)", marginBottom: 2 }}>{e.t}</div>
                          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{e.n}: {e.s}</div>
                          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{e.x}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {rTab === "vedlegg" && (
                <div>
                  {d.att.map((v, i) => (
                    <div key={i} className="att" style={{ marginBottom: S.sm }}>
                      <Paperclip style={{ width: 14, height: 14, color: "var(--ink-4)", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.n}</div>
                        {v.p && <div className="font-mono" style={{ fontSize: 10, color: "var(--ink-4)" }}>{v.p} sider</div>}
                      </div>
                      <ExternalLink style={{ width: 14, height: 14, color: "var(--ink-4)", flexShrink: 0 }} />
                    </div>
                  ))}
                  {d.note && (<>
                    <div style={{ height: 1, background: "var(--ochre-border)", margin: `${S.lg}px 0`, opacity: 0.5 }} />
                    <div style={{ padding: S.md, background: "var(--draft-bg)", border: "2px dashed var(--draft-border)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: S.sm, marginBottom: S.sm }}>
                        <Pencil style={{ width: 11, height: 11, color: "var(--draft)" }} />
                        <span className="font-mono" style={{ fontSize: 9, fontWeight: 700, color: "var(--draft)" }}>{d.note.d}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: "var(--draft)" }}>Internt</span>
                      </div>
                      <p className="font-serif" style={{ fontSize: 13, lineHeight: 1.5, fontStyle: "italic", color: "var(--draft)" }}>{d.note.t}</p>
                    </div>
                  </>)}
                  <button style={{ display: "flex", alignItems: "center", gap: S.sm, marginTop: S.md, padding: `${S.sm}px ${S.md}px`, fontSize: 12, fontWeight: 700, color: "var(--ink-3)", background: "transparent", border: "2px dashed var(--ink-4)", cursor: "pointer", width: "100%", justifyContent: "center", transition: "all 80ms" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--ink)"; e.currentTarget.style.color = "var(--ink)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--ink-4)"; e.currentTarget.style.color = "var(--ink-3)"; }}>
                    <Plus style={{ width: 14, height: 14 }} /> Nytt notat
                  </button>
                </div>
              )}

              {rTab === "begrunnelse" && (<>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: S.md }}>
                  <span className="font-mono" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)" }}>Ditt svar</span>
                  <span className="font-mono" style={{ fontSize: 10, color: "var(--ink-4)" }}>{begr.length} tegn</span>
                </div>
                <textarea value={begr} onChange={e => setBegr(e.target.value)} placeholder="Skriv din begrunnelse her..."
                  className="font-serif" style={{ flex: 1, width: "100%", padding: S.lg, fontSize: 15, lineHeight: 1.65, resize: "none", background: "var(--paper)", border: "var(--rule)", color: "var(--ink)", outline: "none", minHeight: 280, transition: "border-color 120ms" }}
                  onFocus={e => e.target.style.borderColor = "rgba(28,25,23,0.3)"}
                  onBlur={e => e.target.style.borderColor = "rgba(28,25,23,0.12)"} />
                <div style={{ display: "flex", gap: 2, marginTop: S.md, padding: S.xs, background: "var(--paper)", border: "var(--rule-subtle)" }}>
                  {[Bold, Italic, List, ListOrdered, RotateCcw, RotateCw].map((II, i) => (
                    <button key={i} style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-4)", background: "transparent", border: "none", cursor: "pointer", transition: "color 80ms" }}
                      onMouseEnter={e => e.currentTarget.style.color = "var(--ink)"}
                      onMouseLeave={e => e.currentTarget.style.color = "var(--ink-4)"}>
                      <II style={{ width: 14, height: 14 }} />
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 11, marginTop: S.md, display: "flex", alignItems: "center", gap: S.sm, color: "var(--ink-4)" }}><Upload style={{ width: 14, height: 14 }} /> Last opp vedlegg i Filer-fanen</p>
              </>)}

              {rTab === "filer" && (
                <div>
                  {d.att.map((v, i) => (
                    <div key={i} className="att" style={{ marginBottom: S.sm }}>
                      <Paperclip style={{ width: 14, height: 14, color: "var(--ink-4)", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.n}</div></div>
                      <ExternalLink style={{ width: 14, height: 14, color: "var(--ink-4)", flexShrink: 0 }} />
                    </div>
                  ))}
                  <button style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: S.sm, marginTop: S.lg, padding: `${S.md}px ${S.lg}px`, width: "100%", fontSize: 12, fontWeight: 700, color: "var(--ink-3)", background: "var(--paper)", border: "2px dashed var(--ink-4)", cursor: "pointer", transition: "all 80ms" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--ink)"; e.currentTarget.style.color = "var(--ink)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--ink-4)"; e.currentTarget.style.color = "var(--ink-3)"; }}>
                    <Upload style={{ width: 14, height: 14 }} /> Last opp nytt vedlegg
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
