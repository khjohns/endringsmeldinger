"""Bevis-sakene i docs/domenetabell/ som forespørsler og kontroller (#271).

Korpuset er språkuavhengig. Her blir handlingene forespørsler slik
`/api/events` tar imot dem, og kontrollene leses mot tilstanden slik API-et
sender den. Domenebanen kjører dem i minnet; databasebanen i
`tests/test_database/test_domenetabell_lagring.py` sender de samme
forespørslene gjennom ruta.
"""

import copy
import importlib.util
import pathlib

import pytest

from api.validators import ValidationError, validate_event_data
from constants.frist_foresporsel import FAST_TEKST
from models.events import SporStatus, parse_event_from_request
from regler import REGELVERSJON
from regler.frist import Fristkrav, Fristvurdering, beregn_frist
from regler.vederlag import Vederlagskrav, Vederlagsvurdering, beregn_vederlag
from routes.event_routes import enrich_event_with_version
from services.approval_service import claims
from services.business_rules import BusinessRuleValidator

ROT = pathlib.Path(__file__).resolve().parents[3]


def _verktoy():
    spesifikasjon = importlib.util.spec_from_file_location(
        "domenetabell", ROT / "docs" / "verktoy" / "domenetabell.py"
    )
    modul = importlib.util.module_from_spec(spesifikasjon)
    spesifikasjon.loader.exec_module(modul)
    return modul


verktoy = _verktoy()
REGLER, KORPUS = verktoy.les()

# Navnene i korpuset er domenets; feltene er dem `FristResponsData` har.
FRISTVURDERINGER = {
    "varsel_i_tide": "frist_varsel_ok",
    "spesifisering_i_tide": "spesifisert_krav_ok",
    "foresporselssvar_i_tide": "foresporsel_svar_ok",
    "hindring": "vilkar_oppfylt",
}
INAKTIV = {SporStatus.IKKE_RELEVANT, SporStatus.UTKAST, SporStatus.TRUKKET}


def _verdi(v):
    return getattr(v, "value", v)


def _brev(sak_id, tekst):
    seksjon = {"tittel": "Begrunnelse", "originalTekst": tekst, "redigertTekst": tekst}
    return {
        "tittel": "Forespørsel om spesifisert krav om fristforlengelse",
        "mottaker": {"navn": "TE", "rolle": "TE"},
        "avsender": {"navn": "BH", "rolle": "BH"},
        "referanser": {
            "sakId": sak_id,
            "sakstittel": "Domenetabell",
            "eventId": "utkast",
            "sporType": "frist",
            "dato": "2026-10-08",
        },
        "seksjoner": {"innledning": seksjon, "begrunnelse": seksjon, "avslutning": seksjon},
    }


def _fristkrav(event_type, h, varsel_type="spesifisert"):
    data = {"varsel_type": varsel_type, "begrunnelse": "Hindret"}
    if "dager" in h:
        data["antall_dager"] = h["dager"]
        data["spesifisert_varsel"] = {"dato_sendt": "2026-09-20", "metode": ["epost"]}
    if "varseldato" in h:
        data["frist_varsel"] = {"dato_sendt": h["varseldato"], "metode": ["epost"]}
    return {"event_type": event_type, "data": data}


def _vederlagssvar(h, sak, revidert):
    vurderinger = {"hovedkrav_vurdering": h["vurdering"], "aksepterer_metode": True}
    if "godkjent_belop" in h:
        vurderinger["hovedkrav_godkjent_belop"] = h["godkjent_belop"]
    r = beregn_vederlag(Vederlagskrav.fra_tilstand(sak), Vederlagsvurdering(**vurderinger))
    data = {
        **vurderinger,
        "regelversjon": REGELVERSJON,
        "begrunnelse": "Vurdert",
        "beregnings_resultat": _verdi(r.beregnings_resultat),
        "total_godkjent_belop": float(r.total_godkjent_belop),
        "total_krevd_belop": float(r.total_krevd_belop),
        "hovedkrav_godkjent_belop": float(r.hovedkrav_godkjent_belop),
    }
    if r.subsidiaer_triggers:
        data["subsidiaer_triggers"] = [_verdi(t) for t in r.subsidiaer_triggers]
    if revidert:
        data["original_respons_id"] = sak.vederlag.respons_event_id
    else:
        data["vederlag_krav_id"] = sak.vederlag.krav_event_id
    return {
        "event_type": "respons_vederlag_oppdatert" if revidert else "respons_vederlag",
        "refererer_til_event_id": sak.vederlag.krav_event_id,
        "data": data,
    }


def _fristsvar(h, sak):
    """Et spørsmål handlingen ikke nevner, er utelatt i svaret (KA-U4)."""
    vurderinger = {felt: h[navn] for navn, felt in FRISTVURDERINGER.items() if navn in h}
    vurderinger["godkjent_dager"] = h.get("dager", sak.frist.krevd_dager)
    r = beregn_frist(Fristkrav.fra_tilstand(sak), Fristvurdering(**vurderinger))
    data = {k: v for k, v in vurderinger.items() if k != "godkjent_dager"}
    data.update(
        regelversjon=REGELVERSJON,
        begrunnelse="Vurdert",
        frist_krav_id=sak.frist.krav_event_id,
        beregnings_resultat=_verdi(r.beregnings_resultat),
        godkjent_dager=r.godkjent_dager,
    )
    if r.subsidiaer_triggers:
        data["subsidiaer_triggers"] = [_verdi(t) for t in r.subsidiaer_triggers]
    if r.subsidiaer_resultat is not None:
        data["subsidiaer_resultat"] = _verdi(r.subsidiaer_resultat)
        data["subsidiaer_godkjent_dager"] = r.subsidiaer_godkjent_dager
    return {
        "event_type": "respons_frist",
        "refererer_til_event_id": sak.frist.krav_event_id,
        "data": data,
    }


EO_HANDLINGER = {
    "eo_utkast": ("BH", "eo_opprettet"),
    "eo_utstedelse": ("BH", "eo_utstedt"),
    "eo_aksept": ("TE", "eo_akseptert"),
    "eo_bestridelse": ("TE", "eo_bestridt"),
    "eo_revisjon": ("BH", "eo_revidert"),
    "eo_tilknytning": ("BH", "eo_koe_lagt_til"),
    "eo_frakobling": ("BH", "eo_koe_fjernet"),
}


def _endringsordre(h: dict) -> tuple[str, dict]:
    """KOE-sakene i `h["koe"]` er sak-ID-er; `kjor` har byttet ut `$navn`."""
    rolle, hendelse = EO_HANDLINGER[h["handling"]]
    navn = h["handling"]
    ordre = {"eo_nummer": h.get("nummer", "EO-001"), "beskrivelse": "Endret fundamentering"}
    if navn == "eo_utkast":
        data = {**ordre, "relaterte_koe_saker": h.get("koe", [])}
    elif navn == "eo_utstedelse":
        data = {**ordre, "revisjon_nummer": 0}
        if "belop" in h:
            data["vederlag"] = {"metode": "FASTPRIS_TILBUD", "belop_direkte": h["belop"]}
        if "dager" in h:
            data["frist_dager"] = h["dager"]
        data["konsekvenser"] = {"pris": "belop" in h, "fremdrift": "dager" in h}
        if "koe" in h:
            data["relaterte_koe_saker"] = h["koe"]
    elif navn == "eo_aksept":
        data = {"akseptert": True}
    elif navn == "eo_bestridelse":
        data = {"begrunnelse": "Uenig i beløpet"}
    elif navn == "eo_revisjon":
        data = {"ny_revisjon_nummer": h["revisjon"], "endringer_beskrivelse": "Revidert beløp"}
    else:
        data = {"koe_sak_id": h["koe"]}
    return rolle, {"event_type": hendelse, "data": data}


def foresporsel(h: dict, sak, sak_id: str) -> tuple[str, dict]:
    """Rollen og forespørselen `/api/events` tar imot for handlingen `h`."""
    navn = h["handling"]
    if navn in ("grunnlag", "grunnlag_ny_versjon"):
        return "TE", {
            "event_type": "grunnlag_oppdatert" if navn == "grunnlag_ny_versjon" else "grunnlag_opprettet",
            "data": {
                "tittel": "Endret fundamentering",
                "hovedkategori": "ENDRING",
                "underkategori": h["underkategori"],
                "beskrivelse": "Byggherren endret fundamenteringen.",
                "dato_oppdaget": "2026-09-01",
            },
        }
    if navn == "grunnlagssvar":
        data = {"resultat": h["resultat"], "begrunnelse": "Vurdert", "regelversjon": REGELVERSJON}
        if "varslet_i_tide" in h:
            data["grunnlag_varslet_i_tide"] = h["varslet_i_tide"]
        return "BH", {
            "event_type": "respons_grunnlag",
            "refererer_til_event_id": sak.grunnlag.krav_event_id,
            "data": data,
        }
    if navn in ("vederlagskrav", "vederlagskrav_ny_versjon"):
        return "TE", {
            "event_type": "vederlag_krav_oppdatert"
            if navn == "vederlagskrav_ny_versjon"
            else "vederlag_krav_sendt",
            "data": {"metode": "FASTPRIS_TILBUD", "belop_direkte": h["belop"], "begrunnelse": "Kostnader"},
        }
    if navn == "konsekvensvarsel":
        tekst = "Rigg og drift øker."
        return "TE", {
            "event_type": "vederlag_krav_sendt",
            "data": {"varsel_type": "varsel", "begrunnelse": tekst, "varsler": {h["type"]: tekst}},
        }
    if navn in ("vederlagssvar", "vederlagssvar_revidert"):
        return "BH", _vederlagssvar(h, sak, revidert=navn == "vederlagssvar_revidert")
    if navn == "fristvarsel":
        return "TE", _fristkrav("frist_krav_sendt", h, varsel_type="varsel")
    if navn == "fristkrav":
        return "TE", _fristkrav("frist_krav_sendt", h)
    if navn == "fristkrav_spesifisert":
        return "TE", _fristkrav("frist_krav_spesifisert", h)
    if navn == "fristsvar":
        return "BH", _fristsvar(h, sak)
    if navn == "foresporsel":
        tekst = f"<p>{FAST_TEKST}</p>"
        return "BH", {
            "event_type": "frist_foresporsel_sendt",
            "refererer_til_event_id": sak.frist.krav_event_id,
            "data": {
                "frist_krav_id": sak.frist.krav_event_id,
                "begrunnelse": tekst,
                "vedlegg_ids": [],
                "brev": _brev(sak_id, tekst),
            },
        }
    if navn in EO_HANDLINGER:
        return _endringsordre(h)
    if navn == "aksept":
        # TE godtar svaret TE har sett: det siste i sporet, også når det
        # gjelder en tidligere kravversjon (KA-07). Regelen avgjør om det er
        # gjeldende (KA-U1).
        return "TE", {
            "event_type": "te_aksepterer_respons",
            "spor": h["spor"],
            "refererer_til_event_id": getattr(sak, h["spor"]).respons_event_id,
            "data": {},
        }
    if navn == "trekk":
        hendelse = "grunnlag_trukket" if h["spor"] == "grunnlag" else f"{h['spor']}_krav_trukket"
        return "TE", {"event_type": hendelse, "data": {"begrunnelse": "Trukket"}}
    raise ValueError(f"Ukjent handling {navn!r}")


def bygg_hendelse(h: dict, sak, sak_id: str):
    """Det `/api/events` gjør før lagring: validering av data, parsing med
    serverstemplede felt, forretningsreglene og versjonsfeltene.

    Gir `(hendelse, None)` eller `(None, melding)` ved avvisning.
    """
    rolle, foresporsel_ = foresporsel(h, sak, sak_id)
    data = copy.deepcopy(foresporsel_["data"])
    try:
        validate_event_data(foresporsel_["event_type"], data)
        hendelse = parse_event_from_request(
            {**foresporsel_, "data": data, "sak_id": sak_id, "aktor_id": rolle.lower(), "aktor_rolle": rolle}
        )
    except (ValidationError, ValueError) as feil:
        return None, str(feil)
    resultat = BusinessRuleValidator().validate(hendelse, sak)
    if not resultat.is_valid:
        return None, f"{resultat.violated_rule}: {resultat.message}"
    return enrich_event_with_version(hendelse, sak), None


def les_sti(tilstand: dict, sti: str):
    verdi = tilstand
    for del_ in sti.split("."):
        verdi = verdi[del_]
    return verdi


def stemmer(faktisk, forventet) -> bool:
    if isinstance(forventet, dict) and "ikke" in forventet:
        return faktisk != forventet["ikke"]
    if isinstance(forventet, dict) and "inneholder" in forventet:
        return forventet["inneholder"] in (faktisk or [])
    return faktisk == forventet


def godkjenningens_krav_avviker(sak, hendelser: list[dict]) -> dict:
    """Spor der `claims()` og projeksjonen er uenige om gjeldende krav, mens
    kravet kan besvares (INV-GJELDENDE-KRAV, KA-U2)."""
    refs = claims(hendelser)
    avvik = {}
    for navn in ("grunnlag", "vederlag", "frist"):
        spor = getattr(sak, navn)
        besvarbart = spor.krav_event_id and spor.status not in INAKTIV
        if navn == "frist":
            besvarbart = besvarbart and spor.kravet_er_spesifisert
        if besvarbart and refs.get(navn) != spor.krav_event_id:
            avvik[navn] = (refs.get(navn), spor.krav_event_id)
    return avvik


def steg_med_prefiks(forlop: dict) -> tuple[list, list]:
    prefiks = KORPUS["prefikser"][forlop["start"]] if forlop["start"] else []
    return copy.deepcopy(prefiks), copy.deepcopy(forlop["steg"])


HOVED = verktoy.HOVED


def er_flersak(forlop: dict) -> bool:
    return bool(forlop.get("saker"))


def saker(forlop: dict, ny_bane) -> dict:
    """Én bane per sak i forløpet. `ny_bane(sakstype)` oppretter saken.

    Hovedsaken har forløpets `sakstype` og prefikset; de andre står i `saker`.
    """
    baner = {HOVED: ny_bane(forlop.get("sakstype", "standard"))}
    for navn, sakstype in forlop.get("saker", {}).items():
        baner[navn] = ny_bane(sakstype)
    return baner


def med_sak_id(verdi, baner: dict):
    """`$navn` i en handling eller en forventning er sak-ID-en til saken `navn`."""
    if isinstance(verdi, str) and verdi.startswith("$"):
        return baner[verdi[1:]].sak_id
    if isinstance(verdi, list):
        return [med_sak_id(v, baner) for v in verdi]
    if isinstance(verdi, dict):
        return {k: med_sak_id(v, baner) for k, v in verdi.items()}
    return verdi


def _uten_sak(h: dict) -> dict:
    return {k: v for k, v in h.items() if k != "sak"}


def kjor(forlop: dict, ny_bane) -> None:
    """Kjør forløpet i banen og kontroller forventningene.

    En bane har `sak_id`, `send(h) -> (godtatt, melding)`, `prov(h)`,
    `tilstand()` som tilstanden API-et sender (`public_state`), `journal()` og
    `lagret(hendelsestype)`. `ny_bane(sakstype)` gir én bane per sak; et steg
    eller en kontroll med `sak` gjelder den saken, ellers hovedsaken. En
    forutsetning eller kontrollsak som ikke holder, feiler med `pytest.fail`,
    så en streng `xfail` bare blir grønn når målet feiler (.claude/rules/tester.md).
    """
    baner = saker(forlop, ny_bane)
    prefiks, steg = steg_med_prefiks(forlop)
    for h in prefiks:
        godtatt, melding = baner[HOVED].send(h)
        if not godtatt:
            pytest.fail(f"Forutsetning: prefikset avviste {h['handling']}: {melding}")
    kontroller = forlop["kontroller"]
    sist = None

    def sjekk(etter):
        for k in (k for k in kontroller if k["etter"] == etter):
            bane = baner[k.get("sak", HOVED)]
            if k["rolle"] == "kontroll":
                godtatt, melding = bane.prov(med_sak_id(k["prov"], baner))
                if godtatt != (not k["forventet"]["avvist"]):
                    pytest.fail(f"Kontrollsak etter steg {etter}: {k['prov']['handling']} ga {melding!r}")
                continue
            tilstand = bane.tilstand()
            for sti, forventet in med_sak_id(k["forventet"], baner).items():
                if sti == "avvist":
                    faktisk = sist is not None and not sist[0]
                elif sti.startswith("lagret."):
                    _, hendelsestype, felt = sti.split(".", 2)
                    data = bane.lagret(hendelsestype)
                    faktisk = data.get(felt, "utelatt")
                else:
                    faktisk = les_sti(tilstand, sti)
                if k["rolle"] == "forutsetning":
                    if not stemmer(faktisk, forventet):
                        pytest.fail(f"Forutsetning etter steg {etter}: {sti} er {faktisk!r}, ventet {forventet!r}")
                else:
                    assert stemmer(faktisk, forventet), f"{forlop['id']} etter steg {etter}: {sti} er {faktisk!r}, ventet {forventet!r}"

    def journaler():
        return {navn: bane.journal() for navn, bane in baner.items()}

    sjekk(0)
    for i, h in enumerate(steg, start=1):
        journal_for = journaler()
        sist = baner[h.get("sak", HOVED)].send(med_sak_id(_uten_sak(h), baner))
        if not sist[0]:
            if journaler() != journal_for:
                pytest.fail(f"Steg {i} ble avvist, men en journal endret seg")
            if not any(
                k["etter"] == i and k["rolle"] != "kontroll" and "avvist" in k["forventet"]
                for k in kontroller
            ):
                pytest.fail(f"Forutsetning: steg {i} ({h['handling']}) avvist: {sist[1]}")
        sjekk(i)


def _avvik(avvik: dict, hva: str):
    """Streng `xfail` for et kjent avvik; et vedtatt issue uten funn-ID har `#n` som funn."""
    issue = f" (#{avvik['issue']})" if avvik.get("issue") and not avvik["funn"].startswith("#") else ""
    return pytest.mark.xfail(strict=True, raises=AssertionError, reason=f"{avvik['funn']}{issue}: {hva}")


def forlop_parametre(marker_avvik=True):
    """Ett `pytest.param` per forløp; kjente avvik blir streng `xfail`."""
    parametre = []
    for forlop in KORPUS["forlop"]:
        avvik = forlop.get("kjent_avvik")
        marks = []
        if avvik and marker_avvik:
            marks.append(_avvik(avvik, f"dagens kode avviker fra {', '.join(forlop['rader'])}"))
        parametre.append(pytest.param(forlop, id=forlop["id"], marks=marks))
    return parametre


def invariant_parametre():
    inv = next(i for i in KORPUS["invarianter"] if i["id"] == "INV-GJELDENDE-KRAV")
    kjente = {a["forlop"]: a for a in inv["kjente_avvik"]}
    parametre = []
    for forlop in KORPUS["forlop"]:
        marks = []
        if forlop["id"] in kjente:
            marks.append(_avvik(kjente[forlop["id"]], "claims() og projeksjonen er uenige om gjeldende krav"))
        parametre.append(pytest.param(forlop, id=forlop["id"], marks=marks))
    return parametre


def kjor_invariant(forlop: dict, ny_bane) -> None:
    """Gjeldende krav i godkjenningsflyten er projeksjonens etter hvert godtatt steg."""
    baner = saker(forlop, ny_bane)
    prefiks, steg = steg_med_prefiks(forlop)
    for i, h in enumerate(prefiks + steg, start=1):
        bane = baner[h.get("sak", HOVED)]
        godtatt, melding = bane.send(med_sak_id(_uten_sak(h), baner))
        if not godtatt:
            if i <= len(prefiks):
                pytest.fail(f"Forutsetning: prefikset avviste {h['handling']}: {melding}")
            continue
        avvik = godkjenningens_krav_avviker(bane.sak(), bane.raa_hendelser())
        assert not avvik, f"{forlop['id']} etter steg {i}: claims() mot krav_event_id {avvik}"
