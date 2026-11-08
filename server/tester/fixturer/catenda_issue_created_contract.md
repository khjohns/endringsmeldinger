# Opptatt `issue.created` fra Catenda

Opptatt fra et manuelt testemne, `TEST-20260902-WEBHOOK-01`, 02.09.2026, og
anonymisert før lagring. Fixturen har ingen produksjons-ID-er, personopplysninger,
tokener, hemmeligheter eller magiske lenker.

| Felt i kallet           | Hvor det står   |
| ----------------------- | --------------- |
| Hendelses-ID            | `event.id`      |
| Hendelsestype           | `event.type`    |
| Emne-ID                 | `issue.id`      |
| Emnetavle               | `issue.boardId` |
| Fysisk Catenda-prosjekt | `project.id`    |

Nøklene på øverste nivå er `createdBy`, `event`, `issue` og `project`. Kallet har
ikke feltet `project_id` på øverste nivå. Hvordan mottakeren leser feltene, står i
[`server/webhook.ts`](../../webhook.ts) og [`webhook.test.ts`](../webhook.test.ts).
