# Captured `issue.created` contract

Captured from a manual `TEST-20260902-WEBHOOK-01` topic on 2026-09-02 and
anonymised before storage. The payload fixture contains no production IDs,
personal data, tokens, secrets, or magic links.

| Contract field | Observed location | Current webhook handling |
| --- | --- | --- |
| Event ID | `event.id` | Used by `get_webhook_event_id()` for idempotency. |
| Event type | `event.type` | `issue.created`; accepted by the structure validator and dispatched. |
| Topic ID | `issue.id` | Read by `handle_new_topic_created()`, then normalised to dashed GUID. |
| Topic board | `issue.boardId` | Read as fallback when top-level `project_id` is absent. |
| Physical Catenda project | `project.id` | Present in payload, but not read directly; the service derives it from the board's `bimsync_project_id`. |

The observed top-level keys are `createdBy`, `event`, `issue`, and `project`.
The payload does not include the code's preferred top-level `project_id` field.
