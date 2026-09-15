"""Innholdskontroll av vedlegg.

Dette er **ikke** virusskanning. Ekte skanning krever en ekstern tjeneste
(ClamAV-daemon eller et skanne-API), og en attrapp ville gitt falsk trygghet.
Det som gjøres her er avgrenset og etterprøvbart:

1. Innhold som er et kjørbart program avvises uansett filnavn.
2. Lover filnavnet et kjent format, må innholdet stemme med det.

Det dekker den realistiske vektoren mellom to parter i en tvist: en fil som
utgir seg for å være dokumentasjon. Ukjente, ikke-kjørbare formater slippes
gjennom — byggfag har mange legitime filtyper (IFC, DWG, fremdriftsformater),
og en uttømmende hviteliste ville blokkert reelle bevis.
"""

# Kjørbart innhold. Filendelsen er irrelevant; dette avvises alltid.
KJORBARE_SIGNATURER: tuple[tuple[bytes, str], ...] = (
    (b"MZ", "Windows-kjørbar"),
    (b"\x7fELF", "Linux-kjørbar"),
    (b"\xfe\xed\xfa\xce", "macOS-kjørbar"),
    (b"\xfe\xed\xfa\xcf", "macOS-kjørbar"),
    (b"\xcf\xfa\xed\xfe", "macOS-kjørbar"),
    (b"\xca\xfe\xba\xbe", "Java-klasse eller macOS-kjørbar"),
    (b"#!", "skript"),
)

# Format vi kan gjenkjenne. Andre endelser kontrolleres ikke mot innhold.
FORMATSIGNATURER: dict[str, tuple[bytes, ...]] = {
    "pdf": (b"%PDF-",),
    "png": (b"\x89PNG\r\n\x1a\n",),
    "jpg": (b"\xff\xd8\xff",),
    "jpeg": (b"\xff\xd8\xff",),
    "gif": (b"GIF87a", b"GIF89a"),
    # Office-formater og andre zip-baserte containere.
    "docx": (b"PK\x03\x04",),
    "xlsx": (b"PK\x03\x04",),
    "pptx": (b"PK\x03\x04",),
    "zip": (b"PK\x03\x04",),
}


class UgyldigVedlegg(ValueError):
    """Innholdet kan ikke lagres som vedlegg."""


def kontroller_innhold(navn: str, innhold: bytes) -> None:
    """Avvis kjørbart innhold og filnavn som ikke stemmer med innholdet.

    Args:
        navn: Filnavnet, allerede sanert av kallstedet.
        innhold: Filens bytes.

    Raises:
        UgyldigVedlegg: Med en melding som kan vises til brukeren.
    """
    start = innhold[:8]

    for signatur, beskrivelse in KJORBARE_SIGNATURER:
        if start.startswith(signatur):
            raise UgyldigVedlegg(
                f"Filen ser ut til å være et program ({beskrivelse}) "
                "og kan ikke lastes opp som vedlegg."
            )

    _, _, endelse = navn.rpartition(".")
    forventede = FORMATSIGNATURER.get(endelse.lower())
    if not forventede:
        # Ukjent endelse: vi har ingen forventning å måle innholdet mot.
        return

    if not any(start.startswith(signatur) for signatur in forventede):
        raise UgyldigVedlegg(
            f"Innholdet stemmer ikke med filtypen .{endelse.lower()}. "
            "Last opp filen i det formatet navnet oppgir."
        )
