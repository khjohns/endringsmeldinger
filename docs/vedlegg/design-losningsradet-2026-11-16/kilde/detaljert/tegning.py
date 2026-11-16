"""Lager to SVG-skisser til overordnet design: landskap.svg og arkitektur.svg."""
import html
import sys
from pathlib import Path



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


