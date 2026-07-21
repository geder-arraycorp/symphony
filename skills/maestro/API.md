# Maestro API Reference

Disclosed reference for [`maestro`](SKILL.md).
All routes return JSON.

## List Plans

```
GET /api/plans
```

Response:

```json
[
  {"id": "demo", "title": "Database Migration Plan", "summary": "Migrate from PostgreSQL 12 to PostgreSQL 15..."}
]
```

## Get Plan

```
GET /api/plan/{id}
```

Response is a flat JSON structure:

```json
{
  "title": "Database Migration Plan",
  "summary": "...",
  "state": "draft",
  "messages": [],
  "modules": [
    {
      "type": "criteria",
      "heading": "Acceptance Criteria",
      "items": [
        {"text": "All existing data is preserved after migration"}
      ]
    }
  ]
}
```

## Add a Message

```
POST /api/plan/{id}/messages
Content-Type: application/json

{"role": "human", "text": "Your feedback", "item_ref": "2:1"}
```

- `role`: `"agent"` or `"human"`
- `text`: message body (required)
- `item_ref`: optional positional reference `"moduleIndex:itemIndex"` (e.g. `"2:1"` = module 2, item 1)

Returns the created message:

```json
{
  "id": "msg_18bfc3e196bafae0",
  "role": "human",
  "text": "Your feedback",
  "item_ref": "2:1",
  "created_at": "2026-07-06T17:35:51Z"
}
```

The message is appended to the plan's conversation thread and the plan is persisted.

## Set Plan State

```
POST /api/plan/{id}/state
Content-Type: application/json

{"state": "approved"}
```

Valid states: `"draft"`, `"approved"`.
Returns the full updated flat JSON plan.

## Set Agent Status

```
POST /api/agent/{id}/status
Content-Type: application/json

{"status": "offline"}
```

Used to set the agent dot to `offline` explicitly (e.g. when the plan is approved).
The `listening` and `thinking` states are driven automatically by the server based on message roles — see the feedback loop in [`SKILL.md`](SKILL.md).

## Reload Plans (Admin)

Trigger an immediate full directory rescan.
Useful when plans are modified externally and you don't want to wait for the next poll cycle.

```
POST /api/admin/reload
```

Response:

```json
{"status": "ok"}
```

## WebSocket (Live Updates)

```
ws://host/ws/plan/{id}
```

When the plan file is modified, the server sends the full flat JSON plan over the WebSocket.
The client can then reload or patch the view.

## Web UI Routes

| Route | Description |
|---|---|
| `/` | Redirects to `/plans` |
| `/plans` | Plan listing page |
| `/plan/{id}` | Plan detail page with modules, sidebar, messages |
| `POST /api/admin/reload` | Trigger full directory rescan (JSON) |
