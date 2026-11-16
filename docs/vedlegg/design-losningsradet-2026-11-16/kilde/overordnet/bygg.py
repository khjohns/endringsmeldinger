"""Fyller malen for overordnet design. Bruk: bygg.py <utpakket mal> <bildemappe>."""
import re
import shutil
import sys
from pathlib import Path
from xml.sax.saxutils import escape

MAL = Path(sys.argv[1])
BILDER = Path(sys.argv[2])
FONT = '<w:rFonts w:ascii="Oslo Sans Office" w:hAnsi="Oslo Sans Office"/>'
SIDEBREDDE = 9072  # dxa mellom margene
EMU_BREDDE = 5760720

deler = []


def run(tekst, fet=False, kursiv=False, gul=False, str_=22, farge=None):
    rpr = FONT + ("<w:b/><w:bCs/>" if fet else "") + ("<w:i/><w:iCs/>" if kursiv else "")
    if farge:
        rpr += f'<w:color w:val="{farge}"/>'
    if gul:
        rpr += '<w:highlight w:val="yellow"/>'
    rpr += f'<w:sz w:val="{str_}"/><w:szCs w:val="{str_}"/>'
    return f'<w:r><w:rPr>{rpr}</w:rPr><w:t xml:space="preserve">{escape(tekst)}</w:t></w:r>'


def runs(tekst, str_=22):
    """**fet** og [[åpent punkt]] (gul markering)."""
    ut = []
    for bit in re.split(r"(\*\*.+?\*\*|\[\[.+?\]\])", tekst):
        if not bit:
            continue
        if bit.startswith("**"):
            ut.append(run(bit[2:-2], fet=True, str_=str_))
        elif bit.startswith("[["):
            ut.append(run(bit[2:-2], gul=True, str_=str_))
        else:
            ut.append(run(bit, str_=str_))
    return "".join(ut)


def p(tekst, stil=None, punkt=False, jc=None, etter=None, str_=22, holdsammen=False):
    ppr = ""
    if stil:
        ppr += f'<w:pStyle w:val="{stil}"/>'
    if holdsammen:
        ppr += "<w:keepNext/>"
    if punkt:
        ppr += '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>'
    if etter is not None:
        ppr += f'<w:spacing w:after="{etter}"/>'
    if jc:
        ppr += f'<w:jc w:val="{jc}"/>'
    deler.append(f"<w:p><w:pPr>{ppr}<w:rPr>{FONT}</w:rPr></w:pPr>{runs(tekst, str_)}</w:p>")


def overskrift(tekst, niva=1):
    if niva in (1, 2):
        rpr = FONT + '<w:b/><w:bCs/><w:color w:val="auto"/><w:sz w:val="28"/><w:szCs w:val="28"/><w:u w:val="single"/>'
        stil = f"Overskrift{niva}"
        spacing = '<w:spacing w:line="240" w:lineRule="auto"/>' if niva == 1 else ""
    else:
        rpr = FONT + '<w:b/><w:bCs/><w:color w:val="auto"/><w:sz w:val="24"/><w:szCs w:val="24"/>'
        stil = "Overskrift3"
        spacing = '<w:spacing w:before="200" w:after="60"/>'
    deler.append(
        f'<w:p><w:pPr><w:pStyle w:val="{stil}"/>{spacing}<w:rPr>{rpr}</w:rPr></w:pPr>'
        f'<w:r><w:rPr>{rpr}</w:rPr><w:t xml:space="preserve">{escape(tekst)}</w:t></w:r></w:p>'
    )


def punkter(*linjer):
    for linje in linjer:
        p(linje, punkt=True, etter=60)


def tabell(rader, bredder, hode=True):
    assert sum(bredder) == SIDEBREDDE, sum(bredder)
    grid = "".join(f'<w:gridCol w:w="{b}"/>' for b in bredder)
    xml = [
        f'<w:tbl><w:tblPr><w:tblStyle w:val="Tabellrutenett"/><w:tblW w:w="{SIDEBREDDE}" w:type="dxa"/>'
        '<w:tblLayout w:type="fixed"/>'
        '<w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="90" w:type="dxa"/>'
        '<w:bottom w:w="40" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tblCellMar>'
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
                    f'<w:p><w:pPr><w:spacing w:after="40" w:line="240" w:lineRule="auto"/><w:rPr>{FONT}</w:rPr></w:pPr>'
                    f"{runs(tekst, 20)}</w:p>"
                )
            xml.append("</w:tc>")
        xml.append("</w:tr>")
    xml.append("</w:tbl>")
    deler.append("".join(xml))
    p("", etter=0)


bilde_nr = [0]


def bilde(rid, bredde_px, hoyde_px, navn, tekst):
    bilde_nr[0] += 1
    n = bilde_nr[0]
    cx = EMU_BREDDE
    cy = int(EMU_BREDDE * hoyde_px / bredde_px)
    deler.append(
        '<w:p><w:pPr><w:keepNext/><w:spacing w:after="60"/><w:jc w:val="center"/></w:pPr><w:r><w:drawing>'
        f'<wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="{cx}" cy="{cy}"/>'
        f'<wp:docPr id="{n}" name="{navn}" descr="{escape(tekst)}"/>'
        '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>'
        '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
        '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
        '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
        f'<pic:nvPicPr><pic:cNvPr id="{n}" name="{navn}"/><pic:cNvPicPr/></pic:nvPicPr>'
        f'<pic:blipFill><a:blip r:embed="{rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
        f'<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>'
        "</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>"
    )
    deler.append(
        f'<w:p><w:pPr><w:spacing w:after="200"/><w:jc w:val="center"/><w:rPr>{FONT}</w:rPr></w:pPr>'
        f'{run(f"Figur {n}: {tekst}", kursiv=True, str_=18, farge="404040")}</w:p>'
    )


# ---------------------------------------------------------------- innholdet

tittel_rpr = FONT + '<w:color w:val="auto"/>'
deler.append(
    f'<w:p><w:pPr><w:pStyle w:val="Overskrift1"/><w:spacing w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr>{tittel_rpr}</w:rPr></w:pPr>'
    f'<w:r><w:rPr>{tittel_rpr}</w:rPr><w:t>Overordnet design (HLD): Endringsmeldinger</w:t></w:r></w:p>'
)
p("Kontraktsadministrasjon etter NS 8407 for byggherren og totalentreprenøren", jc="center", etter=240)
tabell(
    [
        ["Dato", "16.11.2026"],
        ["Versjon og status", "0.1, utkast til behandling i Løsningsrådet"],
        ["Innmelder", "Kasper Holter Johns, Juridisk avdeling"],
        ["Systemeier", "Kasper Holter Johns (foreløpig). [[Systemeier og forvaltning i drift avklares før produksjon]]"],
        ["Primær behovshaver", "Divisjon Utbygging"],
        ["Løsningens tilstand", "Under utvikling. Ikke i produksjon, og ingen reelle data."],
    ],
    [2600, 6472],
    hode=False,
)
p("Gule markeringer er punkter som ikke er avklart ennå.", etter=240, str_=20)

overskrift("Arkitektur/Forretningslandskap:", 2)
p(
    "Endringsmeldinger er en fagapplikasjon for kontraktsadministrasjon i byggeprosjekter med totalentreprise "
    "etter NS 8407. Den brukes av begge parter i kontrakten: Oslobygg KF som byggherre (BH) og totalentreprenøren (TE)."
)
p(
    "Partene bruker allerede Catenda som prosjekthotell. Løsningen bygger på Catenda for innlogging, prosjektmedlemskap "
    "og utveksling av dokumenter. Brevene legges i saken i Catenda. Løsningen legger til det Catenda ikke har: reglene for "
    "varsler, frister og svar etter NS 8407, strukturerte krav og svar, intern godkjenning hos byggherren og en historikk "
    "som kan etterprøves."
)
p(
    "**Krav om endringsordre (KOE)** er totalentreprenørens varsel og krav. **Endringsordre (EO)** er byggherrens "
    "skriftlige pålegg om en endring etter punkt 31.3. Byggherren utsteder den når byggherren godkjenner en KOE, eller "
    "på eget initiativ uten en KOE. Totalentreprenøren godkjenner ikke endringsordren. Er totalentreprenøren uenig i "
    "den, fremsetter totalentreprenøren en ny KOE."
)
bilde("rIdBilde1", 1400, 780, "Forretningslandskap", "Løsningen i forretningslandskapet")
p("**Plasseringen i landskapet:**", holdsammen=True)
punkter(
    "**Forretningsprosess:** endringshåndtering i gjennomføringsfasen: totalentreprenørens KOE, byggherrens svar, "
    "byggherrens endringsordre (punkt 31.3) og forsering (punkt 33.8).",
    "**Applikasjonslandskap:** en ny fagapplikasjon i et eget Azure-abonnement for løsningen. Den er integrert med Catenda (ekstern "
    "skytjeneste), Microsoft Entra ID og Microsoft Graph (internt) og senere Microsoft Fabric for rapportering.",
    "**Brukere:** prosjektledere og rådgivere på begge sider, og ledere i Oslobygg som godkjenner svar over "
    "fullmaktsgrensen.",
    "**Erstatter:** på sikt bruken av byggherrens formularer og blanketter for varsler og krav. I pilotene brukes "
    "løsningen ved siden av dem (se «Dagens praksis» under). Catenda erstattes ikke. Det er fortsatt der "
    "dokumentasjonen ligger.",
)
p("**Dagens praksis:**", holdsammen=True)
punkter(
    "Kontraktsgrunnlaget (konkurransegrunnlaget del II, tillegget til NS 8407 punkt 5) krever at byggherrens formularer "
    "og blanketter brukes for varsler og krav, og at byggherrens prosjekthotell brukes. Varsler og krav som kan påvirke "
    "pris, kvalitet eller framdrift, blant annet etter punkt 32.2, 33.4, 33.8 og 34.1.3, skal sendes skriftlig.",
    "All dokumentasjon skal legges i prosjekthotellet Catenda, og det gjøres i hovedsak.",
    "Ellers varierer praksisen mellom prosjektene, og den er vanskelig å kontrollere. Prosjektlederne på begge sider "
    "kjenner ikke alltid prosessen godt.",
    "I pilotene skal det fortsatt være tillatt å sende varsler og krav utenfor løsningen. En plikt til å bruke "
    "løsningen er vanskelig å håndheve. Byggherren ville dessuten bære risikoen for at totalentreprenøren ikke får "
    "fremmet et varsel eller krav i tide. Brev som sendes utenfor løsningen, registreres i den.",
    "Forholdet mellom brevene fra løsningen, byggherrens formularer og kontraktsteksten er fleksibelt i pilotene. "
    "[[Hvordan det formuleres i kontrakten, vurderes før første pilot]].",
)

overskrift("Scope/Prioritet:", 2)
p("**Første versjon (fram til første ekte sak)** omfatter:", holdsammen=True)
punkter(
    "TEs varsel om et forhold (grunnlaget) og krav om vederlag og fristforlengelse.",
    "BHs svar i hvert spor (grunnlag, vederlag og frist), med intern godkjenning når svaret går over fullmaktsgrensen.",
    "Brevet som PDF, levert som dokument i saken i Catenda, med vedlegg.",
    "Registrering av brev som er sendt utenfor løsningen.",
    "Saksliste og oversikt over grunnlag, vederlag og frist i hver sak.",
)
p("**Endringsordren i første versjon:** byggherrens svar som godkjenner en KOE, kan være endringsordren.")
p("**Senere versjoner:** endringsordre som egen sak, også utstedt uten en KOE, forsering fullt ut, koblinger mellom saker, rapportering til Fabric og "
  "eksport av en sak som bevis.")
p("**Utenfor scope:** løsningen avgjør ikke det kontrakten overlater til partene, en oppmann eller domstolene. "
  "Den viser hva partene har sagt, og hvilke frister som følger av det. Integrasjon mot økonomi- eller "
  "prosjektstyringssystem er også utenfor. Den eneste integrasjonen mot et fagsystem er Catenda.")
p("**Innføring i trinn:**", holdsammen=True)
punkter(
    "Gjennomgang av brukerforløpene med Juridisk avdeling, for å kontrollere det juridiske innholdet.",
    "Gjennomgang med andre brukere, blant annet prosjektledere.",
    "Pilot i ett eller to utvalgte, reelle totalentrepriseprosjekter.",
)
p(
    "**Foreslått dokumentasjonsnivå:** full behandling med detaljert design. Løsningen sender kontraktskorrespondanse "
    "med rettsvirkning. Et varsel som ikke kommer fram i tide, kan føre til at et krav tapes. Det stiller høye krav til "
    "integritet og sporbarhet."
)
p("**Driftskostnad:** IKT anslår om lag 2 000–2 500 kroner i måneden for database, App Service og integrasjoner.")

overskrift("Formål og begrunnelse:")
p("**Hvordan saken oppsto:** Juridisk avdeling tok initiativet, ut fra behovet for en mer strukturert prosess for "
  "endringsmeldinger. Primær behovshaver er divisjon Utbygging, som gjennomfører byggeprosjektene.")
p("**Utfordringen:**", holdsammen=True)
punkter(
    "NS 8407 har korte og strenge frister for varsler og svar. Et varsel som kommer for sent, kan føre til at et krav "
    "eller en innsigelse tapes (preklusjon).",
    "I tvister er det ofte uklart hvem som varslet hva, og når. Korrespondansen er spredt på e-post, brev og "
    "kommentarer, og det er vanskelig å se hvilke krav som er besvart, og hvilke frister som løper.",
    "Praksisen varierer mellom prosjektene og er vanskelig å kontrollere, og prosjektlederne kjenner ikke alltid "
    "prosessen godt.",
    "Byggherren må svare innenfor fullmaktene. Det krever en intern godkjenning før svaret sendes.",
)
p("**Løsningen:**", holdsammen=True)
punkter(
    "Skjemaer som følger bestemmelsene i NS 8407, for varsler, krav og svar i hvert spor.",
    "En regelmotor (domenekjernen) som viser hvilke frister som gjelder og hva som er besvart, og som hindrer en "
    "handling kontrakten ikke åpner for.",
    "Hver handling lagres som en hendelse som ikke endres i ettertid. Brevet fryses når det sendes, og leveres "
    "til saken i Catenda.",
    "Intern godkjenning hos byggherren, med godkjenningskjeden hentet fra HR-dataene.",
)
p("**Gevinsten:**", holdsammen=True)
punkter(
    "Skjemaene leder byggherren og totalentreprenøren gjennom kontraktens vilkår for hvert krav, svar og hver "
    "forespørsel. Det partene sender, svarer da ut forutsetningene i kontrakten. Det gir mer fullstendige krav og svar, "
    "og færre uenigheter om form og innhold.",
    "Mindre risiko for at Oslobygg taper innsigelser, og for at entreprenøren taper krav, på grunn av oversette frister.",
    "Mer åpenhet og oversikt over kravene for begge parter. Det kan redusere konfliktene.",
    "En historikk som kan legges fram ved uenighet, med hvem som sendte hva og når. Juridisk avdeling får et bedre "
    "grunnlag og bruker mindre tid når det oppstår uenighet.",
    "Like brev og mindre manuelt arbeid for prosjektlederne.",
    "Fullmaktene kontrolleres før svaret sendes.",
    "Oversikt over endringene på tvers av prosjektene, når rapporteringen i Fabric er på plass.",
    "**Omfang:** om lag 50–100 endringsmeldinger per prosjekt i snitt. Dette er et foreløpig anslag. Sikrere tall, "
    "og en tallfestet gevinst, hentes senere.",
)

overskrift("Arkitekturdiagram:")
bilde("rIdBilde2", 1500, 920, "Arkitekturdiagram", "Overordnet arkitektur i Azure")
punkter(
    "**Moduler:** én webapp i Azure App Service med to containere. Ruteren (nginx) serverer frontenden og sender API-kall "
    "og webhooken til TS-serveren. TS-serveren har API-et, domenekjernen og jobbkjøreren.",
    "**Én vertsadresse:** frontenden og API-et må stå bak samme adresse, fordi sesjonskapselen er bundet til verten.",
    "**Domene:** kontraktsadministrasjon i prosjektgjennomføringen.",
    "**Datakilde:** en egen Azure SQL Database (serverløs) i løsningens Azure-abonnement. Appen kobler seg til med managed identity.",
    "**Eksterne koblinger:** Catenda (api.catenda.com), som er en ekstern skytjeneste. Totalentreprenørens brukere er "
    "eksterne og logger inn med Catenda-kontoen sin.",
    "**Nettverk:** en offentlig HTTPS-adresse for brukerne og for webhooken fra Catenda. Utgående trafikk fra serveren "
    "skal være stengt som standard, med en hviteliste (Catenda og Microsofts innloggings- og Graph-adresser). "
    "[[Avklares med IKT: offentlig endepunkt med brannmur eller privat endepunkt mot databasen]].",
)

overskrift("Kompontentbeskrivelse: ")
tabell(
    [
        ["Komponent", "Ansvar", "Teknologi"],
        ["Frontend (visningen)", "Skjemaer, saksliste, brev og oversikter. Brukeren kan prøve ut et svar og se beregningen og brevet uten å vente på serveren.",
         "SvelteKit 2, Svelte 5, TypeScript, Tailwind CSS. Bygget som statiske filer"],
        ["Domenekjernen", "Reglene etter NS 8407: hva som kan sendes, hvilke frister som gjelder, sakens situasjon og brevteksten. Kjører både i nettleseren og på serveren. Serveren prøver alt på nytt og avviser et svar regnet med en annen regelversjon.",
         "TypeScript uten eksterne avhengigheter"],
        ["Ruter", "Serverer frontenden og sender /api og /webhook videre til TS-serveren. HTTPS avsluttes i App Service. [[Sikkerhetshoder (CSP, HSTS m.fl.) er ikke lagt inn ennå, og er et krav før produksjon]].", "nginx 1.27"],
        ["TS-server", "API-et. Hver inngang står i et register med kravene til innlogging, prosjekttilgang og kontraktsrolle. Innlogging og sesjon, kommandoer som skriver hendelsen og leveringsoppdraget i én transaksjon, brev-PDF og mottak av webhooken.",
         "Node.js 22, TypeScript, mssql, jose, pdf-lib"],
        ["Jobbkjører", "Går i serverprosessen. Oppretter saken i Catenda, leverer brev og vedlegg, behandler hendelser fra webhooken og henter HR-data. Krever én instans som alltid kjører.",
         "Samme prosess som TS-serveren"],
        ["Database", "Hendelsesloggen, saker, brev, leveringsoppdrag, kø, sesjoner og tilgang. Tilgangen håndheves også i basen, med radsikkerhet og lagrede prosedyrer som eneste skrivevei.",
         "Azure SQL Database (T-SQL), versjonerte migrasjonsfiler"],
        ["Driftsskript", "Registrerer prosjekter, kontraktsteam, partsnavn, fristtabell og identiteter fra Entra ID. Er ingen inngang i appen.",
         "Node-skript mot egne driftsprosedyrer i basen"],
        ["Bygging og test", "Tester, typesjekk, lint, kontroll av regelversjon og utrulling.",
         "GitHub Actions, Vitest, SQL Server i Docker, Playwright"],
    ],
    [1800, 4672, 2600],
)
p("**Teknologivalg og begrunnelse:**", holdsammen=True)
punkter(
    "**TypeScript i hele løsningen:** de samme reglene kjører i nettleseren og på serveren. Serveren er den eneste "
    "autoritative regelbehandlingen.",
    "**Egen Node-server ved siden av en statisk frontend:** serveren kan rulles ut og tilbake for seg, og frontenden "
    "trenger ingen server.",
    "**Azure SQL Database:** inngår i Oslobyggs drift i dag, kan speiles til Fabric og er rimeligere enn en egen "
    "PostgreSQL-tjeneste.",
    "**Få avhengigheter på serveren:** serveren bruker Node.js sin innebygde HTTP-modul og ingen webrammeverk. Det "
    "gir en liten angrepsflate og få oppgraderinger.",
)
p(
    "**Utvikling og kildekode:** løsningen utvikles av innmelder med AI-agenter (Claude Code). Kildekoden ligger i et "
    "offentlig GitHub-repo under innmelderens personlige konto. Repoet har ingen hemmeligheter eller saksdata. Hver endring går gjennom en pull request med automatiske tester, "
    "typesjekk og kodegjennomgang, og innmelder godkjenner den før den flettes inn. Reglene er knyttet til kilden i "
    "NS 8407 og til registrerte vedtak, så hver regel kan spores. [[Om repoet flyttes til en organisasjon i Oslobygg "
    "eller Oslo kommune, avklares sammen med forvaltningen før produksjon]]."
)

overskrift("Datamodell:")
p(
    "Løsningen lagrer en **hendelseslogg** (journalen). Hver handling fra en part lagres som en hendelse som ikke endres "
    "eller slettes. Et brev lagres samlet som ett dokument, med versjonen av formatet og reglene det ble laget med. "
    "Sakens situasjon regnes ut fra journalen. Tabeller for oppslag og rapporter kan bygges på nytt fra den."
)
p("Basen har 42 tabeller i fire grupper:", holdsammen=True)
tabell(
    [
        ["Gruppe", "Innhold", "Eksempler"],
        ["Grunndata", "Brukere, identiteter, prosjekter, medlemskap, kontraktsteam, roller og kontraktens frister og sum",
         "app_users, projects, catenda_contract_teams, kontraktsfrist"],
        ["Transaksjoner", "Saker, hendelser, brev, leveringsoppdrag, kvitteringer, vedlegg, godkjenninger og interne notater",
         "sak_metadata, hendelse, leveringsoppdrag, godkjenningspakke"],
        ["Kopier", "Medlemskap fra Catenda og stilling og leder fra HR-dataene", "app_project_memberships, hr_kopi"],
        ["Teknisk", "Jobbkø, innboks for webhooken, sesjoner og innloggingsforsøk", "jobb, innkommende_hendelse, app_sessions"],
    ],
    [1700, 4372, 3000],
)
punkter(
    "**Datatyper:** brevene lagres som JSON i tekstkolonner, og tidspunktene settes av klokka i basen. Basen bruker "
    "sorteringen Latin1_General_100_BIN2_UTF8, så store og små bokstaver i ID-er ikke blandes.",
    "**Vedlegg** mellomlagres i basen, med kontrollsum, til Catenda har kvittert for dem.",
    "**Dataflyt:** saker og medlemmer kommer inn fra Catenda. Brev og vedlegg går ut til Catenda. Stilling og leder "
    "kommer inn fra Graph. Brevinnholdet skal senere speiles til Fabric.",
    "**Interne notater og utkast** ligger utenfor journalen og ses bare av teamet som skrev dem.",
    "Tabellene, relasjonene og dataflyten er beskrevet i detalj i datamodellen (vedlegg 1 og 2).",
)

overskrift("Integrasjoner:")
tabell(
    [
        ["System", "Retning", "Protokoll og autentisering", "Data"],
        ["Catenda, brukerens tilgang", "Inn", "OAuth 2 med autorisasjonskode", "Innlogging, brukerens prosjekter"],
        ["Catenda, appens tilgang", "Inn og ut", "REST over HTTPS. Integrasjonsnøkkel (client credentials)",
         "Medlemmer og team, topics, kommentarer, dokumentbibliotek: brev-PDF og vedlegg"],
        ["Catenda, webhook", "Inn", "HTTPS POST til en hemmelig sti. Catenda signerer ikke kallet",
         "Nye og endrede topics. Lagres i en innboks før svaret, og samme hendelse lagres bare én gang"],
        ["Microsoft Entra ID", "Inn", "OpenID Connect med PKCE", "Innlogging for godkjennere i Oslobygg"],
        ["Microsoft Graph", "Inn", "REST, appens egen tilgang (client credentials)", "Stillingstittel og leder, for roller og godkjenningskjeden"],
        ["Azure SQL Database", "Inn og ut", "TDS, managed identity", "All lagring"],
        ["Microsoft Fabric", "Ut", "Speiling av databasen (planlagt)", "Brevinnholdet, uten interne notater og utkast"],
    ],
    [1900, 1100, 2900, 3172],
)
punkter(
    "**Levering til Catenda er robust:** det som skal leveres, fryses i samme transaksjon som hendelsen. Jobbkjøreren "
    "prøver på nytt hvis Catenda er nede, og hvert forsøk og hver kvittering lagres. Et nytt forsøk sender samme brev.",
    "**Kontroll på dataene:** Oslobygg eier dataene i egen database. Catenda er en ekstern leverandør, og API-ene er "
    "dokumentert med OpenAPI.",
    "**Avtalen med Catenda:** integrasjonsnøkkelen krever en Boost-avtale. Oslobygg har avtalen, og integrasjonen "
    "er prøvd og virker.",
    "**Leverandørkontakt som trengs:** [[Avklares med Catenda: et skriftlig svar på hva som gjelder for løpende "
    "frister når Catenda er utilgjengelig]].",
    "[[Avklares med IKT: hvilke Graph-tillatelser appen kan få]].",
)

overskrift("Verdivurdering:")
p("Forslag til vurdering. [[Avklares mot Oslobyggs klassifisering]].", holdsammen=True)
tabell(
    [
        ["Egenskap", "Foreslått nivå", "Begrunnelse"],
        ["Konfidensialitet", "Middels",
         "Kontraktsinformasjon og økonomiske krav. Byggherrens interne notater, utkast og godkjenninger skal ikke nå "
         "entreprenøren. Ingen særlige kategorier av personopplysninger."],
        ["Integritet", "Høy",
         "Brevene har rettsvirkning. Et endret eller tapt varsel kan føre til at et krav tapes. Hendelsene endres "
         "aldri, brevet fryses når det sendes, og aktøren og tidspunktet settes av serveren og basen."],
        ["Tilgjengelighet", "Middels",
         "Fristene løper i dager, ikke timer. Kort nedetid kan tåles. Et brev lagres før det leveres, og leveres når "
         "Catenda svarer igjen."],
    ],
    [1800, 1500, 5772],
)

overskrift("Persondata:", 2)
p("Løsningen behandler personopplysninger om ansatte i Oslobygg, hos entreprenøren og hos rådgivere:", holdsammen=True)
punkter(
    "Navn og e-post, fra Catenda eller Entra ID.",
    "Identiteten i Catenda og Entra ID, prosjektmedlemskap og team.",
    "Hvem som har en rolle med fullmakt, og hvem som er lederen (fra HR-dataene).",
    "Hvem som har sendt hvert brev og når. Journalen lagrer bare bruker-ID-en, og navnet slås opp når saken vises.",
    "Fritekst i brev, notater og vedlegg kan inneholde personopplysninger.",
)
p("**Avtaler:** behandlingen hos Catenda og i Azure dekkes av Oslobyggs eksisterende databehandleravtaler. "
  "Løsningen sender ikke andre opplysninger til dem, og ikke for andre formål, enn det avtalene allerede dekker.")
p("**Tiltak:** sesjonsnøkler lagres bare som hash, interne notater kan slettes, og HR-kopien har bare rolle og leder.")
p(
    "**Status:** en formell personvernvurdering av løsningens behandling skal gjennomføres før produksjon. Et "
    "faktagrunnlag for den finnes (vedlegg 5). Behandlingsgrunnlaget og bevaringstiden fastsettes der. Journalen kan "
    "ikke slettes, så bevaring og sletting må vurderes særskilt."
)

overskrift("Risikovurdering:")
p("**Det foreligger ingen ROS-analyse ennå.** ROS-analysen, personvernvurderingen og en ekstern sikkerhetsvurdering er krav før produksjon. "
  "Disse risikoene er kjent og foreslås som grunnlag for ROS-analysen:", holdsammen=True)
tabell(
    [
        ["Risiko", "Tiltak i løsningen"],
        ["Et varsel kommer ikke fram eller kommer for sent, fordi løsningen eller Catenda svikter",
         "Brevet lagres før levering, og leveringen prøves på nytt og kvitteres. Skriftlig avklaring med Catenda og en manuell reserveprosess før produksjon"],
        ["Byggherrens interne vurderinger blir synlige for entreprenøren",
         "Tilgangen kontrolleres både i serveren og i basen. Notater og utkast er skjermet per team, og en inngang uten tilgangskrav stopper testene"],
        ["Feil i reglene gir feil frist eller feil brev",
         "Hver regel har en kilde i kontrakten eller et vedtak. Reglene testes, versjoneres og lagres med hendelsen"],
        ["Historikken endres i ettertid",
         "Hendelsene kan ikke endres. Aktøren hentes fra sesjonen, aldri fra klienten, og tidspunktet fra klokka i basen"],
        ["Avhengighet av Catenda (leverandør, lisens, API)", "Dataene ligger i Oslobyggs egen base. Avhengigheten skal aksepteres med en ansvarlig"],
        ["Falsk webhook", "Hemmelig sti, sammenlignet i konstant tid. Samme hendelse lagres bare én gang"],
        ["Varsler og krav sendes både i og utenfor løsningen i pilotene, så saken i løsningen blir ufullstendig",
         "Brev som sendes utenfor løsningen, registreres i den, så saken viser alt som er sendt"],
        ["Mislykket migrasjon eller tap av data", "Skjemaet endres bare gjennom migrasjonsfiler. Serveren starter ikke mot en base som avviker. Krever sikkerhetskopi og en gjenopprettingsøvelse"],
    ],
    [3600, 5472],
)

overskrift("Tidslinje:")
p("Løsningen er under utvikling og er ikke i produksjon. Planen fram mot første ekte sak:", holdsammen=True)
tabell(
    [
        ["Fase", "Innhold", "Tid"],
        ["1. Visningen og reglene", "Skjemaene for krav og svar i alle spor, med reglene", "Pågår"],
        ["2. Testmiljø i Azure", "Eget Azure-abonnement for løsningen (bestilt). App Service, Azure SQL, utrulling og tilganger, sammen med IKT", "Desember 2026"],
        ["3. Gjennomgang av brukerforløpene", "Først med Juridisk avdeling, deretter med prosjektledere og andre brukere", "Før piloten"],
        ["4. Prøve ende til ende", "TEs krav og BHs svar levert til et testprosjekt i Catenda, i testmiljøet", "Før piloten"],
        ["5. Produksjonsmiljø og produksjonsport", "Produksjonsmiljøet settes opp. ROS, personvernvurdering, gjenopprettingsøvelse, ekstern sikkerhetsvurdering, og avklart systemeier og forvaltning", "Før piloten"],
        ["6. Kontraktsteksten", "Hvordan løsningen og brevene utenfor den omtales i kontrakten for pilotprosjektene", "Før piloten"],
        ["7. Pilot: første ekte sak", "Ett eller to reelle totalentrepriseprosjekter", "Våren 2027 (foreløpig)"],
        ["8. Videre", "Endringsordre og forsering, koblinger mellom saker og rapportering til Fabric", "Etter piloten"],
    ],
    [2600, 4672, 1800],
)

overskrift("Vedlegg:")
p("Eventuelle vedlegg til saken som skisser, ROS-analyser, teknisk dokumentasjon eller annen relevant informasjon for behandling.")
tabell(
    [
        ["Vedleggs nummer", "Dokumentnavn", "Kategori"],
        ["1", "Tabellbeskrivelse (tabellbeskrivelse.xlsx)", "Teknisk dokumentasjon"],
        ["2", "Relasjoner og dataflyt mot Catenda", "Teknisk dokumentasjon"],
        ["3", "Vurdering av hvor serveren kjører", "Beslutningsgrunnlag"],
        ["4", "Spørsmål til IKT om Azure SQL og hosting, med svarene", "Avklaring med IKT"],
        ["5", "Faktagrunnlag for personvernvurdering (DPIA)", "Personvern"],
        ["6", "ROS-analyse", "[[Ikke utarbeidet]]"],
        ["7", "Detaljert design", "Teknisk dokumentasjon, kommer"],
        ["8", "Konkurransegrunnlag del II, tillegget til NS 8407 punkt 5", "Kontraktsgrunnlag"],
    ],
    [2100, 4400, 2572],
)

# ---------------------------------------------------------------- skriv

dok = (MAL / "word/document.xml").read_text(encoding="utf-8")
start = dok.index("<w:body>") + len("<w:body>")
slutt = dok.index("<w:sectPr")
dok = dok[:start] + "".join(deler) + dok[slutt:]
(MAL / "word/document.xml").write_text(dok, encoding="utf-8")

(MAL / "word/numbering.xml").write_text(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
    '<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>'
    '<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/>'
    '<w:pPr><w:ind w:left="360" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:hint="default"/></w:rPr></w:lvl>'
    '</w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>',
    encoding="utf-8",
)
rels = (MAL / "word/_rels/document.xml.rels").read_text(encoding="utf-8")
ny = (
    '<Relationship Id="rIdNummer" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>'
    '<Relationship Id="rIdBilde1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/landskap.png"/>'
    '<Relationship Id="rIdBilde2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/arkitektur.png"/>'
)
(MAL / "word/_rels/document.xml.rels").write_text(rels.replace("</Relationships>", ny + "</Relationships>"), encoding="utf-8")
ct = (MAL / "[Content_Types].xml").read_text(encoding="utf-8")
ct = ct.replace('<Default Extension="emf"', '<Default Extension="png" ContentType="image/png"/><Default Extension="emf"')
ct = ct.replace(
    "</Types>",
    '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>',
)
(MAL / "[Content_Types].xml").write_text(ct, encoding="utf-8")
for navn in ("landskap", "arkitektur"):
    shutil.copy(BILDER / f"{navn}.png", MAL / f"word/media/{navn}.png")
