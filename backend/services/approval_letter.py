"""Render a public document from frozen decisions; never serialize the private package."""

import re
from html import unescape

from models.letter_document import LetterSnapshot
from services.approval_authority import grunnlag_er_subsidiaert


def plain_text(value):
    text = re.sub(r"\{\{\w+:[^:}]+:([^}]+)\}\}", r"\1", value or "")
    text = re.sub(r"</(p|div|li|h[1-6])>", "\n\n", text, flags=re.I)
    text = re.sub(r"<br\s*/?\s*>", "\n", text, flags=re.I)
    return unescape(re.sub(r"<[^>]*>", "", text)).strip()


def number(value):
    return f"{value:,.2f}".rstrip("0").rstrip(".").replace(",", " ").replace(".", ",")


RESULTATER = {
    "godkjent": "Godkjent",
    "delvis_godkjent": "Delvis godkjent",
    "avslatt": "Avslått",
    "frafalt": "Innsigelsen er frafalt",
    "foresporsel": "Ber om spesifisert krav",
    "hold_tilbake": "Holdes tilbake (§30.2)",
}


def _subsidiaert_ved_avslatt_grunnlag(d, track):
    """Hele svaret er subsidiært. Et subsidiært standpunkt i svaret selv, for
    eksempel ved preklusjon etter § 33.4, står etter det som atter subsidiært."""
    vederlag = track == "vederlag"
    enhet = "kr" if vederlag else "dager"

    def standpunkt(prefiks, result, value):
        text = f"{prefiks} {RESULTATER.get(result, result or '').lower()}".rstrip()
        return text if value is None else f"{text}: {number(value)} {enhet}"

    parts = [
        standpunkt(
            "Subsidiært",
            d.get("beregnings_resultat"),
            (
                d["total_godkjent_belop"]
                if d.get("total_godkjent_belop") is not None
                else d.get("godkjent_belop")
            )
            if vederlag
            else d.get("godkjent_dager"),
        )
    ]
    felt = "subsidiaer_godkjent_belop" if vederlag else "subsidiaer_godkjent_dager"
    if d.get(felt) is not None:
        parts.append(
            standpunkt("Atter subsidiært", d.get("subsidiaer_resultat"), d[felt])
        )
    return parts


def decision_summary(item):
    d = item["data"]
    if item["track"] != "grunnlag" and grunnlag_er_subsidiaert(item.get("basis", {})):
        return " · ".join(
            [
                "Prinsipalt avslått (ansvarsgrunnlaget)",
                *_subsidiaert_ved_avslatt_grunnlag(d, item["track"]),
            ]
        )
    result = d.get("resultat") or d.get("beregnings_resultat", "")
    parts = [RESULTATER.get(result, result)]
    amount = d.get("total_godkjent_belop", d.get("godkjent_belop"))
    if item["track"] == "vederlag" and amount is not None:
        parts.append(f"{number(amount)} kr")
    if item["track"] == "frist" and d.get("godkjent_dager") is not None:
        parts.append(f"{number(d['godkjent_dager'])} dager")
    if d.get("subsidiaer_godkjent_belop") is not None:
        parts.append(f"Subsidiært: {number(d['subsidiaer_godkjent_belop'])} kr")
    if d.get("subsidiaer_godkjent_dager") is not None:
        parts.append(f"Subsidiært: {number(d['subsidiaer_godkjent_dager'])} dager")
    return " · ".join(p for p in parts if p)


def snapshot(letter, package_id):
    def section(title, text):
        return {"tittel": title, "originalTekst": text, "redigertTekst": text}

    names = {"grunnlag": "Ansvarsgrunnlag", "vederlag": "Økonomi", "frist": "Frist"}
    body = "\n\n".join(
        f"{names[i['track']]}\n{decision_summary(i)}\n\n{plain_text(i['data'].get('begrunnelse') or i['data'].get('beskrivelse'))}"
        + (
            "\n\nVedlegg\n" + "\n".join(v["navn"] for v in i["attachments"])
            if i.get("attachments")
            else ""
        )
        for i in letter["items"]
    )
    return LetterSnapshot.model_validate(
        {
            "tittel": letter["title"],
            "mottaker": {"navn": letter["recipient"], "rolle": "TE"},
            "avsender": {"navn": letter["sender"], "rolle": "BH"},
            "referanser": {
                "sakId": letter["caseId"],
                "sakstittel": letter["caseTitle"],
                "eventId": package_id,
                "sporType": letter["items"][0]["track"],
                "dato": letter["date"],
            },
            "seksjoner": {
                "innledning": section("Innledning", letter["introduction"]),
                "begrunnelse": section("Vurderinger", body),
                "avslutning": section("Avslutning", letter["closing"]),
            },
        }
    )


def pdf_bytes(letter):
    from services.letter_pdf_generator import BrevInnhold, get_letter_pdf_generator

    value = letter.model_dump(mode="json") if hasattr(letter, "model_dump") else letter
    refs = value["referanser"]
    content = BrevInnhold.model_validate(
        {
            "tittel": value["tittel"],
            "mottaker": value["mottaker"],
            "avsender": value["avsender"],
            "referanser": {
                "sak_id": refs["sakId"],
                "sakstittel": refs["sakstittel"],
                "event_id": refs["eventId"],
                "spor_type": refs["sporType"],
                "dato": refs["dato"],
            },
            "seksjoner": {
                key: section["redigertTekst"]
                for key, section in value["seksjoner"].items()
            },
        }
    )
    return get_letter_pdf_generator().generate_letter_pdf(content)
