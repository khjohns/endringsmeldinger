"""Fyller malen for detaljert design. Bruk: bygg_lld.py <utpakket mal> <bildemappe> <repo> [sidetall.json]."""
import json
import re
import shutil
import sys
from pathlib import Path
from xml.sax.saxutils import escape

MAL = Path(sys.argv[1])
BILDER = Path(sys.argv[2])
REPO = Path(sys.argv[3])
SIDETALL = json.loads(Path(sys.argv[4]).read_text()) if len(sys.argv) > 4 else {}
SIDEBREDDE = 9270
EMU_BREDDE = int(SIDEBREDDE / 1440 * 914400)

deler = []
overskrifter = []  # (bokmerke, tekst)


def run(tekst, fet=False, kursiv=False, gul=False, str_=20, farge=None, mono=False):
    rpr = ""
    if mono:
        rpr += '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>'
    rpr += ("<w:b/><w:bCs/>" if fet else "") + ("<w:i/><w:iCs/>" if kursiv else "")
    if farge:
        rpr += f'<w:color w:val="{farge}"/>'
    if gul:
        rpr += '<w:highlight w:val="yellow"/>'
    rpr += f'<w:sz w:val="{str_}"/><w:szCs w:val="{str_}"/>'
    return f'<w:r><w:rPr>{rpr}</w:rPr><w:t xml:space="preserve">{escape(tekst)}</w:t></w:r>'


def runs(tekst, str_=20):
    """**fet**, [[åpent punkt]] (gult) og `kode`."""
    ut = []
    for bit in re.split(r"(\*\*.+?\*\*|\[\[.+?\]\]|`[^`]+`)", tekst):
        if not bit:
            continue
        if bit.startswith("**"):
            ut.append(run(bit[2:-2], fet=True, str_=str_))
        elif bit.startswith("[["):
            ut.append(run(bit[2:-2], gul=True, str_=str_))
        elif bit.startswith("`"):
            ut.append(run(bit[1:-1], mono=True, str_=str_ - 2))
        else:
            ut.append(run(bit, str_=str_))
    return "".join(ut)


def p(tekst, stil=None, punkt=False, jc=None, etter=None, str_=20, holdsammen=False):
    ppr = ""
    if stil:
        ppr += f'<w:pStyle w:val="{stil}"/>'
    if holdsammen:
        ppr += "<w:keepNext/>"
    if punkt:
        ppr += '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="90"/></w:numPr>'
    if etter is not None:
        ppr += f'<w:spacing w:after="{etter}"/>'
    if jc:
        ppr += f'<w:jc w:val="{jc}"/>'
    deler.append(f"<w:p><w:pPr>{ppr}</w:pPr>{runs(tekst, str_)}</w:p>")


def overskrift(tekst, niva=1):
    if niva == 1:
        n = len(overskrifter)
        merke = f"_Toc9000{n:02d}"
        overskrifter.append((merke, tekst))
        rpr = '<w:b/><w:bCs/><w:color w:val="auto"/><w:u w:val="single"/>'
        deler.append(
            f'<w:p><w:pPr><w:pStyle w:val="Overskrift1"/><w:spacing w:before="240" w:after="120"/><w:rPr>{rpr}</w:rPr></w:pPr>'
            f'<w:bookmarkStart w:id="{900 + n}" w:name="{merke}"/>'
            f'<w:r><w:rPr>{rpr}</w:rPr><w:t xml:space="preserve">{escape(tekst)}</w:t></w:r>'
            f'<w:bookmarkEnd w:id="{900 + n}"/></w:p>'
        )
    else:
        deler.append(
            f'<w:p><w:pPr><w:pStyle w:val="Overskrift2"/><w:spacing w:before="200" w:after="80"/></w:pPr>'
            f'<w:r><w:t xml:space="preserve">{escape(tekst)}</w:t></w:r></w:p>'
        )


def punkter(*linjer):
    for linje in linjer:
        p(linje, punkt=True, etter=60)


def nummerert(*linjer):
    for i, linje in enumerate(linjer, 1):
        p(f"**{i}.** {linje}", etter=80)


def tabell(rader, bredder, hode=True, str_=17):
    assert sum(bredder) == SIDEBREDDE, sum(bredder)
    grid = "".join(f'<w:gridCol w:w="{b}"/>' for b in bredder)
    xml = [
        f'<w:tbl><w:tblPr><w:tblStyle w:val="Tabellrutenett"/><w:tblW w:w="{SIDEBREDDE}" w:type="dxa"/>'
        '<w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="A6A6A6"/><w:left w:val="single" w:sz="4" w:space="0" w:color="A6A6A6"/>'
        '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="A6A6A6"/><w:right w:val="single" w:sz="4" w:space="0" w:color="A6A6A6"/>'
        '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="A6A6A6"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="A6A6A6"/></w:tblBorders>'
        '<w:tblLayout w:type="fixed"/>'
        '<w:tblCellMar><w:top w:w="30" w:type="dxa"/><w:left w:w="80" w:type="dxa"/>'
        '<w:bottom w:w="30" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar>'
        '<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>'
        f"</w:tblPr><w:tblGrid>{grid}</w:tblGrid>"
    ]
    for i, rad in enumerate(rader):
        erhode = hode and i == 0
        trpr = "<w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>" if erhode else "<w:trPr><w:cantSplit/></w:trPr>"
        xml.append(f"<w:tr>{trpr}")
        for celle, b in zip(rad, bredder):
            skygge = '<w:shd w:val="clear" w:color="auto" w:fill="D9E2F3"/>' if erhode else ""
            xml.append(f'<w:tc><w:tcPr><w:tcW w:w="{b}" w:type="dxa"/>{skygge}</w:tcPr>')
            for avsnitt in celle.split("\n"):
                tekst = f"**{avsnitt}**" if erhode and avsnitt else avsnitt
                xml.append(
                    '<w:p><w:pPr><w:spacing w:after="20" w:line="240" w:lineRule="auto"/></w:pPr>'
                    f"{runs(tekst, str_)}</w:p>"
                )
            xml.append("</w:tc>")
        xml.append("</w:tr>")
    xml.append("</w:tbl>")
    deler.append("".join(xml))
    p("", etter=0)


bilder = []


def bilde(fil, tekst):
    import struct
    with open(BILDER / fil, "rb") as f:
        bredde_px, hoyde_px = struct.unpack(">II", f.read(24)[16:24])
    n = len(bilder) + 1
    rid = f"rIdLld{n}"
    bilder.append((rid, fil))
    cx = EMU_BREDDE
    cy = int(EMU_BREDDE * hoyde_px / bredde_px)
    deler.append(
        '<w:p><w:pPr><w:keepNext/><w:spacing w:after="60"/><w:jc w:val="center"/></w:pPr><w:r><w:drawing>'
        f'<wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="{cx}" cy="{cy}"/>'
        f'<wp:docPr id="{100 + n}" name="Figur {n}" descr="{escape(tekst)}"/>'
        '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>'
        '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
        '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
        '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
        f'<pic:nvPicPr><pic:cNvPr id="{100 + n}" name="Figur {n}"/><pic:cNvPicPr/></pic:nvPicPr>'
        f'<pic:blipFill><a:blip r:embed="{rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
        f'<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>'
        "</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>"
    )
    deler.append(
        '<w:p><w:pPr><w:spacing w:after="200"/><w:jc w:val="center"/></w:pPr>'
        f'{run(f"Figur {n}: {tekst}", kursiv=True, str_=17, farge="404040")}</w:p>'
    )


def sideskift():
    deler.append('<w:p><w:r><w:br w:type="page"/></w:r></w:p>')


# ---------------------------------------------------------------- data fra repoet

katalog = json.loads((REPO / "docs/datamodell/katalog.json").read_text())["sqlserver"]["tabeller"]
tabellmd = (REPO / "docs/datamodell/tabeller.md").read_text()


def tabellbeskrivelse(navn):
    m = re.search(r"^### `" + re.escape(navn) + r"`\n\n(.+?)\n", tabellmd, re.M)
    tekst = m.group(1) if m else ""
    tekst = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", tekst)
    tekst = re.sub(r"\s*\((?:[^()]*(?:#\d|[A-Z]{1,4}-U?\d)[^()]*)\)", "", tekst)
    tekst = tekst.replace(" (CLAUDE.md)", "")
    forste = re.split(r"(?<=[.:])\s", tekst, maxsplit=1)[0]
    return forste.rstrip(":").rstrip(".") + "."


def tabelltype(navn):
    m = re.search(r"\| \[`" + re.escape(navn) + r"`\]\([^)]*\) \| [^|]+ \| ([^|]+) \|", tabellmd)
    return m.group(1).strip() if m else ""


def kolonner(navn):
    e = katalog[navn]
    return ", ".join(f"{c[0]} {c[1]}" + ("" if c[2] == "NOT NULL" else " (null)") for c in e["kolonner"])


def noekler(navn):
    e = katalog[navn]
    deler_ = [f"PK: {', '.join(e['primærnøkkel'])}"]
    for f in e["fremmednøkler"]:
        deler_.append(f"FK: {', '.join(f['kolonner'])} → {f['til']}")
    for u in e["unike"]:
        deler_.append(f"Unik: {', '.join(u)}")
    for u in e["unike_indekser"]:
        deler_.append(f"Unik indeks: {u}")
    return "\n".join(deler_)


# ---------------------------------------------------------------- tittelside og innhold

deler.append(
    '<w:p><w:pPr><w:pStyle w:val="Tittel"/><w:rPr><w:color w:val="auto"/></w:rPr></w:pPr>'
    f'{run("Detaljert design (LLD): Endringsmeldinger", str_=38)}</w:p>'
)
p("Kontraktsadministrasjon etter NS 8407 for byggherren og totalentreprenøren", etter=360, str_=22)
tabell(
    [
        ["Dato", "16.11.2026"],
        ["Versjon og status", "0.1, utkast til behandling i Løsningsrådet"],
        ["Innmelder", "Kasper Holter Johns, Juridisk avdeling"],
        ["Systemeier", "Kasper Holter Johns (foreløpig)"],
        ["Primær behovshaver", "Divisjon Utbygging"],
        ["Grunnlag", "Overordnet design for Endringsmeldinger, 16.11.2026. Kildekoden per 16.11.2026 (commit e8d39fb)"],
        ["Løsningens tilstand", "Under utvikling. Ikke i produksjon, og ingen reelle data."],
    ],
    [2600, 6670],
    hode=False,
    str_=19,
)
p("Gule markeringer er punkter som ikke er avklart eller ikke er bygget ennå.", str_=18)
sideskift()
TOC_PLASS = len(deler)
deler.append("")  # innholdsfortegnelsen settes inn her
sideskift()

# 1
overskrift("Formål og begrunnelse:")
p(
    "Dokumentet beskriver hvordan Endringsmeldinger er bygget: komponentene, datamodellen, integrasjonene, "
    "feilhåndteringen, sikkerheten og driften. Formålet med løsningen, gevinstene og forretningslandskapet står i "
    "det overordnede designet, som dette dokumentet bygger på."
)
p("Kort fortalt:", holdsammen=True)
punkter(
    "Juridisk avdeling tok initiativet, og divisjon Utbygging er primær behovshaver.",
    "Løsningen håndterer formelle varsler og krav etter NS 8407 mellom Oslobygg som byggherre (BH) og "
    "totalentreprenøren (TE): TEs krav om endringsordre (KOE), byggherrens svar, byggherrens endringsordre (EO) "
    "etter punkt 31.3 og forsering etter punkt 33.8.",
    "Skjemaene leder partene gjennom kontraktens vilkår, reglene viser fristene, og hver handling lagres i en "
    "hendelseslogg som kan etterprøves. Brevene leveres som dokumenter i saken i prosjekthotellet Catenda.",
)
p(
    "**Bygget, under bygging og planlagt.** Beskrivelsen skiller mellom det som er bygget og prøvd, det som er under "
    "bygging, og det som er planlagt. Det som mangler før første ekte sak, er markert gult og har et nummer fra "
    "løsningens GitHub-repo (for eksempel #1807)."
)

# 2
overskrift("Detaljert arkitekturskisser:")
bilde("lld-arkitektur.png", "Detaljert arkitektur")
p("**Veien for en forespørsel:**", holdsammen=True)
nummerert(
    "Nettleseren kaller løsningens adresse over HTTPS. App Service avslutter TLS og sender trafikken til ruteren "
    "(nginx) på port 8080.",
    "Ruteren serverer frontenden som statiske filer. Kall til `/api/*` og `/webhook/catenda/*` sendes til TS-serveren "
    "på port 8090 i samme App Service, som en sidevogn (`KOE_TS_SERVEREN=127.0.0.1:8090`).",
    "TS-serveren slår opp inngangen i registeret og kontrollerer sesjonen, CSRF-tokenet, prosjektet og kontraktsrollen "
    "før behandleren kalles.",
    "Behandleren åpner én transaksjon mot Azure SQL med aktøren, prosjektet, siden og teamet som kontekst. "
    "Radsikkerheten i basen bruker den samme konteksten.",
    "Arbeid mot Catenda skjer etter commit, i jobbkjøreren, aldri i brukerens forespørsel.",
)
p(
    "**Én vertsadresse.** Frontenden og API-et står bak samme adresse. Sesjonskapselen har prefikset `__Host-`, er "
    "bundet til verten og krever HTTPS. Derfor kan de ikke deles på to adresser."
)
p(
    "**Domenekjernen kjører to steder.** Nettleseren bruker den til å vise frister, beregninger og brevutkast uten å "
    "vente på serveren. Serveren prøver alltid kommandoen på nytt mot journalen og avviser et svar som er regnet med "
    "en annen regelversjon."
)

# 3
overskrift("Detaljert komponentbeskrivelse")
tabell(
    [
        ["Komponent (kode)", "Hva den gjør", "Data inn og ut", "Avhengigheter"],
        ["Frontend (`src/`)", "Saksliste, skjemaer for krav og svar, brev, oversikter over grunnlag, vederlag og frist, godkjenning.",
         "Inn: JSON fra API-et. Ut: kommandoer med `kommando_id` og forventet versjon", "SvelteKit 2, Svelte 5, TanStack Query, Tailwind CSS, domenekjernen"],
        ["Domenekjernen (`kjerne/`)", "Reglene etter NS 8407 for sporene grunnlag, vederlag og frist: hva som kan sendes, frister, utledning av sakens situasjon og brevtekst.",
         "Inn: journalen og kommandoen. Ut: godtatt hendelse eller avvisning med kode", "Ingen. Ren TypeScript; en arkitekturtest hindrer import utenfor mappa"],
        ["Ruter (`nginx.conf`)", "Statiske filer, ruting av `/api` og `/webhook`, `/health`.",
         "HTTP inn og videre. Tilgangsloggen uten spørrestreng; webhookstien logges ikke", "nginx 1.27"],
        ["Ruter og tilgangsregister (`server/app.ts`, `autorisasjon.ts`)", "Finner inngangen, kontrollerer sesjon, CSRF, prosjekt og kontraktsrolle, avviser ukjente felt og for store kropper.",
         "Inn: HTTP. Ut: kontekst til behandleren eller feilsvar", "Datalaget (sesjon og medlemskap)"],
        ["Saker og kommandoer (`saker.ts`, `kommandoer.ts`, `lager.ts`)", "Leser saken, oppretter sak, skriver hendelser med leveringsoppdrag.",
         "Inn: kommando. Ut: saken slik den vises", "Kjernen, datalaget, `levering.ts`"],
        ["Saksliste og fristtabell (`saksliste.ts`, `kontraktsfrister.ts`)", "Sakene i prosjektet med krav, svar og enighet per spor; kontraktens frister og dagmulkt.",
         "Ut: lister regnet av kjernen ved lesing", "Kjernen, datalaget"],
        ["Godkjenning (`godkjenning.ts`, `godkjenner.ts`, `fullmakt.ts`)", "Godkjenningspakker for byggherrens svar, kjeden fra HR-dataene og verdien fullmakten regnes av.",
         "Inn: svarutkast, handlinger fra godkjenner. Ut: pakkens tilstand", "HR-kopien, kjernen. [[Publiseringen ved siste godkjenning er under bygging (#818)]]"],
        ["Brev og PDF (`levering.ts`, `brevpdf.ts`, `brev.ts`)", "Fryser brevet i leveringsoppdraget og lager PDF-en med innebygde skrifter. PDF-en kontrolleres mot den frosne teksten.",
         "Inn: hendelse. Ut: oppdrag, PDF", "pdf-lib, fontkit"],
        ["Vedlegg (`vedlegg.ts`)", "Opplasting, liste, nedlasting og sletting av ubundne vedlegg. Kontrollerer størrelse (15 MB), filnavn, innhold mot filtype og kjørbare filer.",
         "Inn: fil. Ut: vedlegg i basen til Catenda har kvittert", "Datalaget. [[Skanning for skadevare mangler (#1808)]]"],
        ["Innlogging og sesjon (`innlogging.ts`, `sesjon.ts`, `entra.ts`)", "OAuth 2 med Catenda for TE og BH, OIDC med PKCE og nonce mot Entra ID for godkjennere, sesjon og CSRF-token.",
         "Inn: kode fra leverandøren. Ut: sesjonskapsel", "Catenda, Entra ID, `jose`"],
        ["Webhookmottak (`webhook.ts`, `hendelser.ts`)", "Tar imot hendelser fra Catenda og lagrer dem i innboksen før svaret. Jobbkjøreren behandler dem.",
         "Inn: hendelse. Ut: sak og kommentar i Catenda", "Datalaget, Catenda-klienten"],
        ["Catenda-klienten (`catenda.ts`)", "OAuth, prosjekter, medlemmer, team, topics, kommentarer og dokumenter, med sidevis henting og klassifisering av feil.",
         "REST over HTTPS", "api.catenda.com"],
        ["HR-synk (`hrdata.ts`)", "Henter personer med registrerte stillingstitler og lederen deres fra Graph, hver time.",
         "Ut: `koe.hr_kopi`", "Microsoft Graph"],
        ["Jobbkjører (`jobber.ts`)", "Løkke i serverprosessen: topic for ny sak, levering av brev og vedlegg, innboksen og HR-synken.",
         "Inn: `koe.jobb`. Ut: kall til Catenda, kvitteringer", "Datalaget, Catenda, Graph"],
        ["Datalag (`datalag.ts`)", "Pool mot SQL Server, én transaksjon per kommando, kontekst i `SESSION_CONTEXT`, nullstilling av forbindelsen.",
         "TDS", "`mssql`"],
        ["Oppstart og migrering (`oppstart.ts`, `migrering.ts`)", "Serveren nekter å starte med for mange rettigheter eller når basen avviker fra migrasjonsfilene. Runneren anvender filene som `dbo`.",
         "Inn: `database/migrasjoner/` (73 filer)", "Datalaget"],
        ["Driftsskript (`registrering.ts`)", "Registrerer prosjekter, kontraktsteam, partsnavn, fristtabell og Entra-identiteter. Er ingen inngang i appen.",
         "Inn: kommandolinje. Ut: `koe_drift`-prosedyrer", "Driftsrollen i basen"],
    ],
    [2000, 3200, 2170, 1900],
)

# 4
overskrift("Detaljert datamodell:")
p("**Prinsippene:**", holdsammen=True)
punkter(
    "**Hendelseslogg.** `koe.hendelse` er journalen. En rad endres eller slettes aldri; 20 triggere hindrer endring i "
    "journalen og de andre tabellene som skal stå fast.",
    "**Ett brev er ett dokument.** Hendelsens innhold lagres som JSON i `data nvarchar(max)`, med versjonen av formatet "
    "og reglene. Sakens situasjon regnes ut fra journalen. `koe.kjernebuffer` er en avledet visning som kan bygges på nytt.",
    "**Basen stempler.** Aktøren (`app_users.id`), siden, teamet, prosjektet og tidspunktet settes fra konteksten og "
    "basens klokke, aldri fra klienten. `prosjekt_id` er `NOT NULL` uten standardverdi.",
    "**Samtidighet.** Hver hendelse har et løpenummer i saken, unikt per (`sak_id`, `versjon`). En kommando sender "
    "versjonen den bygger på, og får 409 når saken er endret.",
    "**Sortering** `Latin1_General_100_BIN2_UTF8`: ID-er som bare skiller seg i store og små bokstaver, er ulike.",
)
p("**Skjemaene i basen:**", holdsammen=True)
tabell(
    [
        ["Skjema", "Innhold", "Hvem bruker det"],
        ["koe", "42 tabeller, 7 funksjoner og triggerne", "Ingen direkte skriving fra kjøretiden; lesing gjennom radsikkerheten"],
        ["koe_api", "70 lagrede prosedyrer", "Kjøretiden (`koe_runtime`). Eneste skrivevei"],
        ["koe_drift", "16 lagrede prosedyrer", "Driftsrollen (`koe_driftsrolle`) fra driftsskriptet"],
        ["koe_sikkerhet", "24 predikatfunksjoner og sikkerhetspolicyen `koe_sikkerhet.tilgang`", "Basen selv, for radsikkerheten"],
        ["koe_migrering", "Historikken over anvendte migrasjonsfiler, med sha256", "Migreringsrunneren og oppstartskontrollen"],
    ],
    [1800, 3900, 3570],
)
p("**De sentrale tabellene, med felt og nøkler** (fra databasekatalogen):", holdsammen=True)
sentrale = ["koe.sak_metadata", "koe.hendelse", "koe.leveringsoppdrag", "koe.jobb", "koe.vedlegg", "koe.notat",
            "koe.godkjenningspakke", "koe.innkommende_hendelse", "koe.app_users", "koe.app_sessions"]
tabell(
    [["Tabell", "Felt og datatyper", "Nøkler og indekser"]]
    + [[f"`{n}`", kolonner(n), noekler(n)] for n in sentrale],
    [1900, 4570, 2800],
    str_=15,
)
p("**Alle tabellene:**", holdsammen=True)
tabell(
    [["Tabell", "Type", "Beskrivelse"]] + [[f"`{n}`", tabelltype(n), tabellbeskrivelse(n)] for n in sorted(katalog)],
    [2600, 1300, 5370],
    str_=15,
)
p(
    "Feltene, nøklene, hvem som skriver hver tabell og personopplysningene i den står i tabellbeskrivelsen "
    "(vedlegg 1), som lages av registrene i repoet og kontrolleres mot migrasjonene av tester."
)

# 5
overskrift("Detaljert integrasjonsoversikt:")
overskrift("Catenda", 2)
p(
    "Grunnadressen er `https://api.catenda.com`. Løsningen bruker to slags token: brukerens token fra innloggingen, "
    "som bare lever i forespørselen, og integrasjonens eget token (client credentials, krever Catenda Boost), som "
    "jobbkjøreren og medlemssynken bruker. Lister hentes sidevis med 100 per side."
)
tabell(
    [
        ["Kall", "Formål", "Token"],
        ["POST /oauth2/token", "Kode mot brukerens token, og integrasjonens token", "–"],
        ["GET /v2/user", "Den innloggede brukeren", "Bruker"],
        ["GET /v2/projects", "Brukerens prosjekter ved innloggingen", "Bruker"],
        ["GET /v2/projects/{id}/members?userType=user", "Medlemmer i prosjektene som er koblet til løsningen", "Bruker eller integrasjon"],
        ["GET /v2/projects/{id}/teams og /teams/{team}/members", "Kontraktsteamene og medlemmene i dem", "Integrasjon"],
        ["GET /opencde/bcf/3.0/projects/{board}", "Topic board for prosjektet", "Integrasjon"],
        ["GET og POST …/projects/{board}/topics", "Hente topicen fra webhooken; opprette topic for en ny sak", "Integrasjon"],
        ["GET og POST …/topics/{topic}/comments", "Kommentar med lenke til saken", "Integrasjon"],
        ["GET /v2/projects/{id}/libraries/{bibliotek}/items", "Finne mappen og et dokument som alt er lastet opp", "Integrasjon"],
        ["POST /v2/projects/{id}/libraries/{bibliotek}/items", "Laste opp brev-PDF og vedlegg", "Integrasjon"],
        ["GET og POST …/topics/{topic}/document_references", "Knytte dokumentet til topicen", "Integrasjon"],
        ["Webhook: POST /webhook/catenda/{hemmelighet}", "Catenda varsler om nye og endrede topics", "Hemmelig sti"],
    ],
    [3700, 3870, 1700],
)
p(
    "Feil fra Catenda deles i fire: **utilgjengelig** (tidsavbrudd, 5xx, 429) gir nytt forsøk; **avvisning** og "
    "**varig avvik** parkerer jobben; **usikkert utfall** (svaret uteble etter at kallet kan ha virket) parkerer jobben "
    "for kontroll før den startes på nytt; **oppsettfeil** stopper jobben. Før en ny opplasting slår jobbkjøreren opp om "
    "dokumentet alt finnes, så et nytt forsøk ikke gir to dokumenter."
)
overskrift("Microsoft Entra ID og Graph", 2)
tabell(
    [
        ["Kall", "Formål", "Autentisering"],
        ["GET {autoritet}/oauth2/v2.0/authorize", "Innlogging for godkjennere, med PKCE (S256) og nonce", "–"],
        ["POST {autoritet}/oauth2/v2.0/token", "Kode mot ID-token", "Klient-ID og hemmelighet"],
        ["GET {autoritet}/discovery/v2.0/keys", "Nøklene ID-tokenet valideres mot (RS256, aud, tid, nonce, issuer)", "–"],
        ["POST login.microsoftonline.com/{tenant}/oauth2/v2.0/token", "Token for Graph", "Client credentials"],
        ["GET graph.microsoft.com/v1.0/users?$filter=jobTitle eq '…'&$expand=manager", "Personer med registrerte stillingstitler og lederen deres", "Applikasjonstillatelse. [[Hvilken, avklares med IKT]]"],
    ],
    [3900, 3570, 1800],
)
p(
    "Identiteten i Entra er `oid`. Påstander om roller og grupper i tokenet leses ikke; Entra-innloggingen gir ingen "
    "prosjekttilgang. Om tenanten er godkjent, og hvem som er registrert, avgjør basen."
)
overskrift("Azure SQL Database og Fabric", 2)
punkter(
    "Kjøretiden kobler seg til med appens managed identity, som skal ha rollen `koe_runtime`. Driftsskriptet bruker "
    "`koe_driftsrolle`, og migreringen kjøres som eieren av basen (`dbo`).",
    "Speiling til Microsoft Fabric er planlagt. Interne notater, utkast og godkjenningspakker skal holdes utenfor eller "
    "skjermes der. Brevene lagres som tekst og tidspunktene med UTC, fordi speilingen kutter lange kolonner og tidssoner.",
)
overskrift("Løsningens eget API", 2)
p("Hver inngang står i registeret i `server/app.ts` med kravene sine. En test prøver hver inngang over HTTP.", holdsammen=True)
api = [
    ("GET", "/api/kjerne/saker/{sak}", "Medlem (leser), kontraktsrolle eller leserolle"),
    ("POST", "/api/kjerne/saker/{sak}/kommandoer", "Medlem, kontraktsrolle"),
    ("GET", "/api/kjerne/saker/{sak}/sakskode", "Medlem, kontraktsrolle"),
    ("POST, GET", "/api/kjerne/saker/{sak}/vedlegg", "Medlem eller leser, kontraktsrolle"),
    ("GET, DELETE", "/api/kjerne/saker/{sak}/vedlegg/{id}", "Medlem eller leser, kontraktsrolle"),
    ("GET", "/api/kjerne/saker/{sak}/brev/{event}", "Leser, kontraktsrolle eller leserolle"),
    ("POST", "/api/kjerne/saker", "Medlem, kontraktsrolle (bare TE oppretter)"),
    ("GET", "/api/kjerne/sakskode", "Medlem, kontraktsrolle"),
    ("POST, DELETE", "/api/kjerne/vedlegg[/{id}]", "Medlem, kontraktsrolle (vedlegg før saken finnes)"),
    ("GET", "/api/auth/catenda/login og /callback", "Uten sesjon (begrunnet i registeret)"),
    ("GET", "/api/auth/entra/login og /callback", "Uten sesjon (begrunnet i registeret)"),
    ("GET, POST", "/api/auth/session, /api/auth/logout, /api/csrf-token", "Sesjon, uten prosjekt"),
    ("GET", "/api/projects", "Sesjon, uten prosjekt"),
    ("GET", "/api/projects/{prosjekt} og /members", "Leser i prosjektet"),
    ("POST, PATCH", "/api/projects/{prosjekt}/members/sync og /members/{bruker}", "Administrator i prosjektet"),
    ("GET", "/api/projects/{prosjekt}/saker og /kontraktsfrister", "Leser, kontraktsrolle eller leserolle"),
    ("GET, POST", "/api/godkjenning/pakker[/{pakke}/…]", "Sesjon; godkjenner i kjeden til en åpen pakke (seks innganger)"),
    ("POST", "/webhook/catenda/{hemmelighet}", "Uten sesjon; hemmelig sti"),
]
tabell([["Metode", "Sti", "Krav"]] + [list(r) for r in api], [1300, 4370, 3600], str_=16)
p(
    "Alle kall med sesjon krever `X-CSRF-Token`, og kall i et prosjekt krever `X-Project-ID`. Uten gyldig "
    "`X-Project-ID` er prosjektet ukjent, og svaret er 403; det finnes ikke noe standardprosjekt."
)

# 6
overskrift("Prosessflyt:")
p("**En endringssak fra varsel til svar**, slik løsningen støtter den i første versjon:", holdsammen=True)
nummerert(
    "**TE oppretter saken og påberoper forholdet** (grunnlaget). Saken kan også starte med en topic TE lager i Catenda; "
    "webhooken gjør den til en sak. Jobbkjøreren oppretter topicen i Catenda for en sak som er laget i løsningen.",
    "**TE sender varsel og krav** om vederlag og fristforlengelse. Skjemaet viser kontraktens vilkår, og kjernen "
    "kontrollerer at kravet kan sendes. Brevet fryses og leveres som dokument i saken i Catenda.",
    "**Byggherrens team forbereder svaret** i hvert spor. Svaret lagres som en godkjenningspakke. Når verdien går over "
    "fullmakten, går pakken gjennom godkjenningskjeden fra HR-dataene. Godkjennerne logger inn med Entra ID og ser "
    "pakken mens den er åpen, aldri de interne notatene.",
    "**Svaret sendes** når pakken er godkjent. [[Publiseringen ved siste godkjenning er under bygging (#818)]]. "
    "Byggherrens svar som godkjenner en KOE, kan være endringsordren.",
    "**TE godtar svaret, sender en ny kravversjon eller trekker kravet.** TE godkjenner ikke en endringsordre. Er TE "
    "uenig i den, sender TE en ny KOE.",
    "**Brev sendt utenfor løsningen** registreres i den, så saken viser alt som er sendt.",
    "**Saken er avgjort** når grunnlaget er avklart og hvert krav er trukket eller har en enighet. Løsningen avgjør "
    "ikke det kontrakten overlater til partene, en oppmann eller domstolene.",
)
p("Endringsordre som egen sak, også uten en KOE, og forsering etter punkt 33.8 kommer i senere versjoner.")

# 7
overskrift("Feilhåndtering:")
tabell(
    [
        ["Situasjon", "Hva løsningen gjør"],
        ["Ugyldig forespørsel", "400 med kode og melding på norsk, for eksempel ukjente felt, ugyldig JSON, kropp over 1 MB eller dybde over 32. 413 for for store filer."],
        ["Ikke innlogget, manglende tilgang", "401 uten sesjon. 403 uten prosjekt, kontraktsrolle eller team. Tilgangen kontrolleres før kroppen leses."],
        ["Kjernen avviser kommandoen", "Avvisning med kode og forklaring, for eksempel når fristen ikke tillater handlingen. Ingenting lagres."],
        ["Annen regelversjon", "En nettleser med eldre regler får `ANNEN_REGELVERSJON` og må laste siden på nytt."],
        ["Saken er endret av en annen", "409 `VERSJONSKONFLIKT` med forventet og faktisk versjon. Brukeren laster saken på nytt."],
        ["Samme kommando sendt to ganger", "Samme `kommando_id` med samme innhold gir samme svar. Med annet innhold gir den 422 `KOMMANDO_ID_BRUKT`."],
        ["Feil midt i en kommando", "Hele transaksjonen rulles tilbake. Er utfallet av COMMIT usikkert, forkastes forbindelsen, og svaret sier at utfallet er usikkert."],
        ["Catenda er nede", "Brevet er lagret. Jobben prøves på nytt etter 30 s, 60 s, 120 s og så videre, høyst én time mellom forsøkene. Hvert forsøk lagres."],
        ["Usikkert eller varig avvist utfall hos Catenda", "Jobben parkeres og logges. Driften kontrollerer og starter den på nytt med `koe_api.start_jobb_paa_nytt`."],
        ["Jobbkjøreren stopper midt i en jobb", "Leasen løper ut etter 120 sekunder. Utfallet regnes som usikkert, og jobben parkeres i stedet for å sendes blindt på nytt."],
        ["Webhook kan ikke behandles", "Hendelsen ligger i innboksen. Hvert forsøk og utfallet lagres, og behandlingen prøves igjen."],
        ["Uventet feil", "500 `INTERNAL_ERROR` uten detaljer til klienten. Feilen skrives til serverens logg, uten tokens og hemmelige stier."],
        ["Basen avviker ved oppstart", "Serveren starter ikke når identiteten har for mange rettigheter, eller når en migrasjon mangler eller er endret."],
        ["Innloggingen er ikke satt opp", "503 `AUTH_UNAVAILABLE`. Mangler Catenda-oppsettet, venter jobbene i basen."],
    ],
    [2700, 6570],
)
p("**Mangler før produksjon:**", holdsammen=True)
punkter(
    "[[Strukturert driftslogg med korrelasjons-ID (#1805)]] og varsling når jobber parkeres eller køen vokser "
    "([[driftsverdiene er ikke fastsatt]]).",
    "[[Datalaget prøver ikke på nytt når den første tilkoblingen til en pauset serverløs base feiler.]] Anbefalingen er "
    "at automatisk pause er av i produksjon.",
)

# 8
overskrift("Sikkerhet og risiko:")
overskrift("Autentisering", 2)
punkter(
    "**TE og BH** logger inn med Catenda (OAuth 2 med autorisasjonskode). State og nettlesertoken lagres som hash og "
    "kan brukes én gang, innen 10 minutter.",
    "**Godkjennere** logger inn med Entra ID (OIDC med PKCE og nonce). ID-tokenet valideres mot nøklene til tenanten. "
    "Bare identiteter driften har registrert, slipper inn.",
    "**Én person, én bruker.** Begge veier løser identiteten gjennom samme prosedyre i basen. Lar den seg ikke avgjøre, "
    "avvises innloggingen.",
    "**Sesjonen** er et tilfeldig token på 32 byte. Basen har bare SHA-256 av det. Kapselen `__Host-koe_session` er "
    "`HttpOnly`, `Secure` og `SameSite=Lax`, og sesjonen varer 8 timer. [[Tidsavbrudd ved inaktivitet og tilbakekalling "
    "når medlemskapet forsvinner, mangler (#1806)]].",
)
overskrift("Autorisasjon", 2)
punkter(
    "**Registeret.** Hver inngang krever innlogging, prosjekttilgang og eventuelt kontraktsrolle. En inngang uten et "
    "krav har en skriftlig begrunnelse, og en test feiler for en inngang som mangler begge.",
    "**CSRF** kontrolleres inne i autentiseringen for hver inngang med sesjon.",
    "**Prosjekttilgang** bygger på ferskt medlemskap fra Catenda. En for gammel medlemsliste synkroniseres før den brukes.",
    "**Kontraktsside og team.** Hvilken side (TE eller BH) og hvilket team brukeren hører til, kommer fra kontraktsteamene "
    "i Catenda. Interne notater og utkast skjermes per team og er utilgjengelige uten entydig team.",
    "**Radsikkerhet i basen** er andre forsvarslinje. Konteksten er bundet til transaksjonen, så den ikke lekker til "
    "neste bruker av forbindelsen.",
    "**Klienten bestemmer ikke identiteten.** Aktør, rolle, team, tidspunkt og hendelses-ID settes av serveren og basen.",
)
overskrift("Data, nettverk og hemmeligheter", 2)
punkter(
    "**Kryptering i transport:** HTTPS til App Service, TLS mot Catenda, Microsoft og basen. [[Serveren nekter ennå ikke "
    "en databaseforbindelse uten kryptering (#1807)]].",
    "**Kryptering av lagrede data:** [[bekreftes med IKT (Azure SQL krypterer normalt lagrede data som standard)]].",
    "**Minste rettighet i basen:** kjøretiden kan bare lese gjennom radsikkerheten og kjøre prosedyrene i `koe_api`. "
    "Serveren nekter å starte med en identitet som har flere rettigheter.",
    "**Webhooken** er beskyttet av en hemmelig sti på minst 32 tegn, sammenlignet i konstant tid, og den logges ikke. "
    "Catenda signerer ikke kallene.",
    "**Utgående trafikk** skal være stengt som standard, med en hviteliste (#1008).",
    "**Hemmeligheter** leses fra miljøvariabler. [[Plassering i Key Vault avklares]]. Repoet er offentlig og "
    "inneholder ingen hemmeligheter eller saksdata.",
    "**Avhengigheter** skannes i CI (`npm audit`) for kjøretidspakkene.",
)
overskrift("Kjente mangler og risiko", 2)
tabell(
    [
        ["Mangel eller risiko", "Tiltak", "Status"],
        ["Ingen sikkerhetshoder (CSP, HSTS, frame-ancestors, nosniff) for frontenden", "Hodene i nginx og serveren, testet mot brevvisningen", "[[Åpen (#1807)]]"],
        ["Ingen tilgangslogg for innlogging, avvisninger og endringer i tilgang", "Egen tabell som ikke kan endres, skrevet gjennom en prosedyre", "[[Åpen (#1804)]]"],
        ["Sesjonen har ikke tidsavbrudd ved inaktivitet", "Konfigurerbar levetid og tilbakekalling", "[[Åpen (#1806)]]"],
        ["Vedlegg skannes ikke for skadevare", "Skanning før lagring, fail-closed", "[[Åpen (#1808), valg av vei gjenstår]]"],
        ["Utløpte sesjoner ryddes ikke, og saksdata mangler no-store", "Opprydding og hoder", "[[Åpen (#1059)]]"],
        ["Avhengighet av Catenda", "Data i egen base, levering med nye forsøk, skriftlig avklaring med Catenda", "[[Avklares]]"],
        ["Ingen ROS-analyse eller ekstern sikkerhetsvurdering", "Gjennomføres før produksjon", "[[Åpen (#1019)]]"],
    ],
    [3700, 3770, 1800],
)

# 9
overskrift("Ytelse:")
p(
    "Lasten er liten: om lag 50–100 endringsmeldinger per prosjekt, og ett eller to prosjekter i piloten. Løsningen "
    "er bygget for riktighet og sporbarhet, ikke for høy last. Disse valgene påvirker ytelsen:"
)
punkter(
    "**Regler i nettleseren.** Brukeren ser frister, beregninger og brevutkast uten serverkall. Serveren regner bare ved "
    "innsending og lesing.",
    "**Avledet visning.** `koe.kjernebuffer` lagrer saken slik kjernen regnet den ut, med versjonene, så den ikke må "
    "regnes ut på nytt ved hver lesing.",
    "**Catenda utenfor forespørselen.** Brukeren venter aldri på Catenda når et brev sendes.",
    "**Jobbkjøreren** spør basen hvert 10. sekund, og en ny jobb vekker den med en gang. HR-synken går høyst én gang i timen.",
    "**Grenser:** JSON-kropp 1 MB, vedlegg 15 MB, webhook 256 kB, 16 MB gjennom ruteren.",
    "**Always On og basen.** En instans som alltid kjører, gir kort svartid og driver jobbkjøreren. Den holder også en "
    "serverløs base våken, noe som har en kostnad. [[Nivået i App Service og automatisk pause i basen avklares med IKT]].",
    "**Påvirkning på andre:** løsningen har egen base og egen App Service, og deler bare Catendas API med andre. "
    "Kallene dit er få, og lister hentes sidevis.",
    "[[Driftsverdier for svartid, kapasitet og varsling er ikke fastsatt]].",
)

# 10
overskrift("Sekvensdiagram/Detaljerte flytskisser:")
bilde("sek-innlogging.png", "Innlogging med Catenda")
bilde("sek-krav.png", "TE sender et krav, og brevet leveres til Catenda")
bilde("sek-webhook.png", "Webhook: en ny topic i Catenda blir en sak")

# 11
overskrift("Konfigurasjonsdetaljer:")
overskrift("Miljøene", 2)
tabell(
    [
        ["Miljø", "Formål", "Database", "Status"],
        ["Lokalt", "Utvikling: Vite med proxy til TS-serveren", "SQL Server 2025 i Docker", "I bruk"],
        ["CI (GitHub Actions)", "Tester, typesjekk og vakter ved hver endring", "SQL Server i Docker, ny base per kjøring", "I bruk"],
        ["Test i Azure", "Prøve ende til ende med et testprosjekt i Catenda; prøve managed identity, pause, hviteliste", "Azure SQL, egen testbase", "[[Desember 2026, eget abonnement er bestilt]]"],
        ["Produksjon", "Piloten", "Azure SQL, egen base", "[[Før piloten]]"],
    ],
    [1800, 3870, 2100, 1500],
)
overskrift("Containerne", 2)
tabell(
    [
        ["Bilde", "Innhold", "Port", "Kjører som"],
        ["`Dockerfile`", "Bygger frontenden (Node 22) og serverer den med nginx 1.27-alpine. Malen fylles med `KOE_TS_SERVEREN` ved oppstart.", "8080", "nginx"],
        ["`Dockerfile.ts-serveren`", "Node 22-slim med kjernen, serveren og migrasjonsfilene, uten testene. TypeScript kjøres direkte.", "8090", "`node` (ikke root)"],
    ],
    [2200, 4870, 900, 1300],
)
p("[[Lås nginx-versjonen (minst 1.27.3) i stedet for den flytende taggen før utrulling]].")
overskrift("Miljøvariablene", 2)
tabell(
    [
        ["Variabel", "Brukes til", "Hemmelig"],
        ["KOE_DATALAG_TILKOBLING", "Tilkoblingen til basen som `koe_runtime`", "Ja, med mindre managed identity brukes"],
        ["KOE_LYTTEADRESSE", "Adressen serveren lytter på (0.0.0.0 i bildet)", "Nei"],
        ["APP_ENV", "`development` gir kapselnavn uten `__Host-` og tillater HTTP lokalt", "Nei"],
        ["AUTH_FRONTEND_URL", "Løsningens adresse, for omdirigering og lenker", "Nei"],
        ["AUTH_MEMBERSHIP_MAX_AGE_SECONDS", "Hvor gammel medlemslisten kan være før den synkroniseres", "Nei"],
        ["CATENDA_CLIENT_ID, CATENDA_CLIENT_SECRET", "OAuth-klienten i Catenda", "Hemmeligheten"],
        ["CATENDA_LOGIN_REDIRECT_URI", "Tilbakekallet etter innlogging", "Nei"],
        ["CATENDA_ACCESS_TOKEN, CATENDA_GRUNNADRESSE, CATENDA_NETTADRESSE", "Integrasjonens token eller token-broker, API-adressen, lenken til topicen", "Tokenet"],
        ["ENTRA_CLIENT_ID, ENTRA_CLIENT_SECRET, ENTRA_AUTHORITY, ENTRA_REDIRECT_URI", "Innlogging for godkjennere og Graph", "Hemmeligheten"],
        ["WEBHOOK_SECRET_PATH, RATE_LIMIT_WEBHOOK", "Den hemmelige stien og grensen for webhooken", "Stien"],
        ["KOE_DRIFT_TILKOBLING", "Bare for driftsskriptet, som `koe_driftsrolle`", "Ja"],
        ["KOE_TS_SERVEREN", "Ruterens adresse til serveren, for eksempel 127.0.0.1:8090", "Nei"],
    ],
    [3600, 4170, 1500],
    str_=16,
)
overskrift("Migrasjoner og utrulling", 2)
punkter(
    "Skjemaet endres bare gjennom versjonerte filer i `database/migrasjoner/` (73 filer, navngitt `ÅÅÅÅMMDDTTMMSS_navn.sql`). "
    "Hver fil anvendes i én transaksjon sammen med en rad i historikken med sha256 av fila.",
    "Runneren krever at den kjøres som eieren av basen (`dbo`), så eierskapskjeden fra prosedyrene holder.",
    "Serveren kontrollerer ved oppstart at historikken i basen er lik filene, og starter ikke ellers.",
    "En vakt i CI hindrer at en anvendt migrasjon endres. En vakt for regelversjonen krever ny versjon når kjernen endres.",
    "[[Hvem som anvender migrasjonene i Azure, og med hvilken identitet, avklares med IKT]]. [[Tilbakerulling avtales "
    "sammen med sikkerhetskopien]], fordi en eldre server ikke starter mot en nyere base.",
)
overskrift("App Service", 2)
punkter(
    "Always On, så jobbkjøreren går også når ingen bruker løsningen.",
    "Bare HTTPS, og TLS-versjonen settes i App Service.",
    "Systemtildelt managed identity mot basen.",
    "[[Helsesjekken /health svarer fra ruteren og sjekker ikke serveren eller basen. Hva den skal sjekke, avklares]].",
)

# 12
overskrift("Testing:")
p(
    "Løsningen har om lag 2 200 automatiske tester i 131 filer. De kjører i GitHub Actions ved hver endring, og "
    "testene for serveren og lagringen kjører mot en ekte SQL Server i Docker."
)
tabell(
    [
        ["Testtype", "Hva den viser", "Omfang"],
        ["Kjernen", "Reglene, fristene, utledningen og brevteksten mot forventninger med kilde i kontrakten eller vedtak", "23 filer, om lag 800 tester"],
        ["Serveren mot SQL Server", "Tilgang, radsikkerhet, transaksjoner, levering, webhook, innlogging, migrering og oppstart", "54 filer, om lag 950 tester"],
        ["Frontenden", "Komponenter, skjemaer og grensen mot kjernen", "45 filer, om lag 450 tester"],
        ["Arkitekturtest", "At kjernen ikke importerer noe utenfor mappa, og hva reglene leser", "Del av kjernen"],
        ["Registertest", "At hver inngang krever det registeret sier, over HTTP", "Alle 34 innganger"],
        ["Feilinnføring", "At testene oppdager innførte feil i kjernen (mutasjoner)", "Hver natt i 12 parallelle jobber, og på PR-er som rører kjernen"],
        ["Brukerforløp i nettleser", "Stegene i et forløp kjørt i den ekte saksruta med innlogging (Playwright)", "Akseptkriteriet for hvert forløp"],
        ["Universell utforming", "WCAG 2.1 A og AA med axe", "Ved endringer i visningen"],
        ["Vakter", "Regelversjon, migrasjoner, datamodellregistrene, lenker, avhengigheter", "Ved hver endring"],
    ],
    [2200, 4870, 2200],
)
p("**Testplan fram mot piloten:**", holdsammen=True)
tabell(
    [
        ["Steg", "Hva som prøves", "Godkjent når"],
        ["Brukerforløpene med Juridisk avdeling", "Det juridiske innholdet i skjemaer, regler og brev", "Juridisk avdeling har godkjent forløpene"],
        ["Brukerforløpene med prosjektledere", "Forståelse og arbeidsflyt", "Funnene er rettet eller avklart"],
        ["Prøve ende til ende", "TEs krav og BHs svar levert til et testprosjekt i Catenda, i testmiljøet i Azure", "Brevene ligger i Catenda med riktig innhold, og kvitteringene er lagret"],
        ["Plattformen i Azure", "Managed identity, pause i basen, Always On, hvitelisten for utgående trafikk", "Hvert punkt er prøvd og dokumentert"],
        ["Gjenopprettingsøvelse", "Gjenoppretting av basen uten at brev leveres på nytt", "RPO og RTO er dokumentert"],
        ["Sikkerhet", "ROS-analyse og ekstern sikkerhetsvurdering", "Funnene er lukket eller akseptert"],
        ["Pilot", "Ekte saker i ett eller to prosjekter", "[[Kriteriene avklares før piloten]]"],
    ],
    [2400, 4170, 2700],
)

# 13
overskrift("Innspill fra Løsningsråd:")
p("Fylles ut etter behandlingen i Løsningsrådet.")

# 14
overskrift("Vedlegg:")
tabell(
    [
        ["Vedleggsnummer", "Dokumentnavn", "Kategori"],
        ["1", "Tabellbeskrivelse (tabellbeskrivelse.xlsx)", "Datamodell"],
        ["2", "Relasjoner og dataflyt mot Catenda", "Datamodell og integrasjon"],
        ["3", "Overordnet design for Endringsmeldinger", "Arkitektur"],
        ["4", "Catendas API-spesifikasjoner (OpenAPI)", "Integrasjon"],
        ["5", "Spørsmål til IKT om Azure SQL og hosting, med svarene (#78)", "Avklaring med IKT"],
        ["6", "Faktagrunnlag for personvernvurdering (DPIA)", "Personvern"],
        ["7", "ROS-analyse", "[[Ikke utarbeidet]]"],
    ],
    [2000, 5070, 2200],
)

# ---------------------------------------------------------------- innholdsfortegnelsen

PRPR = ('<w:pPr><w:pStyle w:val="INNH1"/><w:tabs><w:tab w:val="right" w:leader="dot" w:pos="9260"/></w:tabs>'
        "<w:rPr><w:noProof/></w:rPr></w:pPr>")
toc = ['<w:sdt><w:sdtPr><w:docPartObj><w:docPartGallery w:val="Table of Contents"/><w:docPartUnique/></w:docPartObj></w:sdtPr><w:sdtContent>',
       '<w:p><w:pPr><w:pStyle w:val="Overskriftforinnholdsfortegnelse"/></w:pPr><w:r><w:t>Innhold</w:t></w:r></w:p>']
for i, (merke, tekst) in enumerate(overskrifter):
    start = ('<w:r><w:fldChar w:fldCharType="begin"/><w:instrText xml:space="preserve"> TOC \\o "1-1" \\h \\z \\u </w:instrText>'
             '<w:fldChar w:fldCharType="separate"/></w:r>') if i == 0 else ""
    side = str(SIDETALL.get(tekst, ""))
    toc.append(
        f"<w:p>{PRPR}{start}<w:hyperlink w:anchor=\"{merke}\" w:history=\"1\">"
        f'<w:r><w:rPr><w:noProof/></w:rPr><w:t xml:space="preserve">{escape(tekst)}</w:t></w:r>'
        f'<w:r><w:rPr><w:noProof/><w:webHidden/></w:rPr><w:tab/><w:fldChar w:fldCharType="begin"/>'
        f'<w:instrText xml:space="preserve"> PAGEREF {merke} \\h </w:instrText><w:fldChar w:fldCharType="separate"/>'
        f'<w:t>{side}</w:t><w:fldChar w:fldCharType="end"/></w:r></w:hyperlink></w:p>'
    )
toc.append('<w:p><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:sdtContent></w:sdt>')
deler[TOC_PLASS] = "".join(toc)

# ---------------------------------------------------------------- skriv

dok = (MAL / "word/document.xml").read_text(encoding="utf-8")
start = dok.index("<w:body>") + len("<w:body>")
slutt = dok.rindex("<w:sectPr")
dok = dok[:start] + "".join(deler) + dok[slutt:]
(MAL / "word/document.xml").write_text(dok, encoding="utf-8")

num = (MAL / "word/numbering.xml").read_text(encoding="utf-8")
abstrakt = (
    '<w:abstractNum w:abstractNumId="90"><w:multiLevelType w:val="hybridMultilevel"/>'
    '<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/>'
    '<w:pPr><w:ind w:left="360" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:hint="default"/></w:rPr></w:lvl>'
    "</w:abstractNum>"
)
i = num.index("<w:num ") if "<w:num " in num else num.index("</w:numbering>")
num = num[:i] + abstrakt + num[i:]
num = num.replace("</w:numbering>", '<w:num w:numId="90"><w:abstractNumId w:val="90"/></w:num></w:numbering>')
(MAL / "word/numbering.xml").write_text(num, encoding="utf-8")

rels = (MAL / "word/_rels/document.xml.rels").read_text(encoding="utf-8")
ny = "".join(
    f'<Relationship Id="{rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/{fil}"/>'
    for rid, fil in bilder
)
(MAL / "word/_rels/document.xml.rels").write_text(rels.replace("</Relationships>", ny + "</Relationships>"), encoding="utf-8")
ct = (MAL / "[Content_Types].xml").read_text(encoding="utf-8")
if 'Extension="png"' not in ct:
    ct = ct.replace("<Default ", '<Default Extension="png" ContentType="image/png"/><Default ', 1)
(MAL / "[Content_Types].xml").write_text(ct, encoding="utf-8")
(MAL / "word/media").mkdir(exist_ok=True)
for _, fil in bilder:
    shutil.copy(BILDER / fil, MAL / "word/media" / fil)
print(json.dumps([t for _, t in overskrifter], ensure_ascii=False))
