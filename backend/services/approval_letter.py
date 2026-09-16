"""Render a public document from frozen decisions; never serialize the private package."""

import re
from html import unescape

from models.letter_document import LetterSnapshot


def plain_text(value):
    text = re.sub(r"\{\{\w+:[^:}]+:([^}]+)\}\}", r"\1", value or "")
    text = re.sub(r"</(p|div|li|h[1-6])>", "\n\n", text, flags=re.I)
    text = re.sub(r"<br\s*/?\s*>", "\n", text, flags=re.I)
    return unescape(re.sub(r"<[^>]*>", "", text)).strip()


def number(value):
    return f"{value:,.2f}".rstrip("0").rstrip(".").replace(",", " ").replace(".", ",")


def decision_summary(item):
    d = item["data"]
    basis = item.get("basis", {})
    rejected = item["track"] != "grunnlag" and (
        basis.get("resultat") == "avslatt"
        or (
            basis.get("hovedkategori") == "ENDRING"
            and basis.get("varsletITide") is False
        )
    )
    result = d.get("resultat") or d.get("beregnings_resultat", "")
    parts = [
        {
            "godkjent": "Godkjent",
            "delvis_godkjent": "Delvis godkjent",
            "avslatt": "Avslått",
            "frafalt": "Innsigelsen er frafalt",
            "foresporsel": "Ber om spesifisert krav",
        }.get(result, result)
    ]
    if rejected:
        parts = ["Prinsipalt avslått"]
    amount = d.get("total_godkjent_belop", d.get("godkjent_belop"))
    if item["track"] == "vederlag" and amount is not None:
        parts.append(f"{number(0 if rejected else amount)} kr")
    if item["track"] == "frist" and d.get("godkjent_dager") is not None:
        parts.append(f"{number(0 if rejected else d['godkjent_dager'])} dager")
    if (
        rejected
        and item["track"] == "vederlag"
        and d.get("subsidiaer_godkjent_belop") is None
        and amount is not None
    ):
        parts.append(f"Subsidiært: {number(amount)} kr")
    if (
        rejected
        and item["track"] == "frist"
        and d.get("subsidiaer_godkjent_dager") is None
        and d.get("godkjent_dager") is not None
    ):
        parts.append(f"Subsidiært: {number(d['godkjent_dager'])} dager")
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
