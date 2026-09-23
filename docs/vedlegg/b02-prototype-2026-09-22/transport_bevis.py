"""RB2-01: samme signeringsnøkkel, men service_role avvises før Data API-kallet."""

import os
import time

import jwt
import requests

for rolle, forventet in (("koe_runtime", 200), ("service_role", 403)):
    krav = {"role": rolle, "exp": int(time.time()) + 60,
            "koe_aktor": "00000000-0000-4000-8000-0000000000a1",
            "koe_prosjekt": "prosjekt-a", "koe_side": "BH", "koe_team": "team-bh-a"}
    token = jwt.encode(krav, os.environ["B02_JWT_SECRET"], algorithm="HS256")
    svar = requests.get(os.environ["B02_POSTGREST"] + "/notat?select=notat_id",
                        headers={"Authorization": "Bearer " + token}, timeout=10)
    print(rolle, svar.status_code, svar.text, flush=True)
    assert svar.status_code == forventet
    if rolle == "koe_runtime":
        assert svar.json() == [{"notat_id": "e0000000-0000-4000-8000-0000000000a1"}]
    else:
        assert svar.json()["code"] == "42501"
        assert "forespørselsvakt" in svar.json()["message"]
