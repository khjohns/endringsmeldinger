"""Klientens utregning mot serverens (B-13, alternativ (2) i streng form).

`kontroller_svar` regner ut byggherrens svar av vurderingene og kravet, og
sammenlikner med det klienten sendte. Er de like, returneres serverens
verdier, som skal lagres i stedet for klientens. Beløp sammenliknes til hele
øre etter avrunding.
"""

from decimal import Decimal, InvalidOperation

from models.events import FristResponsData, GrunnlagResponsData, VederlagResponsData
from models.sak_state import SakState
from regler import REGELVERSJON, belop
from regler.frist import Fristkrav, Fristvurdering, beregn_frist
from regler.grunnlag import forste_underkategori, kontroller_grunnlagssvar
from regler.vederlag import Vederlagskrav, Vederlagsvurdering, beregn_vederlag

RESULTAT = ("beregnings_resultat", "subsidiaer_resultat")
ALLTID = (*RESULTAT, "subsidiaer_triggers")
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
    if isinstance(verdi, frozenset):
        return "[" + ", ".join(sorted(_vis(v) for v in verdi)) + "]"
    return str(verdi)


def _normaliser(verdi):
    """Enum til verdi, triggere til mengde, tall til hele øre."""
    if isinstance(verdi, list | tuple):
        return frozenset(_normaliser(v) for v in verdi) or None
    verdi = getattr(verdi, "value", verdi)
    if isinstance(verdi, int | float | Decimal) and not isinstance(verdi, bool):
        try:
            return belop(verdi)
        except InvalidOperation:
            return verdi
    return verdi


def _kontroller(data, r, felt) -> dict:
    """Sammenlikn klientens verdier med serverens for `felt`, og returner
    serverens, med beløp som flyttall slik modellen lagrer dem.

    Et tall serveren ikke har, for eksempel for et særskilt krav som ikke er
    fremsatt, sammenliknes ikke, og klientens verdi erstattes av `None`.
    Resultatene og triggerne sammenliknes alltid.
    """
    server = {f: getattr(r, f) for f in felt}
    server["subsidiaer_triggers"] = list(r.subsidiaer_triggers) or None
    par = {
        f: (_normaliser(getattr(data, f)), _normaliser(v))
        for f, v in server.items()
        if v is not None or f in ALLTID
    }
    avvik = {f: (k, s) for f, (k, s) in par.items() if k != s}
    if avvik:
        raise Avvik(avvik)
    return {f: float(v) if isinstance(v, Decimal) else v for f, v in server.items()}


def kontroller_vederlagssvar(data: VederlagResponsData, sak: SakState) -> dict:
    r = beregn_vederlag(Vederlagskrav.fra_tilstand(sak), Vederlagsvurdering.fra_data(data))
    return _kontroller(data, r, RESULTAT + VEDERLAG_BELOP)


def kontroller_fristsvar(data: FristResponsData, sak: SakState) -> dict:
    r = beregn_frist(Fristkrav.fra_tilstand(sak), Fristvurdering.fra_data(data))
    return _kontroller(data, r, RESULTAT + FRIST_DAGER)


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
    if data.regelversjon != REGELVERSJON:
        raise FeilRegelversjon(data.regelversjon)
    return KONTROLLER[spor](data, sak)
