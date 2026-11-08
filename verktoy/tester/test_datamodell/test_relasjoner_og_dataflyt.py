"""Relasjonene og dataflyten mot Catenda i docs/datamodell/ (spor M, 1c).

Relasjonsregisteret sammenliknes med katalog.json, øyeblikksbildet av basen i SQL
Server bygget fra migrasjonene. Hver kodereferanse i dataflyten må være deklarert i
TS-fila den viser til, og hvert kall til Catenda i server/ må ha en pil med samme
metode og sti (#1718). Testene viser at registrene beskriver koden og skjemaet, ikke
at koden gjør det riktige.
"""

import copy
import re

import pytest

from verktoymoduler import last

dm = last("datamodell")
rel, df = dm.rel, dm.df


@pytest.fixture(scope="module")
def kilder():
    return dm.kilder()


@pytest.fixture(scope="module")
def tabellregister():
    return dm.les()


def _uten(liste: list[dict], **felt) -> list[dict]:
    return [x for x in liste if any(x.get(k) != v for k, v in felt.items())]


# ---------------------------------------------------------------------------
# Katalogen
# ---------------------------------------------------------------------------


def test_katalogen_har_de_samme_tabellene_som_registeret(kilder, tabellregister):
    assert list(kilder["katalog"]) == ["sqlserver"], "katalog.json har bare SQL Server (#49)"
    assert dm.katalogavvik(tabellregister, kilder["katalog"]) == []


# ---------------------------------------------------------------------------
# Relasjonene
# ---------------------------------------------------------------------------


def test_relasjonsregisteret_er_gyldig(kilder):
    assert rel.valider(kilder["relasjoner"], kilder["katalog"], dm.funnregisteret()) == []


def test_hver_fremmednokkel_i_katalogen_har_en_oppforing(kilder):
    fk = set(rel.fremmednøkler(kilder["katalog"]))
    beskrevet = {rel.nøkkel(r) for r in kilder["relasjoner"]["relasjon"] if r["art"] == "fremmednøkkel"}
    assert fk, "Fant ingen fremmednøkler i katalogen; har lesingen sluttet å virke?"
    assert any(len(fra) > 1 for fra, _ in fk), "Fant ingen sammensatt fremmednøkkel; har lesingen sluttet å virke?"
    assert beskrevet == fk


def test_vakta_melder_sammensatt_fremmednokkel_fort_per_kolonne(kilder):
    """#590: en sammensatt nøkkel er én oppføring, så hver kolonne er dekket av den."""
    endret = copy.deepcopy(kilder["relasjoner"])
    sammensatt = next(r for r in endret["relasjon"] if r["fra"] == ["koe.notat.sak_id", "koe.notat.prosjekt_id"])
    endret["relasjon"].remove(sammensatt)
    endret["relasjon"] += [
        {**sammensatt, "fra": fra, "til": til} for fra, til in zip(sammensatt["fra"], sammensatt["til"])
    ]
    feil = rel.valider(endret, kilder["katalog"])
    assert "koe.notat.sak_id → koe.sak_metadata.sak_id: står som fremmednøkkel, men katalogen har ingen slik" in feil
    assert (
        "fremmednøkkelen koe.notat.(sak_id, prosjekt_id) → koe.sak_metadata.(sak_id, prosjekt_id) "
        "i katalogen mangler oppføring"
    ) in feil


def test_vakta_melder_logisk_kobling_paa_en_kolonne_i_sammensatt_fremmednokkel(kilder):
    """#590: en kolonne i en sammensatt fremmednøkkel håndheves av databasen, så den er ikke logisk."""
    feil = rel.valider(_logisk_fra_notat_sak_id(kilder), kilder["katalog"])
    assert (
        "koe.notat.sak_id → koe.sak_metadata.sak_id: står som logisk, men katalogen har fremmednøkkelen "
        "koe.notat.(sak_id, prosjekt_id) → koe.sak_metadata.(sak_id, prosjekt_id), som dekker den"
    ) in feil, feil


def _logisk_fra_notat_sak_id(kilder) -> dict:
    endret = copy.deepcopy(kilder["relasjoner"])
    sammensatt = next(r for r in endret["relasjon"] if r["fra"] == ["koe.notat.sak_id", "koe.notat.prosjekt_id"])
    endret["relasjon"].append({**sammensatt, "fra": "koe.notat.sak_id", "til": "koe.sak_metadata.sak_id", "art": "logisk"})
    return endret


def test_del_av_sammensatt_noekkel_med_nullbar_kolonne_er_ikke_haandhevet(kilder):
    """#635: under MATCH SIMPLE sjekkes ikke raden når en annen kolonne i nøkkelen er NULL."""
    katalog = copy.deepcopy(kilder["katalog"])
    rad = next(r for r in katalog["sqlserver"]["tabeller"]["koe.notat"]["kolonner"] if r[0] == "prosjekt_id")
    rad[2] = "NULL"
    feil = rel.valider(_logisk_fra_notat_sak_id(kilder), katalog)
    assert not any("står som logisk" in f for f in feil), feil


def test_del_av_sammensatt_noekkel_er_haandhevet_naar_bare_den_dekkede_kolonnen_er_nullbar(kilder):
    """#635: under MATCH SIMPLE sjekkes raden når den dekkede kolonnen har en verdi og
    resten av nøkkelen er NOT NULL, så koblingen er håndhevet og ikke logisk."""
    katalog = copy.deepcopy(kilder["katalog"])
    rad = next(r for r in katalog["sqlserver"]["tabeller"]["koe.notat"]["kolonner"] if r[0] == "sak_id")
    rad[2] = "NULL"
    feil = rel.valider(_logisk_fra_notat_sak_id(kilder), katalog)
    assert any("står som logisk" in f for f in feil), feil


def test_er_diagrammet_merker_logisk_kobling_fra_kolonne_i_annen_fremmednokkel(kilder):
    """#635: diagrammet avgjør «håndhevet» etter kolonneparene i én nøkkel, som `valider()`."""
    endret = copy.deepcopy(kilder["relasjoner"])
    sammensatt = next(r for r in endret["relasjon"] if r["fra"] == ["koe.notat.sak_id", "koe.notat.prosjekt_id"])
    endret["relasjon"].append({**sammensatt, "fra": "koe.notat.sak_id", "til": "koe.app_users.id", "art": "logisk"})
    assert not any("står som logisk" in f for f in rel.valider(endret, kilder["katalog"]))
    diagram = rel.er_diagram(endret, kilder["katalog"])
    notat = diagram.split("    koe_notat {\n", 1)[1].split("    }", 1)[0]
    assert '        nvarchar_36 sak_id FK "uten fremmednøkkel"' in notat.splitlines(), notat


def test_vakta_melder_sammensatt_nokkel_med_ulike_ender(kilder):
    endret = copy.deepcopy(kilder["relasjoner"])
    sammensatt = next(r for r in endret["relasjon"] if rel.tabell(r, "fra") == "koe.leveringsoppdrag" and r["art"] == "fremmednøkkel")
    sammensatt["til"] = sammensatt["til"][:2]
    feil = rel.valider(endret, kilder["katalog"])
    assert any("fra og til har ulikt antall kolonner" in f for f in feil), feil


def test_vakta_melder_fremmednokkel_uten_oppforing(kilder):
    endret = {**kilder["relasjoner"], "relasjon": _uten(kilder["relasjoner"]["relasjon"], fra="koe.app_identities.user_id")}
    feil = rel.valider(endret, kilder["katalog"])
    assert "fremmednøkkelen koe.app_identities.user_id → koe.app_users.id i katalogen mangler oppføring" in feil, feil


def test_vakta_melder_logisk_kobling_ført_som_fremmednokkel(kilder):
    endret = copy.deepcopy(kilder["relasjoner"])
    next(r for r in endret["relasjon"] if r["fra"] == "koe.kvittering.aktor_id")["art"] = "fremmednøkkel"
    feil = rel.valider(endret, kilder["katalog"])
    assert any(f.startswith("koe.kvittering.aktor_id → koe.app_users.id: står som fremmednøkkel, men katalogen har ingen slik") for f in feil), feil


def test_vakta_melder_nokkelkolonne_uten_relasjon_eller_begrunnelse(kilder):
    skjema = copy.deepcopy(kilder["katalog"])
    skjema["sqlserver"]["tabeller"]["koe.hendelse"]["kolonner"].append(["godkjent_av", "nvarchar(36)", "NULL"])
    feil = rel.valider(kilder["relasjoner"], skjema)
    assert any(f.startswith("koe.hendelse.godkjent_av:") for f in feil), feil

    endret = {
        **kilder["relasjoner"],
        "uten_relasjon": _uten(kilder["relasjoner"]["uten_relasjon"], kolonne="koe.app_users.email"),
    }
    assert any(f.startswith("koe.app_users.email:") for f in rel.valider(endret, kilder["katalog"]))


def test_vakta_melder_kolonne_som_ikke_finnes(kilder):
    endret = copy.deepcopy(kilder["relasjoner"])
    next(r for r in endret["relasjon"] if r["fra"] == "koe.kvittering.aktor_id")["fra"] = "koe.kvittering.aktor"
    feil = rel.valider(endret, kilder["katalog"])
    assert any("kolonnen koe.kvittering.aktor finnes ikke" in f for f in feil), feil


# ---------------------------------------------------------------------------
# Dataflyten
# ---------------------------------------------------------------------------


def test_dataflyten_er_gyldig(kilder, tabellregister):
    assert df.valider(kilder["dataflyt"], kilder["katalog"], tabellregister, dm.funnregisteret()) == []


def test_dataflyten_viser_bare_til_ts_serveren(kilder):
    """#49: kallene fra backend/ er tatt ut med Python-stien."""
    koder = {k for f in kilder["dataflyt"]["flyt"] for s in f["steg"] for k in s["kode"]}
    assert koder, "Fant ingen kodereferanser; har lesingen sluttet å virke?"
    assert {k for k in koder if not k.startswith("server/")} == set()


def test_vakta_melder_kode_i_python_og_en_seksjon_den_ikke_kjenner(kilder, tabellregister):
    """#49: en henvisning til backend/ og seksjonene `uten_flyt` og `autentisering` fra
    Python-stien avvises."""
    endret = copy.deepcopy(kilder["dataflyt"])
    endret["flyt"][0]["steg"][0]["kode"] = ["backend/routes/catenda_webhook_routes.py:webhook"]
    endret["uten_flyt"] = [{"fil": "backend/scripts/catenda_admin.py", "begrunnelse": "x"}]
    endret["autentisering"] = ["authenticate"]
    feil = df.valider(endret, kilder["katalog"], tabellregister)
    assert any("er ikke på formen server/…/fil.ts:symbol" in f for f in feil), feil
    assert "autentisering: ukjent seksjon" in feil
    assert "uten_flyt: ukjent seksjon" in feil


def test_vakta_melder_ts_symbol_som_ikke_er_deklarert(kilder, tabellregister):
    endret = _med_kode(kilder, "server/innlogging.ts:finnesIkke")
    feil = df.valider(endret, kilder["katalog"], tabellregister)
    assert any("finnesIkke er ikke definert i server/innlogging.ts" in f for f in feil), feil


def _med_kode(kilder, kode: str) -> dict:
    endret = copy.deepcopy(kilder["dataflyt"])
    endret["flyt"][0]["steg"][0]["kode"] = [kode]
    return endret


def test_dataflyten_godtar_kode_i_ts_serveren(kilder, tabellregister):
    """#713: `server/…/fil.ts:symbol` er en gyldig henvisning når symbolet er deklarert i fila."""
    endret = _med_kode(kilder, "server/innlogging.ts:catendaIdentitet")
    assert df.valider(endret, kilder["katalog"], tabellregister) == []


def test_vakta_melder_ts_fil_som_ikke_finnes(kilder, tabellregister):
    endret = _med_kode(kilder, "server/finnes_ikke.ts:catendaIdentitet")
    feil = df.valider(endret, kilder["katalog"], tabellregister)
    assert any("fila server/finnes_ikke.ts finnes ikke" in f for f in feil), feil


def test_ts_symbol_som_bare_brukes_i_fila_er_ikke_deklarert():
    """Et kall eller en lokal variabel er ikke en deklarasjon på toppnivå."""
    assert "catendaIdentitet" in df.definisjoner("server/innlogging.ts")
    assert "bruker" not in df.definisjoner("server/innlogging.ts")


TS_KILDE = """export const enum Kode { A }
export abstract class Lager {}
function*generator() {}
const sql = `
const iMalen = 1
${verdi(`
const iNestetMal = 2`)}
const fortsatt = 3`;
/*
const kommentert = 4
*/
const s = "/* ikke en kommentar"; const x = 5
export const etter = 6
"""


def test_ts_deklarasjonene_leses_utenom_kommentarer_og_malstrenger():
    """#861: `const enum`, `abstract class` og `function*` gir navnet, og en linje som
    begynner med `const` i en SQL-mal eller en blokkommentar, er ikke en deklarasjon."""
    assert set(df.TS_DEKLARASJON.findall(df._ts_kode(TS_KILDE))) == {
        "Kode", "Lager", "generator", "sql", "s", "etter"
    }


def test_dataflyt_bruker_samme_relasjonsmodul_som_datamodell():
    """#635, #861: lasteren gir samme relasjonsmodul i samme omfang."""
    assert df.rel is dm.rel


# ---------------------------------------------------------------------------
# Kallene til Catenda uten pil (#1718)
# ---------------------------------------------------------------------------

CATENDA_TS = (df.ROT / df.CATENDAKLIENT).read_text(encoding="utf-8")


def _serverfiler(**endret: str) -> dict[str, str]:
    filer = df._serverfiler()
    filer.update({f"server/{navn.replace('__', '.')}": tekst for navn, tekst in endret.items()})
    return filer


def _catenda_med(metode: str) -> str:
    """catenda.ts med `metode` lagt til nederst i CatendaOAuth."""
    slutt = CATENDA_TS.index("\n}\n", CATENDA_TS.index("export class CatendaOAuth"))
    return CATENDA_TS[:slutt] + "\n" + metode + CATENDA_TS[slutt:]


def test_hvert_kall_til_catenda_i_serveren_har_en_pil(kilder):
    assert df.kall_uten_pil(kilder["dataflyt"]) == []


def test_vakta_finner_kallene_bak_hvert_forespoersel_i_klienten():
    """Hvert `forespoersel(` i klienten gir minst ett kall, også når stien er en parameter
    som følges til kallerne, i fila og i server/registrering.ts."""
    kall, feil = df.catendakall()
    assert feil == []
    steder = {hvor for _, _, hvor in kall}
    assert len(steder) == len(re.findall(r"(?<!function )forespoersel\(", CATENDA_TS)) == 12
    stier = {(metode, sti) for metode, sti, _ in kall}
    assert {
        ("POST", "/oauth2/token"),
        ("GET", "/v2/projects"),
        ("GET", "/v2/projects/{}/teams"),
        ("GET", "/opencde/bcf/3.0/projects/{}"),
        ("GET", "/opencde/bcf/3.0/projects/{}/topics/{}"),
        ("POST", "/v2/projects/{}/libraries/{}/items"),
    } <= stier


def test_vakta_melder_et_nytt_kall_uten_pil(kilder):
    filer = _serverfiler(catenda__ts=_catenda_med(
        "  async slettTopic(boardId: string, topicId: string, token: string): Promise<void> {\n"
        "    await forespoersel(this.#oppsett, 'POST', `${topicsti(boardId, topicId)}/slett`, { token });\n"
        "  }"
    ))
    assert df.kall_uten_pil(kilder["dataflyt"], filer) == [
        "server/catenda.ts:slettTopic: POST /opencde/bcf/3.0/projects/{}/topics/{}/slett har ingen pil i dataflyt.toml"
    ]


def test_vakta_melder_en_ny_kaller_av_samling_i_en_annen_fil(kilder):
    """Stien i `samling` er en parameter, så kallet avgjøres hos kalleren."""
    filer = _serverfiler(ny__ts=(
        "export async function modeller(oauth: CatendaOAuth, token: string, p: string) {\n"
        "  return oauth.samling(`/v2/projects/${p}/ifc`, token);\n"
        "}\n"
    ))
    assert df.kall_uten_pil(kilder["dataflyt"], filer) == [
        "server/catenda.ts:samling: GET /v2/projects/{}/ifc har ingen pil i dataflyt.toml"
    ]


def test_vakta_melder_et_kall_naar_pilen_tas_ut(kilder):
    endret = copy.deepcopy(kilder["dataflyt"])
    c26 = next(f for f in endret["flyt"] if f["id"] == "C26")
    c26["steg"] = [s for s in c26["steg"] if s["endepunkt"] != "GET /v2/projects (sidevis)"]
    assert df.kall_uten_pil(endret) == ["server/catenda.ts:samling: GET /v2/projects har ingen pil i dataflyt.toml"]


def test_vakta_melder_en_sti_den_ikke_kan_avgjoere(kilder):
    filer = _serverfiler(catenda__ts=_catenda_med(
        "  async noe(token: string): Promise<unknown> {\n"
        "    return forespoersel(this.#oppsett, 'GET', stiFraMiljoe(), { token });\n"
        "  }"
    ))
    feil = df.kall_uten_pil(kilder["dataflyt"], filer)
    assert feil == ["server/catenda.ts:noe: stien 'stiFraMiljoe()' kan ikke avgjøres (stiFraMiljoe())"], feil


@pytest.mark.parametrize(
    "kilde",
    [
        "export async function hent() {\n  return fetch('https://api.catenda.com/v2/user');\n}\n",
        "export async function hent() {\n  return globalThis.fetch('https://api.catenda.com/v2/user');\n}\n",
        "const hent = fetch;\n",
        "export async function hent() {\n  return fetch ('https://api.catenda.com/v2/user');\n}\n",
    ],
    ids=["fetch", "globalThis.fetch", "alias", "mellomrom"],
)
def test_vakta_melder_fetch_utenfor_klienten(kilder, kilde):
    """Code-review av #1718: `globalThis.fetch` og et alias gikk forbi."""
    assert df.kall_uten_pil(kilder["dataflyt"], _serverfiler(ny__ts=kilde)) == [
        "server/ny.ts: fetch utenfor forespoersel i server/catenda.ts og utenfor ANDRE_TJENESTER"
    ]


@pytest.mark.parametrize(
    ("metode", "grunn"),
    [
        (
            "  async to(a: boolean, token: string): Promise<void> {\n"
            "    if (a) {\n      const sti = '/v2/user';\n      await forespoersel(this.#oppsett, 'GET', sti, { token });\n"
            "    } else {\n      const sti = '/v2/hemmelig';\n      await forespoersel(this.#oppsett, 'GET', sti, { token });\n    }\n  }",
            "stien 'sti' kan ikke avgjøres (sti)",
        ),
        (
            "  async pil(sti: string, token: string): Promise<void> {\n"
            "    const hent = (sti: string) => forespoersel(this.#oppsett, 'GET', sti, { token });\n"
            "    await hent(`${sti}/ifc`);\n  }",
            "stien 'sti' kan ikke avgjøres (sti bindes flere steder i pil)",
        ),
        (
            "  async endret(sti: string, token: string): Promise<void> {\n"
            "    sti += '/ifc';\n    await forespoersel(this.#oppsett, 'GET', sti, { token });\n  }",
            "stien 'sti' kan ikke avgjøres (sti bindes flere steder i endret)",
        ),
    ],
    ids=["const-i-to-blokker", "pilfunksjon", "tilordning"],
)
def test_vakta_melder_en_sti_med_flere_bindinger(kilder, metode, grunn):
    """Code-review av #1718: den første bindingen ble lest, og kallet gikk forbi."""
    feil = df.kall_uten_pil(kilder["dataflyt"], _serverfiler(catenda__ts=_catenda_med(metode)))
    assert any(f.endswith(grunn) for f in feil), feil
    assert all("har ingen pil" not in f for f in feil), feil


RAA = (
    "\nexport async function raa(o: CatendaOppsett, sti: string): Promise<unknown> {\n"
    "  return forespoersel(o, 'GET', sti, {});\n}\n"
)


def test_vakta_foelger_en_funksjon_paa_toppnivaa_til_kallerne_i_andre_filer(kilder):
    """Code-review av #1718: kallerne utenfor klienten ble ikke lest."""
    filer = _serverfiler(
        catenda__ts=CATENDA_TS + RAA,
        z__ts="export const x = () => raa(oppsett, '/v2/hemmelig');\n",
    )
    assert df.kall_uten_pil(kilder["dataflyt"], filer) == [
        "server/catenda.ts:raa: GET /v2/hemmelig har ingen pil i dataflyt.toml"
    ]


def test_vakta_godtar_en_import_over_flere_linjer(kilder):
    filer = _serverfiler(
        catenda__ts=CATENDA_TS + RAA,
        z__ts="import {\n  raa,\n} from './catenda.ts';\nexport const x = () => raa(oppsett, '/v2/user');\n",
    )
    assert df.kall_uten_pil(kilder["dataflyt"], filer) == []


def test_vakta_melder_en_import_med_et_annet_navn(kilder):
    filer = _serverfiler(
        catenda__ts=CATENDA_TS + RAA,
        z__ts="import { raa as r } from './catenda.ts';\nexport const x = () => r(oppsett, '/v2/hemmelig');\n",
    )
    feil = df.kall_uten_pil(kilder["dataflyt"], filer)
    assert any(f.endswith("(server/z.ts: raa importeres med et annet navn)") for f in feil), feil


def test_vakta_melder_en_const_uten_tilordning(kilder):
    """Code-review av #1718: `for (const sti of …)` velte vakta."""
    filer = _serverfiler(catenda__ts=_catenda_med(
        "  async alle(token: string): Promise<void> {\n"
        "    for (const sti of ['/v2/hemmelig']) await forespoersel(this.#oppsett, 'GET', sti, { token });\n  }"
    ))
    assert df.kall_uten_pil(kilder["dataflyt"], filer) == [
        "server/catenda.ts:alle: stien 'sti' kan ikke avgjøres (sti)"
    ]


def test_vakta_melder_en_funksjon_som_brukes_uten_aa_kalles(kilder):
    filer = _serverfiler(z__ts="export function hent(o: CatendaOAuth) {\n  return o.samling;\n}\n")
    feil = df.kall_uten_pil(kilder["dataflyt"], filer)
    assert "server/z.ts: samling brukes uten å kalles" in " ".join(feil), feil


def test_hver_pil_med_et_kall_har_et_kall_i_serveren(kilder):
    """Code-review av #1718: en pil uten kall kan dekke et nytt kall til samme sti."""
    assert df.piler_uten_kall(kilder["dataflyt"]) == []
    filer = _serverfiler(catenda__ts=CATENDA_TS.replace("this.samling('/v2/projects', token)", "this.samling('/v2/mine', token)"))
    assert df.piler_uten_kall(kilder["dataflyt"], filer) == ["GET /v2/projects"]


def test_vakta_melder_pil_som_ikke_berorer_catenda(kilder, tabellregister):
    endret = copy.deepcopy(kilder["dataflyt"])
    endret["flyt"][0]["steg"][0] = {**endret["flyt"][0]["steg"][0], "fra": "koe.hendelse", "til": ["koe.notat"]}
    feil = df.valider(endret, kilder["katalog"], tabellregister)
    assert any("må gå fra eller til Catenda" in f for f in feil), feil


def test_vakta_melder_pil_til_en_tabell_som_ikke_finnes(kilder, tabellregister):
    """#49: en pil til en tabell i PostgreSQL er ikke lenger en kjent node."""
    endret = copy.deepcopy(kilder["dataflyt"])
    endret["flyt"][0]["steg"][0] = {**endret["flyt"][0]["steg"][0], "til": ["hendelse"]}
    feil = df.valider(endret, kilder["katalog"], tabellregister)
    assert any("'hendelse' er verken en tabell" in f for f in feil), feil


def test_kvittering_er_ikke_data_fra_catenda():
    """En pil fra «svar på kallene» er hvordan kallet gikk, ikke data fra Catenda."""
    register = {
        "flyt": [
            {
                "id": "C99",
                "steg": [
                    {"fra": "catenda:svar", "til": ["koe.leveringskvittering"]},
                    {"fra": "catenda:topic", "til": ["koe.sak_catenda_topic"]},
                ],
            }
        ]
    }
    per_tabell = df.flyter_per_tabell(register)
    assert per_tabell["koe.leveringskvittering"] == {"fra": [], "til": [], "kvittering": ["C99"]}
    assert per_tabell["koe.sak_catenda_topic"]["fra"] == ["C99"]


def test_vakta_melder_nei_i_kolonne_6_som_dataflyten_motsier(kilder, tabellregister):
    endret = copy.deepcopy(tabellregister)
    next(t for t in endret["tabell"] if t["navn"] == "koe.innkommende_hendelse")["fra_catenda"] = "Nei."
    feil = dm.kontroller_relasjoner(endret, kilder)
    assert any(f.startswith("koe.innkommende_hendelse: fra_catenda sier «Nei»") for f in feil), feil


# ---------------------------------------------------------------------------
# De genererte filene
# ---------------------------------------------------------------------------


def test_relasjoner_md_er_generert_fra_registrene(tabellregister, kilder):
    assert dm.RELASJONER.read_text(encoding="utf-8") == dm.relasjoner_markdown(tabellregister, kilder), (
        "relasjoner.md er utdatert. Kjør /tmp/venv/bin/python docs/verktoy/datamodell.py fra repo-roten."
    )


def test_excel_har_arkene_relasjoner_og_dataflyt(kilder):
    """Kilde: oppdragsgivers svar 29.09 (gjennomføringsnotatet for spor M, 1c)."""
    ark = dm.excel_verdier(dm.EXCEL)
    assert ark["Relasjoner"][0] == rel.RELASJONSKOLONNER
    assert ark["Dataflyt"][0] == df.DATAFLYTKOLONNER
    assert len(ark["Relasjoner"]) == len(kilder["relasjoner"]["relasjon"]) + 1
    assert len(ark["Dataflyt"]) == len(df.piler(kilder["dataflyt"])) + 1
    assert all(rad[7] for rad in ark["Dataflyt"][1:]), "En pil uten kode"


def test_excel_har_ikke_lenger_arkene_om_pythons_hendelser():
    """#49: «Hendelsestyper» og «Hendelsesfelt» kom fra Pythons modeller."""
    assert list(dm.excel_verdier(dm.EXCEL)) == [
        "Tabeller",
        "Relasjoner",
        "Dataflyt",
        "Utenfor databasene",
        "Kjernehendelser",
        "Om registeret",
    ]


def test_kolonne_6_og_7_lages_fra_dataflyten_og_relasjonsregisteret():
    """Fastholder formen kolonne 6 og 7 fikk i 1c; teksten er ikke lenger skrevet for hånd."""
    rader = {rad[0]: rad for rad in dm.excel_verdier(dm.EXCEL)["Tabeller"][1:]}
    assert "aktor_id → koe.app_users.id (fremmednøkkel, ON DELETE NO ACTION)" in rader["koe.hendelse"][6]
    assert "Dataflyt: fra Catenda i C21" in rader["koe.innkommende_hendelse"][5]


def test_driftsflytene_tegnes_bare_i_driftsdiagrammet(kilder, tabellregister):
    """Kilde: oppdragsgivers svar 29.09 (gjennomføringsnotatet for spor M, 1c)."""
    drift = [f["id"] for f in kilder["dataflyt"]["flyt"] if f.get("drift")]
    assert drift, "Ingen flyt er merket som drift"
    tegnet = {
        retning: df.flytdiagram(kilder["dataflyt"], kilder["katalog"], tabellregister, retning)
        for retning in ("inn", "ut", "drift")
    }
    for fid in drift:
        assert f'"{fid}.' in tegnet["drift"]
        assert f'"{fid}.' not in tegnet["inn"] + tegnet["ut"]
    assert '"C22.' in tegnet["inn"] and '"C22.' not in tegnet["drift"]


def test_kolonneetiketten_har_ikke_tabellnavnet_i_sql_server(kilder):
    """#592: tabellnavnet i SQL Server har selv et punktum (`koe.hendelse`), så etiketten er
    kolonnen og ikke `hendelse.aktor_id`. En sammensatt nøkkel står med alle kolonnene (#590)."""
    tekst = rel.tabelltekst(kilder["relasjoner"], kilder["katalog"], "koe.hendelse")
    assert "Viser til: (sak_id, prosjekt_id) → koe.sak_metadata.(sak_id, prosjekt_id) (fremmednøkkel" in tekst
    assert "; aktor_id → koe.app_users.id (fremmednøkkel" in tekst
    rader = rel.relasjonsrader(kilder["relasjoner"], kilder["katalog"])
    assert ["koe.hendelse", "aktor_id", "koe.app_users", "id"] in [rad[:4] for rad in rader]


def test_sammensatt_fremmednokkel_er_en_kant_i_er_diagrammet(kilder):
    """#590: kanten mellom brevet og saken er én, med begge kolonnene i etiketten."""
    diagram = rel.er_diagram(kilder["relasjoner"], kilder["katalog"])
    kanter = [linje for linje in diagram.splitlines() if linje.startswith("    koe_sak_metadata ") and "koe_hendelse" in linje]
    assert kanter == ['    koe_sak_metadata ||--o{ koe_hendelse : "(sak_id, prosjekt_id)"']
