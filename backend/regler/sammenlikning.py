"""Klientens utregning mot serverens (B-13, alternativ (2) i streng form).

`kontroller_svar` regner ut byggherrens svar av vurderingene og kravet, og
sammenlikner med det klienten sendte. Er de like, returneres serverens
verdier, som skal lagres i stedet for klientens. Beløp sammenliknes til hele
øre etter avrunding.
"""

from decimal import Decimal, InvalidOperation

from models.events import FristResponsData, GrunnlagResponsData, VederlagResponsData
from models.sak_state import SakState
from regler import REGELVERSJON, UgyldigVurdering, belop
from regler.frist import Fristkrav, Fristvurdering, beregn_frist
from regler.grunnlag import forste_underkategori, kontroller_grunnlagssvar
from regler.vederlag import Vederlagskrav, Vederlagsvurdering, beregn_vederlag

VEDERLAG_BELOP = (
    "total_godkjent_belop",
    "total_krevd_belop",
    "hovedkrav_godkjent_belop",
    "rigg_godkjent_belop",
    "produktivitet_godkjent_belop",
    "subsidiaer_godkjent_belop",
)
FRIST_DAGER = ("godkjent_dager", "subsidiaer_godkjent_dager")


class Avvik(Exception):
    """Klientens verdier er ikke lik serverens. `felt` er {felt: (klient, server)}."""

    def __init__(self, felt: dict):
        self.felt = felt
        super().__init__(felt)

    def __str__(self) -> str:
        deler = ", ".join(
            f"{navn}={_vis(server)} (sendt: {_vis(klient)})"
            for navn, (klient, server) in self.felt.items()
        )
        return f"Serveren regner ut {deler}. Last inn saken på nytt."


class FeilRegelversjon(Exception):
    def __init__(self, sendt):
        self.sendt = sendt
        super().__init__(sendt)

    def __str__(self) -> str:
        return (
            f"Svaret er regnet ut med regelversjon {_vis(self.sendt)}, serveren bruker "
            f"{REGELVERSJON}. Reglene er oppdatert. Last inn saken på nytt."
        )


def _vis(verdi) -> str:
    if verdi is None:
        return "ingen"
    if isinstance(verdi, frozenset | set | tuple | list):
        return "[" + ", ".join(sorted(_vis(v) for v in verdi)) + "]"
    return str(getattr(verdi, "value", verdi))


def _enum(verdi):
    return getattr(verdi, "value", verdi)


def _triggere(verdier) -> frozenset:
    return frozenset(_enum(v) for v in verdier or ())


def _som_belop(verdi):
    try:
        return belop(verdi)
    except (InvalidOperation, ValueError, TypeError):
        return verdi


def kontroller_regelversjon(data) -> None:
    if data.regelversjon != REGELVERSJON:
        raise FeilRegelversjon(data.regelversjon)


def _sammenlikn(par: dict) -> None:
    avvik = {navn: (k, s) for navn, (k, s) in par.items() if k != s}
    if avvik:
        raise Avvik(avvik)


def _kontroller_tall(data, r, tallfelt, som_tall) -> dict:
    """Sammenlikn resultatene, triggerne og `tallfelt`, og returner serverens verdier."""
    server = {
        "beregnings_resultat": r.beregnings_resultat,
        "subsidiaer_resultat": r.subsidiaer_resultat,
        "subsidiaer_triggers": list(r.subsidiaer_triggers) or None,
        **tallfelt,
    }
    _sammenlikn(
        {
            "beregnings_resultat": (_enum(data.beregnings_resultat), _enum(r.beregnings_resultat)),
            "subsidiaer_resultat": (_enum(data.subsidiaer_resultat), _enum(r.subsidiaer_resultat)),
            "subsidiaer_triggers": (
                _triggere(data.subsidiaer_triggers),
                _triggere(r.subsidiaer_triggers),
            ),
            **{f: (som_tall(getattr(data, f)), v) for f, v in tallfelt.items() if v is not None},
        }
    )
    return server


def kontroller_vederlagssvar(data: VederlagResponsData, sak: SakState) -> dict:
    krav = Vederlagskrav.fra_tilstand(sak)
    r = beregn_vederlag(krav, Vederlagsvurdering.fra_data(data))
    # Et særskilt krav som ikke er fremsatt, har ikke noe godkjent beløp.
    ikke_krevd = {
        "rigg_godkjent_belop": not krav.har_rigg_krav,
        "produktivitet_godkjent_belop": not krav.har_produktivitet_krav,
    }
    belop_ = {f: None if ikke_krevd.get(f) else getattr(r, f) for f in VEDERLAG_BELOP}
    belop_["subsidiaer_godkjent_belop"] = r.subsidiaer_godkjent_belop
    server = _kontroller_tall(data, r, belop_, _som_belop)
    return {f: float(v) if isinstance(v, Decimal) else v for f, v in server.items()}


def kontroller_fristsvar(data: FristResponsData, sak: SakState) -> dict:
    r = beregn_frist(Fristkrav.fra_tilstand(sak), Fristvurdering.fra_data(data))
    return _kontroller_tall(data, r, {f: getattr(r, f) for f in FRIST_DAGER}, lambda v: v)


def kontroller_grunnlag(data: GrunnlagResponsData, sak: SakState) -> dict:
    g = sak.grunnlag
    kontroller_grunnlagssvar(
        g.hovedkategori,
        forste_underkategori(g.underkategori),
        data.resultat,
        data.grunnlag_varslet_i_tide,
    )
    return {}


KONTROLLER = {
    "grunnlag": kontroller_grunnlag,
    "vederlag": kontroller_vederlagssvar,
    "frist": kontroller_fristsvar,
}


def kontroller_svar(spor: str, data, sak: SakState) -> dict:
    """Kontroller regelversjonen og svaret, og returner serverens verdier.

    Kaster `FeilRegelversjon`, `UgyldigVurdering` eller `Avvik`.
    """
    kontroller_regelversjon(data)
    return KONTROLLER[spor](data, sak)


__all__ = [
    "Avvik",
    "FeilRegelversjon",
    "UgyldigVurdering",
    "kontroller_svar",
]
