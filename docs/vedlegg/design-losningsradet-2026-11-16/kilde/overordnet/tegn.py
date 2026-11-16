"""Lager to SVG-skisser til overordnet design: landskap.svg og arkitektur.svg."""
import html
import sys
from pathlib import Path

UT = Path(sys.argv[1])

BLAA = "#1f42aa"
BLAA_LYS = "#e8eefc"
GRAA = "#5b6170"
GRAA_LYS = "#f3f4f6"
GROENN_LYS = "#e9f6ef"
GROENN = "#1c7c4a"
ORANSJE_LYS = "#fdf3e6"
ORANSJE = "#a35a00"


class Tegning:
    def __init__(self, b, h):
        self.b, self.h = b, h
        self.deler = []
        self.etiketter = []

    def boks(self, x, y, b, h, tittel, linjer=(), fyll=GRAA_LYS, strek=GRAA, stiplet=False, tittelstr=17, liten=False):
        dash = ' stroke-dasharray="7 5"' if stiplet else ""
        self.deler.append(
            f'<rect x="{x}" y="{y}" width="{b}" height="{h}" rx="8" fill="{fyll}" stroke="{strek}" stroke-width="1.6"{dash}/>'
        )
        ty = y + 26
        self.deler.append(
            f'<text x="{x + 14}" y="{ty}" font-size="{tittelstr}" font-weight="700" fill="#111">{html.escape(tittel)}</text>'
        )
        ly = ty + 24
        for linje in linjer:
            self.deler.append(
                f'<text x="{x + 14}" y="{ly}" font-size="{13 if liten else 14}" fill="#222">{html.escape(linje)}</text>'
            )
            ly += 20 if liten else 21

    def ramme(self, x, y, b, h, tittel, strek=GRAA, nede=False):
        self.deler.append(
            f'<rect x="{x}" y="{y}" width="{b}" height="{h}" rx="12" fill="none" stroke="{strek}" stroke-width="2" stroke-dasharray="10 6"/>'
        )
        self.deler.append(
            f'<text x="{x + 16}" y="{(y + h - 14) if nede else (y + 28)}" font-size="18" font-weight="700" fill="{strek}">{html.escape(tittel)}</text>'
        )

    def pil(self, punkter, tekst=None, tx=None, ty=None, begge=False, stiplet=False, farge="#333"):
        dash = ' stroke-dasharray="6 5"' if stiplet else ""
        start = ' marker-start="url(#pilstart)"' if begge else ""
        p = " ".join(f"{x},{y}" for x, y in punkter)
        self.deler.append(
            f'<polyline points="{p}" fill="none" stroke="{farge}" stroke-width="1.8"{dash} marker-end="url(#pil)"{start}/>'
        )
        if tekst:
            linjer = tekst.split("\n")
            bredde = max(len(l) for l in linjer) * 7.0 + 14
            hoyde = 18 * len(linjer) + 6
            self.etiketter.append(
                f'<rect x="{tx - bredde / 2}" y="{ty - 15}" width="{bredde}" height="{hoyde}" rx="4" fill="#fff" fill-opacity="0.95"/>'
            )
            for i, l in enumerate(linjer):
                self.etiketter.append(
                    f'<text x="{tx}" y="{ty + i * 18}" font-size="13" text-anchor="middle" fill="#333">{html.escape(l)}</text>'
                )

    def svg(self):
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.b}" height="{self.h}" viewBox="0 0 {self.b} {self.h}" '
            f'font-family="Inter, DejaVu Sans, sans-serif">'
            '<defs><marker id="pil" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">'
            '<path d="M0,0 L10,5 L0,10 z" fill="#333"/></marker>'
            '<marker id="pilstart" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">'
            '<path d="M0,0 L10,5 L0,10 z" fill="#333"/></marker></defs>'
            f'<rect width="{self.b}" height="{self.h}" fill="#fff"/>'
            + "".join(self.deler)
            + "".join(self.etiketter)
            + "</svg>"
        )


def landskap():
    t = Tegning(1400, 780)
    t.boks(30, 300, 270, 150, "Totalentreprenør (TE)", ["Prosjektleder og team", "Varsler og krav om", "endringsordre (KOE)"], fyll=ORANSJE_LYS, strek=ORANSJE)
    t.boks(470, 40, 400, 130, "Catenda (prosjekthotell)", ["Felles samhandlingsplattform for partene", "Saker (topics), dokumenter, medlemmer", "Innlogging for TE og BH"])
    t.boks(470, 270, 400, 230, "Endringsmeldinger", [
        "Formelle varsler og krav etter NS 8407",
        "Endringssaker: grunnlag, vederlag og frist",
        "Byggherrens svar med intern godkjenning",
        "Endringsordre (31.3) og forsering (33.8)",
        "Hver handling lagres i en hendelseslogg",
        "Brevet sendes som dokument i Catenda",
    ], fyll=BLAA_LYS, strek=BLAA, tittelstr=19)
    t.ramme(1000, 20, 380, 740, "Oslobygg KF – byggherre (BH)", strek=GROENN)
    t.boks(1025, 70, 330, 110, "Byggherrens team", ["Prosjektleder, ekstern rådgiver", "Svarer på KOE, utsteder EO"], fyll=GROENN_LYS, strek=GROENN)
    t.boks(1025, 215, 330, 110, "Godkjennere med fullmakt", ["Ledere i linjen", "Godkjenner svar over grensen"], fyll=GROENN_LYS, strek=GROENN)
    t.boks(1025, 360, 330, 110, "Entra ID og HR-data", ["Innlogging for godkjennere", "Stilling og leder (Graph)"], fyll=GROENN_LYS, strek=GROENN)
    t.boks(1025, 505, 330, 110, "Rapportering (Fabric)", ["Speiling av brevinnholdet", "Planlagt, ikke bygget"], fyll="#fff", strek=GROENN, stiplet=True)
    t.boks(1025, 640, 330, 100, "Arkiv og innsyn", ["Avklares (spørsmål til arkiv)"], fyll="#fff", strek=GROENN, stiplet=True)

    t.pil([(300, 385), (470, 385)], "KOE", 385, 372, begge=True)
    t.pil([(670, 170), (670, 270)], "Brev og vedlegg ut ·\nsaker og medlemmer inn", 670, 210, begge=True)
    t.pil([(165, 300), (165, 105), (470, 105)], "Bruker plattformen", 300, 95, stiplet=True)
    t.pil([(1025, 115), (870, 115)], None, stiplet=True)
    t.pil([(1025, 140), (870, 330)], "Svar og\nendringsordre (EO)", 945, 215, begge=True)
    t.pil([(1025, 270), (870, 380)], "Godkjenner", 935, 312, begge=True)
    t.pil([(1025, 415), (870, 440)], "Identitet\nog roller", 945, 415)
    t.pil([(870, 470), (1025, 560)], "Brevinnhold", 945, 512, stiplet=True)
    t.pil([(870, 490), (1025, 680)], "Avklares", 935, 600, stiplet=True)

    t.deler.append('<text x="30" y="560" font-size="14" fill="#333">Kontrakten: NS 8407 totalentreprise.</text>')
    t.deler.append('<text x="30" y="582" font-size="14" fill="#333">Brevet i Catenda er partenes</text>')
    t.deler.append('<text x="30" y="604" font-size="14" fill="#333">kontraktskorrespondanse.</text>')
    t.deler.append('<text x="30" y="650" font-size="13" fill="#555">Stiplet: planlagt eller ikke avklart.</text>')
    return t.svg()


def arkitektur():
    t = Tegning(1500, 920)
    t.boks(120, 20, 330, 90, "TE og BH (nettleser)", ["Innlogging med Catenda (OAuth 2)"], fyll=ORANSJE_LYS, strek=ORANSJE)
    t.boks(520, 20, 330, 90, "Godkjenner i Oslobygg", ["Innlogging med Entra ID (OIDC)"], fyll=GROENN_LYS, strek=GROENN)

    t.ramme(40, 150, 990, 640, "Azure – eget abonnement for løsningen (test og produksjon)", strek=BLAA, nede=True)
    t.ramme(65, 195, 620, 325, "Azure App Service (Web App for Containers)", strek=GRAA, nede=True)
    t.boks(85, 215, 270, 235, "Ruter (nginx)", [
        "Statisk frontend (SvelteKit)",
        "Domenekjernen også i",
        "nettleseren (forhåndsvisning)",
        "/api og /webhook til serveren",
        "HTTPS avsluttes i App Service",
    ], fyll="#fff", strek=GRAA, liten=True)
    t.boks(395, 215, 270, 255, "TS-server (Node.js 22)", [
        "API med tilgangsregister",
        "og CSRF",
        "Domenekjernen: regler etter",
        "NS 8407 (eneste regelkilde)",
        "Jobbkjører: levering, innboks",
        "Brev-PDF",
        "Kontrollerer basen ved start",
    ], fyll=BLAA_LYS, strek=BLAA, liten=True)
    t.boks(65, 545, 480, 215, "Azure SQL Database (serverløs)", [
        "Egen base for løsningen",
        "Hendelseslogg (journal), saker, brev,",
        "leveringsoppdrag, kø, sesjoner, tilgang",
        "Radsikkerhet og lagrede prosedyrer",
        "som eneste skrivevei",
        "Skjemaet endres bare med migrasjonsfiler",
    ], fyll=BLAA_LYS, strek=BLAA, liten=True)
    t.boks(575, 600, 205, 110, "Microsoft Fabric", ["Speiling for rapportering", "Planlagt"], fyll="#fff", strek=GRAA, stiplet=True, liten=True)
    t.boks(805, 600, 205, 110, "Azure Key Vault", ["Hemmeligheter", "Avklares med IKT"], fyll="#fff", strek=GRAA, stiplet=True, liten=True)

    t.boks(1100, 170, 370, 220, "Catenda (api.catenda.com)", [
        "OAuth 2: innlogging for TE og BH",
        "Prosjekter, medlemmer og team",
        "Topics og kommentarer",
        "Dokumentbibliotek: brev og vedlegg",
        "Webhook: nye og endrede topics",
    ], fyll=ORANSJE_LYS, strek=ORANSJE, liten=True)
    t.boks(1100, 450, 370, 100, "Microsoft Entra ID", ["OIDC-innlogging for godkjennere"], fyll=GROENN_LYS, strek=GROENN, liten=True)
    t.boks(1100, 600, 370, 110, "Microsoft Graph", ["Stilling og leder (HR-kopi)", "Appens egen tilgang"], fyll=GROENN_LYS, strek=GROENN, liten=True)
    t.boks(65, 830, 620, 70, "GitHub", ["Kildekode, CI (tester mot SQL Server i Docker) og utrulling"], fyll=GRAA_LYS, strek=GRAA, liten=True)

    t.pil([(285, 110), (220, 215)], "HTTPS", 262, 165)
    t.pil([(685, 110), (320, 215)], "HTTPS", 520, 150)
    t.pil([(355, 320), (395, 320)])
    t.pil([(515, 470), (515, 545)], "Managed identity", 590, 537, begge=True)
    t.pil([(545, 655), (575, 655)])
    t.pil([(665, 270), (1100, 270)], "REST over HTTPS (utgående hviteliste)", 885, 262)
    t.pil([(1100, 350), (685, 350)], "Webhook til hemmelig sti", 885, 342)
    t.pil([(665, 420), (1100, 500)], "OIDC", 880, 452)
    t.pil([(665, 450), (1100, 640)], "Graph API", 880, 540)
    t.pil([(665, 460), (905, 600)], "Henter hemmeligheter", 800, 575, stiplet=True)
    t.pil([(500, 830), (500, 760)], "Utrulling og migrasjoner", 590, 812, stiplet=True)
    return t.svg()


(UT / "landskap.svg").write_text(landskap(), encoding="utf-8")
(UT / "arkitektur.svg").write_text(arkitektur(), encoding="utf-8")
