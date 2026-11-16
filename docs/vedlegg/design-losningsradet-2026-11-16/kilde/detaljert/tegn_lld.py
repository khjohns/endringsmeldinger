"""Skissene til detaljert design. Bruk: tegn_lld.py <utmappe>."""
import html
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from tegning import BLAA, BLAA_LYS, GRAA, GRAA_LYS, GROENN, GROENN_LYS, ORANSJE, ORANSJE_LYS, Tegning  # noqa: E402

UT = Path(sys.argv[1])


def arkitektur():
    t = Tegning(1560, 1180)
    t.boks(80, 20, 360, 80, "Nettleser: TE og BH", ["Innlogging med Catenda (OAuth 2)"], fyll=ORANSJE_LYS, strek=ORANSJE, liten=True)
    t.boks(480, 20, 360, 80, "Nettleser: godkjenner i Oslobygg", ["Innlogging med Entra ID (OIDC, PKCE)"], fyll=GROENN_LYS, strek=GROENN, liten=True)

    t.ramme(30, 135, 1040, 900, "Azure – eget abonnement for løsningen", strek=BLAA, nede=True)
    t.ramme(50, 160, 1000, 455, "App Service (Web App for Containers), Always On", strek=GRAA, nede=True)
    t.boks(70, 200, 290, 215, "Ruter – nginx, port 8080", [
        "/  → statiske filer (SPA)",
        "/api/*  → TS-server",
        "/webhook/catenda/*  → TS-server",
        "/health  → 200",
        "Tilgangslogg uten spørrestreng",
        "Største kropp 16 MB",
    ], fyll="#fff", strek=GRAA, liten=True)
    t.ramme(390, 185, 640, 400, "TS-server – Node.js 22, port 8090", strek=BLAA)
    t.boks(405, 225, 300, 115, "Ruter og tilgangsregister", ["34 innganger, hver med krav", "Sesjon og CSRF → prosjekt →", "kontraktsrolle"], fyll=BLAA_LYS, strek=BLAA, liten=True)
    t.boks(715, 225, 300, 115, "Innganger", ["Saker og kommandoer, saksliste,", "prosjekter, vedlegg, brev-PDF,", "godkjenning, innlogging, webhook"], fyll=BLAA_LYS, strek=BLAA, liten=True)
    t.boks(405, 350, 300, 115, "Domenekjernen (kjerne/)", ["Regler etter NS 8407", "Utledning og brevtekst", "Regelversjon i hver hendelse"], fyll=BLAA_LYS, strek=BLAA, liten=True)
    t.boks(715, 350, 300, 115, "Datalag", ["Én transaksjon per kommando", "Kontekst i SESSION_CONTEXT", "mssql-pool, kryptert"], fyll=BLAA_LYS, strek=BLAA, liten=True)
    t.boks(405, 475, 610, 95, "Jobbkjører (i samme prosess, poller hvert 10. sekund)", ["Topic for ny sak · levering av brev og vedlegg · innboksen fra webhooken", "HR-synk fra Graph hver time · lease 120 s · nye forsøk 30 s, 60 s … maks 1 time"], fyll=BLAA_LYS, strek=BLAA, liten=True)

    t.ramme(50, 650, 1000, 300, "Azure SQL Database (serverløs), sortering Latin1_General_100_BIN2_UTF8", strek=BLAA)
    t.boks(70, 690, 310, 120, "koe", ["42 tabeller", "Radsikkerhet (én policy)", "20 triggere mot endring"], fyll=BLAA_LYS, strek=BLAA, liten=True)
    t.boks(395, 690, 310, 120, "koe_api", ["70 prosedyrer", "Kjøretidens eneste", "skrivevei"], fyll=BLAA_LYS, strek=BLAA, liten=True)
    t.boks(720, 690, 310, 120, "koe_drift", ["16 prosedyrer", "Bare driftsrollen", "Registrering av prosjekter"], fyll=BLAA_LYS, strek=BLAA, liten=True)
    t.boks(70, 820, 310, 110, "koe_sikkerhet", ["24 predikatfunksjoner", "for radsikkerheten"], fyll=BLAA_LYS, strek=BLAA, liten=True)
    t.boks(395, 820, 310, 110, "koe_migrering", ["Historikken: versjon og", "sha256 per migrasjonsfil"], fyll=BLAA_LYS, strek=BLAA, liten=True)
    t.boks(720, 820, 310, 110, "Identiteter i basen", ["koe_runtime: appens identitet", "koe_driftsrolle: driftsskript", "dbo: migreringen"], fyll="#fff", strek=BLAA, liten=True)

    t.boks(1110, 160, 420, 250, "Catenda (api.catenda.com)", [
        "POST /oauth2/token",
        "GET /v2/user, /v2/projects",
        "GET /v2/projects/{id}/members, /teams",
        "BCF 3.0: topics, kommentarer,",
        "dokumentreferanser",
        "POST /v2/projects/{id}/libraries/…/items",
        "Webhook: topic opprettet eller endret",
    ], fyll=ORANSJE_LYS, strek=ORANSJE, liten=True)
    t.boks(1110, 450, 420, 120, "Microsoft Entra ID", ["/oauth2/v2.0/authorize og /token", "/discovery/v2.0/keys (JWKS)"], fyll=GROENN_LYS, strek=GROENN, liten=True)
    t.boks(1110, 600, 420, 110, "Microsoft Graph", ["GET /v1.0/users?$filter=jobTitle", "med leder (client credentials)"], fyll=GROENN_LYS, strek=GROENN, liten=True)
    t.boks(1110, 740, 420, 90, "Azure Key Vault", ["Hemmeligheter (avklares)"], fyll="#fff", strek=GRAA, stiplet=True, liten=True)
    t.boks(1110, 860, 420, 90, "Microsoft Fabric", ["Speiling av basen (planlagt)"], fyll="#fff", strek=GRAA, stiplet=True, liten=True)

    t.boks(50, 1075, 480, 85, "GitHub Actions", ["Tester, typesjekk, vakter og utrulling", "Migrering som dbo før serveren starter"], fyll=GRAA_LYS, strek=GRAA, liten=True)
    t.boks(570, 1075, 480, 85, "Driftsskript", ["node server/registrering.ts", "Prosjekter, kontraktsteam, frister"], fyll=GRAA_LYS, strek=GRAA, liten=True)

    t.pil([(260, 100), (215, 200)], "HTTPS", 236, 150)
    t.pil([(660, 100), (300, 200)], "HTTPS", 470, 130)
    t.pil([(360, 300), (405, 300)])
    t.pil([(860, 585), (860, 690)], "TDS, managed identity", 960, 640, begge=True)
    t.pil([(1030, 260), (1110, 260)])
    t.pil([(1110, 370), (1030, 370)], None)
    t.pil([(1030, 520), (1110, 510)])
    t.pil([(1030, 545), (1110, 650)])
    t.pil([(1050, 790), (1110, 790)], None, stiplet=True)
    t.pil([(1050, 905), (1110, 905)], None, stiplet=True)
    t.pil([(470, 1075), (470, 950)], "Migrasjoner", 545, 1062, stiplet=True)
    t.pil([(810, 1075), (810, 950)], "koe_drift", 810, 1015, stiplet=True)
    t.etiketter.append('<text x="1070" y="250" font-size="12" text-anchor="middle" fill="#333">REST</text>')
    t.etiketter.append('<text x="1070" y="390" font-size="12" text-anchor="middle" fill="#333">Webhook</text>')
    return t.svg()


def sekvens(deltakere, meldinger, bredde=1500, tittel=None):
    """meldinger: (fra, til, tekst, stiplet) eller ('notat', deltaker, tekst) eller ('skille', tekst)."""
    rad = 54
    topp = 40 if tittel is None else 70
    h = topp + 70 + rad * len(meldinger) + 40
    t = Tegning(bredde, h)
    steg = (bredde - 300) / (len(deltakere) - 1) if len(deltakere) > 1 else 0
    x = {d: 150 + i * steg for i, d in enumerate(deltakere)}
    if tittel:
        t.deler.append(f'<text x="20" y="34" font-size="20" font-weight="700" fill="#111">{html.escape(tittel)}</text>')
    for d in deltakere:
        cx = x[d]
        t.deler.append(f'<line x1="{cx}" y1="{topp + 50}" x2="{cx}" y2="{h - 20}" stroke="#9aa0ab" stroke-width="1.4" stroke-dasharray="5 5"/>')
        t.deler.append(f'<rect x="{cx - 105}" y="{topp}" width="210" height="50" rx="8" fill="{BLAA_LYS}" stroke="{BLAA}" stroke-width="1.6"/>')
        t.deler.append(f'<text x="{cx}" y="{topp + 31}" font-size="15" font-weight="700" text-anchor="middle" fill="#111">{html.escape(d)}</text>')
    y = topp + 50 + 40
    i = 0
    for m in meldinger:
        if m[0] != "skille":
            i += 1
        if m[0] == "notat":
            _, d, tekst = m
            b = len(tekst) * 7.2 + 34
            cx = min(max(x[d], 20 + b / 2), bredde - 20 - b / 2)
            t.deler.append(f'<rect x="{cx - b / 2}" y="{y - 22}" width="{b}" height="32" rx="5" fill="#fff8d6" stroke="#b59a2a" stroke-width="1.2"/>')
            t.deler.append(f'<text x="{cx}" y="{y - 1}" font-size="13" text-anchor="middle" fill="#222">{i}. {html.escape(tekst)}</text>')
        elif m[0] == "skille":
            t.deler.append(f'<line x1="20" y1="{y - 6}" x2="{bredde - 20}" y2="{y - 6}" stroke="{GRAA}" stroke-width="1" stroke-dasharray="2 4"/>')
            t.deler.append(f'<rect x="{bredde / 2 - len(m[1]) * 3.8 - 12}" y="{y - 20}" width="{len(m[1]) * 7.6 + 24}" height="26" fill="#fff"/>')
            t.deler.append(f'<text x="{bredde / 2}" y="{y - 2}" font-size="13" font-style="italic" text-anchor="middle" fill="{GRAA}">{html.escape(m[1])}</text>')
        else:
            fra, til, tekst, stiplet = m
            x1, x2 = x[fra], x[til]
            retning = 1 if x2 > x1 else -1
            t.pil([(x1, y), (x2 - retning * 2, y)], None, stiplet=stiplet)
            midt = (x1 + x2) / 2
            b = len(tekst) * 7.0 + 16
            t.etiketter.append(f'<rect x="{midt - b / 2}" y="{y - 22}" width="{b}" height="18" fill="#fff" fill-opacity="0.95"/>')
            t.etiketter.append(f'<text x="{midt}" y="{y - 8}" font-size="13" text-anchor="middle" fill="#222">{i}. {html.escape(tekst)}</text>')
        y += rad
    return t.svg()


def innlogging():
    D = ["Nettleser", "TS-server", "Azure SQL", "Catenda"]
    M = [
        ("Nettleser", "TS-server", "GET /api/auth/catenda/login", False),
        ("TS-server", "Azure SQL", "Lagre forsøket: hash av state og nettlesertoken, 10 min", False),
        ("TS-server", "Nettleser", "302 til Catenda + kapsel for forsøket", True),
        ("Nettleser", "Catenda", "Brukeren logger inn i Catenda", False),
        ("Catenda", "Nettleser", "302 til /api/auth/catenda/callback med kode og state", True),
        ("Nettleser", "TS-server", "GET callback (kode, state, kapsel)", False),
        ("TS-server", "Azure SQL", "Bruk forsøket én gang: state og kapsel må stemme", False),
        ("TS-server", "Catenda", "POST /oauth2/token: kode mot brukerens token", False),
        ("TS-server", "Catenda", "GET /v2/user og /v2/projects", False),
        ("TS-server", "Azure SQL", "koe_api.catenda_identitet: én bruker per identitet", False),
        ("TS-server", "Catenda", "Medlemmer i prosjektene som er koblet til løsningen", False),
        ("TS-server", "Azure SQL", "Synkroniser medlemskapet, deaktiver fjernede", False),
        ("TS-server", "Azure SQL", "Opprett sesjon: hash av token, 8 timer", False),
        ("TS-server", "Nettleser", "302 til appen + __Host-koe_session (HttpOnly, Secure, SameSite=Lax)", True),
        ("notat", "TS-server", "Brukerens token lagres ikke; det brukes bare i forespørselen"),
    ]
    return sekvens(D, M, tittel="Innlogging med Catenda")


def krav():
    D = ["Nettleser (TE)", "TS-server", "Azure SQL", "Jobbkjører", "Catenda"]
    M = [
        ("notat", "Nettleser (TE)", "Kjernen i nettleseren lager kravet og brevutkastet"),
        ("Nettleser (TE)", "TS-server", "POST /api/kjerne/saker/{sak}/kommandoer", False),
        ("notat", "TS-server", "Sesjon, CSRF, X-Project-ID, kontraktsrolle"),
        ("TS-server", "Azure SQL", "Start transaksjon, sett konteksten, lås saken, les journalen", False),
        ("notat", "TS-server", "Kjernen prøver kommandoen mot journalen og regelversjonen"),
        ("TS-server", "Azure SQL", "Hendelse + frosset leveringsoppdrag + jobb, så COMMIT", False),
        ("TS-server", "Nettleser (TE)", "201 med saken slik den vises (409 ved versjonskonflikt)", True),
        ("skille", "Etter commit, uavhengig av forespørselen"),
        ("Jobbkjører", "Azure SQL", "koe_api.hent_jobb: neste jobb med lease på 120 s", False),
        ("Jobbkjører", "Catenda", "Last opp brev-PDF og vedlegg til dokumentbiblioteket", False),
        ("Jobbkjører", "Catenda", "Dokumentreferanse på topicen", False),
        ("Jobbkjører", "Azure SQL", "Kvittering, eller nytt forsøk om 30 s, 60 s … maks 1 time", False),
    ]
    return sekvens(D, M, tittel="TE sender et krav, og brevet leveres til Catenda")


def webhook():
    D = ["Catenda", "Ruter (nginx)", "TS-server", "Azure SQL"]
    M = [
        ("Catenda", "Ruter (nginx)", "POST /webhook/catenda/{hemmelighet}", False),
        ("Ruter (nginx)", "TS-server", "Videre, uten tilgangslogg", False),
        ("notat", "TS-server", "Hemmeligheten sammenlignes i konstant tid, høyst 256 kB"),
        ("TS-server", "Azure SQL", "Lagre i koe.innkommende_hendelse (samme id én gang)", False),
        ("TS-server", "Catenda", "200", True),
        ("skille", "Jobbkjøreren, etter jobbene"),
        ("TS-server", "Azure SQL", "Neste hendelse uten utfall", False),
        ("TS-server", "Catenda", "Hent topicen, forfatteren og medlemmene", False),
        ("notat", "TS-server", "Bare en topic laget av TE gir en sak"),
        ("TS-server", "Azure SQL", "Opprett saken og lagre utfallet", False),
        ("TS-server", "Catenda", "Kommentar på topicen med lenke til saken", False),
    ]
    return sekvens(D, M, tittel="Webhook: en ny topic i Catenda blir en sak")


for navn, svg in [("lld-arkitektur", arkitektur()), ("sek-innlogging", innlogging()), ("sek-krav", krav()), ("sek-webhook", webhook())]:
    (UT / f"{navn}.svg").write_text(svg, encoding="utf-8")
