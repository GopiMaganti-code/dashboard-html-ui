# Backend API Requirements
## LinkedIn Campaign Automation Monitoring System

## 1) Application Overview

This application is a **LinkedIn Campaign Automation Monitoring System**.

It tracks:

- Campaign setup and campaign-level status
- Activity execution (connections, profile views, posts liked, messages)
- Failures with logs and screenshots
- Reply visibility and conversation monitoring
- Acceptance Run Tracking
- Messages Run Tracking
- Recent Runs execution history

Primary product goal:

- Show what actions were performed
- Show what succeeded and failed
- Highlight what needs attention next

The frontend is already modularized and expects stable API contracts with low endpoint count and predictable payloads.

---

## 2) Core Features

### Existing Features
- Campaign management (list/filter/search/select active campaign)
- Dashboard (summary stats + activity chart + failed actions summary)
- Failed actions details (logs + screenshot)
- Detail drill-down by metric
- Messaging (conversation list, thread, send message)

### New Features
- Acceptance Run Tracking (trigger + status + accepted profiles + reference node)
- Messages Run Tracking (trigger + status + replies summary)
- Recent Runs system (cross-run execution history in dashboard)

---

## 3) API Summary

| API | Method | Description |
|---|---|---|
| `/api/v1/campaigns` | GET | List campaigns for setup and campaign selection |
| `/api/v1/overview` | GET | Dashboard payload: stats + chart + recent runs + failed action summary |
| `/api/v1/failed-actions/{id}` | GET | Fetch failed action details (logs/screenshot) |
| `/api/v1/details/{metric_key}` | GET | Metric-specific detail table payload |
| `/api/v1/conversations` | GET | Conversation list + thread data |
| `/api/v1/conversations/{id}/messages` | POST | Send message in a conversation |
| `/api/v1/acceptance-run` | POST | Trigger acceptance run job |
| `/api/v1/acceptance-run/{campaign_id}` | GET | Get latest acceptance run status for campaign |
| `/api/v1/messages-run` | POST | Trigger messages run job |
| `/api/v1/messages-run/{campaign_id}` | GET | Get latest messages run status for campaign |
| `/api/v1/runs` | GET | Run history for dashboard recent runs |
| `/api/v1/health` | GET | Service health/readiness check |

---

## 3.1 Global API Conventions

- Base path: `/api/v1`
- Content type: `application/json; charset=utf-8`
- Time format: ISO-8601 UTC (e.g., `2026-06-04T18:50:00Z`)
- ID format:
  - `campaign_id`: stable unique campaign identifier
  - `run_id`: stable unique run identifier
  - `conversation_id`, `message_id`, `failed_action_id`: stable unique identifiers
- Naming convention: `snake_case` for all request/response JSON keys
- Correlation: support `X-Correlation-Id` request header; return same value in response headers/errors

---

## 3.2 Authentication & Authorization

- Authentication: JWT bearer token (recommended for API-first architecture)
- Header:
  - `Authorization: Bearer <access_token>`
- Token claims should include:
  - `sub` (user id)
  - `org_id` (tenant/organization id)
  - `roles` (role list)
  - `env_scope` (allowed environments)
- Authorization model:
  - Enforce campaign-level access checks using `org_id` + `campaign_id`
  - Reject cross-org or unauthorized campaign access with `403`
  - Restrict run-trigger endpoints to allowed roles (e.g., `operator`, `admin`)

---

## 3.3 API Contract Standard

- All APIs must be defined in **OpenAPI 3.1**.
- Swagger UI must be generated from the same source contract.
- Backend must validate request and response payloads against OpenAPI schemas.
- API documentation artifacts must be versioned and shareable (e.g., published per release).
- Contract-first change policy:
  - Update OpenAPI spec first
  - Review and approve schema diff
  - Implement code changes after contract approval

---

## 3.4 Pagination Standard

Applicable endpoints:

- `GET /api/v1/campaigns`
- `GET /api/v1/details/{metric_key}`
- `GET /api/v1/conversations`
- `GET /api/v1/runs`

Query params:

- `limit` (optional, default `50`, max `200`)
- `offset` (optional, default `0`)

Standard paginated response:

```json
{
  "items": [],
  "total": 0,
  "limit": 50,
  "offset": 0
}
```

---

## 3.5 Sorting & Filtering Standard

Supported query params (where applicable):

- `sort_by` (optional)
- `sort_order` (optional): `asc | desc`

Example:

`?sort_by=created_at&sort_order=desc`

Notes:

- If `sort_by` is omitted, endpoint-defined default sort applies.
- If `sort_order` is omitted, default is `desc` for time-based fields.
- Unknown `sort_by` values must return `400` with a validation error.

---

## 3.6 API Versioning

- Current stable version: `/api/v1`
- Breaking changes must be released under a new version path (e.g., `/api/v2`)
- Backward compatibility window must be maintained for a defined deprecation period
- Deprecation policy must include:
  - deprecation announcement date
  - sunset date
  - migration guidance
  - changelog link

---

## 3.7 Frontend Expectations (Filter + Premium)

Frontend contract expectations for the campaign inbox and header identity are strict:

- Inbox filter keys must use normalized values only:
  - `sent`
  - `replied`
  - `no_reply`
  - `queued`
- Frontend chip labels are display-only (`Sent`, `Replied`, `No reply`, `Queued`) and must not be used as data keys.
- Backend must keep summary counts and row-level status data consistent for `messages-sent`.
- Premium status is a UI display feature (non-blocking); missing premium metadata must not break dashboard rendering.

---

## 4) Detailed API Specifications

### 4.1 Campaigns
`GET /api/v1/campaigns`

#### Query Params
- `status` (optional): `Active | Inactive | Stopped`
- `search` (optional): string across id/name/email/environment
- `limit` (optional, default 50)
- `offset` (optional, default 0)

#### Response
```json
{
  "items": [
    {
      "campaign_id": "CMP-001",
      "campaign_name": "Q2 outbound — seed",
      "ai_sdr_email": "test@example.com",
      "ai_sdr": {
        "email": "test@example.com",
        "is_premium": true,
        "premium_plan": "Sales Navigator"
      },
      "environment": "QA",
      "status": "Active",
      "created_at": "2026-04-06T18:00:00Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

---

### 4.2 Overview (Dashboard)
`GET /api/v1/overview`

Must include: **stats + chart + recent runs + failed actions summary**

#### Query Params
- `campaign_id` (**required** for campaign-scoped dashboards)
- `from` (optional ISO datetime)
- `to` (optional ISO datetime)

#### Response
```json
{
  "ai_sdr": {
    "email": "test@example.com",
    "is_premium": true,
    "premium_plan": "Sales Navigator"
  },
  "stats": [
    {
      "key": "recent-runs",
      "label": "Recent runs",
      "value": 10,
      "sub": "10 actions in the last 24 hours"
    },
    {
      "key": "connections-sent",
      "label": "Connections sent",
      "value": 12,
      "sub": "3 pending"
    },
    {
      "key": "profile-views",
      "label": "Profile views",
      "value": 8,
      "sub": "steady"
    },
    {
      "key": "posts-liked",
      "label": "Posts liked",
      "value": 15,
      "sub": "most active"
    },
    {
      "key": "messages-sent",
      "label": "Messages sent",
      "value": 4,
      "sub": "2 replied"
    },
    {
      "key": "accepted-profiles",
      "label": "Accepted profiles",
      "value": 3,
      "sub": "23% rate"
    }
  ],
  "chart": {
    "labels": ["Apr 1", "Apr 2", "Apr 3", "Apr 4", "Apr 5", "Apr 6"],
    "datasets": [
      { "label": "Connections", "data": [2, 3, 1, 4, 1, 1] },
      { "label": "Profile Views", "data": [1, 2, 1, 1, 2, 1] },
      { "label": "Posts Liked", "data": [3, 2, 2, 3, 3, 2] },
      { "label": "Messages", "data": [0, 1, 0, 1, 1, 1] },
      { "label": "Accepted", "data": [0, 0, 1, 0, 1, 1] }
    ]
  },
  "recent_runs_summary": [
    {
      "run_id": "run_abc123",
      "lead": "angela-game-257",
      "action": "Like post",
      "status": "queued",
      "time": "6:22 PM"
    }
  ],
  "failed_actions_summary": [
    {
      "id": "fa_001",
      "campaign_id": "CMP-001",
      "lead": "angela-game-257158301",
      "reason": "Connection limit reached",
      "timestamp": "2026-06-04T18:22:00Z",
      "has_logs": true,
      "has_screenshot": true
    }
  ]
}
```

`ai_sdr` is the preferred source for dashboard header rendering.

`premium_plan` examples:
- `"Sales Navigator"`
- `"Premium Career"`
- `null`

---

### 4.3 Failed Action Details
`GET /api/v1/failed-actions/{id}`

#### Path Params
- `id`: failed action identifier

#### Response
```json
{
  "id": "fa_001",
  "campaign_id": "CMP-001",
  "lead": "angela-game-257158301",
  "reason": "Connection limit reached",
  "step": "connection_run",
  "timestamp": "2026-06-04T18:22:00Z",
  "logs": "[2026-06-04T12:52:07.771Z] ERROR action blocked: CONNECTION_LIMIT_REACHED",
  "screenshot_url": "https://cdn.example.com/fa_001.png"
}
```

---

### 4.4 Detail Data
`GET /api/v1/details/{metric_key}`

#### Path Params
- `metric_key`: one of
  - `recent-runs`
  - `connections-sent`
  - `profile-views`
  - `posts-liked`
  - `messages-sent`
  - `accepted-profiles`

#### Query Params
- `campaign_id` (**required**)
- `filter` (optional; frontend supports metric-specific filter values)
- `limit` / `offset` (optional)

#### Status Normalization Contract (Required for inbox filtering)

For `metric_key=messages-sent`:

- `rows[].status` must be one of: `sent | replied | no_reply | queued`
- Values must be lowercase and use underscores (no spaces)
- Backend must normalize internal/raw statuses before response

Required mapping responsibility:

- `queued` <- `queued | pending | invited | waiting | invitation_sent | sent_pending`
- `no_reply` <- `no reply | noresponse | no_response`

Unknown values must be normalized to a valid enum or rejected as a validation error.

#### Response
```json
{
  "key": "connections-sent",
  "title": "Connections sent",
  "sub": "12 sent, 3 accepted",
  "summary": [
    { "label": "Sent", "val": 12 },
    { "label": "Accepted", "val": 3 },
    { "label": "Pending", "val": 9 }
  ],
  "filters": ["All", "Pending", "Accepted", "Withdrawn"],
  "columns": ["Lead", "Profile URL", "Sent at", "Status"],
  "rows": [
    {
      "name": "Angela Okhib",
      "initials": "AO",
      "color": "#EEEDFE",
      "text_color": "#534AB7",
      "url": "linkedin.com/in/angela-okhib",
      "action": "",
      "status": "pending",
      "time": "2026-04-01T22:53:00Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

For `metric_key=messages-sent`, response must include:

- `summary` in this exact display order:
  1. `{ "label": "Sent", "val": number }`
  2. `{ "label": "Replied", "val": number }`
  3. `{ "label": "No reply", "val": number }`
  4. `{ "label": "Queued", "val": number }`
- `rows[].status` normalized to `sent|replied|no_reply|queued`

---

### 4.5 Conversations
`GET /api/v1/conversations`

#### Query Params
- `campaign_id` (**required**)
- `limit` / `offset` (optional)

#### Response
```json
{
  "items": [
    {
      "conversation_id": "c2",
      "campaign_id": "CMP-001",
      "name": "Jose Luis Toma",
      "initials": "JL",
      "color": "#EAF3DE",
      "text_color": "#3B6D11",
      "preview": "Perfect, talk next week.",
      "time": "5:29 PM",
      "status": "replied",
      "online": false,
      "last_seen": "Active 3h ago",
      "messages": [
        { "id": "m1", "dir": "sent", "text": "Quick follow-up...", "time": "5:12 PM" },
        { "id": "m2", "dir": "recv", "text": "Yes, we can schedule...", "time": "5:20 PM" }
      ]
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

`items[].status` is required for inbox filtering and must be normalized to:

- `sent`
- `replied`
- `no_reply`
- `queued`

---

### 4.6 Send Message
`POST /api/v1/conversations/{id}/messages`

#### Path Params
- `id`: conversation id

#### Request
```json
{
  "campaign_id": "CMP-001",
  "text": "Hello, wanted to follow up on this thread."
}
```

#### Response
```json
{
  "conversation_id": "c2",
  "message": {
    "id": "m99",
    "dir": "sent",
    "text": "Hello, wanted to follow up on this thread.",
    "time": "6:42 PM"
  },
  "preview": "Hello, wanted to follow up on this thread.",
  "updated_at": "2026-06-04T18:42:00Z"
}
```

---

### 4.7 Trigger Acceptance Run
`POST /api/v1/acceptance-run`

Purpose: start acceptance tracking job.

#### Request
```json
{
  "campaign_id": "CMP-001"
}
```

#### Response
```json
{
  "run_id": "run_acc_001",
  "campaign_id": "CMP-001",
  "type": "acceptance",
  "status": "queued",
  "started_at": "2026-06-04T18:50:00Z"
}
```

---

### 4.8 Get Acceptance Run Status
`GET /api/v1/acceptance-run/{campaign_id}`

#### Path Params
- `campaign_id` (**required**)

#### Response
```json
{
  "run_id": "run_acc_001",
  "campaign_id": "CMP-001",
  "status": "success",
  "started_at": "2026-06-04T18:50:00Z",
  "completed_at": "2026-06-04T18:50:42Z",
  "accepted_count": 3,
  "accepted_profiles": [
    {
      "name": "Angela Okhib",
      "profile_url": "linkedin.com/in/angela-okhib",
      "accepted_at": "2026-06-04T18:50:40Z"
    }
  ],
  "new_reference_node": "ref_cmp-001_k8a9z",
  "error_message": ""
}
```

---

### 4.9 Trigger Messages Run
`POST /api/v1/messages-run`

Purpose: scan conversations and detect replies.

#### Request
```json
{
  "campaign_id": "CMP-001"
}
```

#### Response
```json
{
  "run_id": "run_msg_001",
  "campaign_id": "CMP-001",
  "type": "messages",
  "status": "queued",
  "started_at": "2026-06-04T19:01:00Z"
}
```

---

### 4.10 Get Messages Run Status
`GET /api/v1/messages-run/{campaign_id}`

#### Path Params
- `campaign_id` (**required**)

#### Response
```json
{
  "run_id": "run_msg_001",
  "campaign_id": "CMP-001",
  "status": "success",
  "started_at": "2026-06-04T19:01:00Z",
  "completed_at": "2026-06-04T19:01:51Z",
  "leads_processed": 42,
  "replies_detected": 6,
  "failed_count": 2,
  "replies": [
    {
      "name": "Jose Luis Toma",
      "profile_url": "linkedin.com/in/jose-luis-toma",
      "last_reply_message": "Yes, we can schedule a short call.",
      "time": "5:20 PM"
    }
  ],
  "error_message": ""
}
```

---

### 4.11 Run History (Recent Runs)
`GET /api/v1/runs`

Purpose: unified run list for dashboard recent runs and auditing.

#### Query Params
- `campaign_id` (**required**)
- `type` (optional: `acceptance | messages`)
- `status` (optional: `queued | running | success | failed`)
- `limit` / `offset` (optional)

#### Response
```json
{
  "items": [
    {
      "run_id": "run_acc_001",
      "type": "acceptance",
      "campaign_id": "CMP-001",
      "status": "success",
      "started_at": "2026-06-04T18:50:00Z",
      "completed_at": "2026-06-04T18:50:42Z",
      "summary": "3 accepted profiles"
    },
    {
      "run_id": "run_msg_001",
      "type": "messages",
      "campaign_id": "CMP-001",
      "status": "failed",
      "started_at": "2026-06-04T19:01:00Z",
      "completed_at": "2026-06-04T19:01:51Z",
      "summary": "2 failed while scanning replies"
    }
  ],
  "total": 2,
  "limit": 50,
  "offset": 0
}
```

---

### 4.12 Health Check
`GET /api/v1/health`

Purpose: lightweight liveness/readiness endpoint for platform monitoring, deployment checks, and alerting.

#### Response
```json
{
  "status": "ok",
  "services": {
    "db": "ok",
    "queue": "ok"
  }
}
```

---

## 5) Data Models

### Campaign
```json
{
  "campaign_id": "string",
  "campaign_name": "string",
  "ai_sdr_email": "string",
  "ai_sdr": {
    "email": "string",
    "is_premium": "boolean",
    "premium_plan": "string|null"
  },
  "environment": "QA|Dev|Local|Stage|Prod",
  "status": "Active|Inactive|Stopped",
  "created_at": "ISO-8601 datetime"
}
```

### Overview
```json
{
  "ai_sdr": {
    "email": "string",
    "is_premium": "boolean",
    "premium_plan": "string|null"
  },
  "stats": "Stat[]",
  "chart": "ChartPayload",
  "recent_runs_summary": "RunSummary[]",
  "failed_actions_summary": "FailedActionSummary[]"
}
```

### FailedAction
```json
{
  "id": "string",
  "campaign_id": "string",
  "lead": "string",
  "reason": "string",
  "step": "string",
  "timestamp": "ISO-8601 datetime",
  "logs": "string",
  "screenshot_url": "string"
}
```

### DetailRow
```json
{
  "name": "string",
  "initials": "string",
  "color": "string",
  "text_color": "string",
  "url": "string",
  "action": "string",
  "status": "sent|replied|no_reply|queued",
  "time": "string|ISO datetime"
}
```

### Conversation
```json
{
  "conversation_id": "string",
  "campaign_id": "string",
  "name": "string",
  "status": "sent|replied|no_reply|queued",
  "preview": "string",
  "messages": "Message[]"
}
```

### Message
```json
{
  "id": "string",
  "dir": "sent|recv",
  "text": "string",
  "time": "string|ISO datetime"
}
```

### AcceptanceRun
```json
{
  "run_id": "string",
  "campaign_id": "string",
  "type": "acceptance",
  "status": "queued|running|success|failed",
  "started_at": "ISO-8601 datetime",
  "completed_at": "ISO-8601 datetime|null",
  "accepted_count": "number",
  "accepted_profiles": [
    {
      "name": "string",
      "profile_url": "string",
      "accepted_at": "ISO-8601 datetime"
    }
  ],
  "new_reference_node": "string",
  "error_message": "string"
}
```

### MessagesRun
```json
{
  "run_id": "string",
  "campaign_id": "string",
  "type": "messages",
  "status": "queued|running|success|failed",
  "started_at": "ISO-8601 datetime",
  "completed_at": "ISO-8601 datetime|null",
  "leads_processed": "number",
  "replies_detected": "number",
  "failed_count": "number",
  "replies": [
    {
      "name": "string",
      "profile_url": "string",
      "last_reply_message": "string",
      "time": "string|ISO datetime"
    }
  ],
  "error_message": "string"
}
```

### RunHistory
```json
{
  "run_id": "string",
  "type": "acceptance|messages",
  "campaign_id": "string",
  "status": "queued|running|success|failed",
  "started_at": "ISO-8601 datetime",
  "completed_at": "ISO-8601 datetime|null",
  "summary": "string"
}
```

---

## 6) Relationships

- Campaign -> Failed Actions (1:N)
- Campaign -> Conversations (1:N)
- Campaign -> Overview Stats (1:1 per time window)
- Campaign -> Acceptance Runs (1:N)
- Campaign -> Messages Runs (1:N)
- Campaign -> Run History records (1:N; union of acceptance/messages)

---

## 7) Execution Flows

### Acceptance Run Flow
1. Frontend triggers `POST /acceptance-run`
2. Backend enqueues acceptance scanner
3. Worker navigates connections and identifies accepted profiles
4. Backend stores results + `new_reference_node`
5. Frontend polls `GET /acceptance-run/{campaign_id}`
6. On failure, backend creates failed action with `step=acceptance_run`

### Messages Run Flow
1. Frontend triggers `POST /messages-run`
2. Backend enqueues conversation scan
3. Worker scans leads/conversations and detects replies
4. Backend stores summary + reply samples
5. Frontend polls `GET /messages-run/{campaign_id}`
6. On failure, backend creates failed action with `step=messages_run`

---

## 7.1 Run Status Lifecycle (Required)

All async run-based APIs (`acceptance-run`, `messages-run`) must follow a strict lifecycle:

1. `queued`
   - Trigger API accepted and job persisted/enqueued
2. `running`
   - Worker claimed job and started processing
3. Terminal status:
   - `success` when completed with valid result payload
   - `failed` when completed with error payload

Lifecycle constraints:

- State transitions allowed:
  - `queued -> running`
  - `running -> success | failed`
- Terminal states are immutable (`success`, `failed`)
- `started_at` is set on transition to `running`
- `completed_at` is set only on terminal transition
- A run must include `error_message` when `status=failed`

---

## 8) Performance & Design Notes

- Run-trigger APIs must be **async** (return queued/running quickly)
- Execute scanners in background workers (BullMQ / RabbitMQ / Celery equivalent)
- Do not block request thread for automation tasks
- Use polling for run status (2-5s interval)
- Cache `/overview` (short TTL, e.g., 15-30s)
- Paginate campaigns, details, conversations, runs
- Keep failed-action logs lazy-loaded via details endpoint
- Add idempotency key for run trigger APIs if repeated clicks are possible

---

## 8.1 Rate Limiting

Protect write and trigger endpoints from abuse:

- `POST /api/v1/acceptance-run`
- `POST /api/v1/messages-run`
- `POST /api/v1/conversations/{id}/messages`

Recommended limits (per user + per org):

- Run triggers: `5 requests / minute`
- Message send: `30 requests / minute`
- Global write budget: `120 requests / minute`

Response on limit breach:

- HTTP `429 Too Many Requests`
- Include headers:
  - `Retry-After`
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

---

## 8.2 Idempotency

Required for run trigger APIs to prevent duplicate execution:

- Header: `Idempotency-Key: <uuid>`
- Applies to:
  - `POST /api/v1/acceptance-run`
  - `POST /api/v1/messages-run`

Rules:

- Same `(org_id, campaign_id, endpoint, idempotency_key)` within TTL returns same response
- Server stores key + normalized request hash + response for replay
- Suggested idempotency window: 24 hours
- If same key with different body -> HTTP `409 Conflict`

---

## 8.3 Environment Handling & Campaign Isolation

Environment values: `QA | Dev | Stage | Prod` (optionally `Local` for internal testing).

Requirements:

- Every campaign belongs to exactly one environment
- Every run/history/failure record inherits campaign environment
- Queries must filter by authorized environment scope from token claims
- Cross-environment access without permission must return `403`

Isolation:

- Enforce tenant/org partitioning across all reads/writes
- Recommended compound indexes:
  - `(org_id, campaign_id)`
  - `(org_id, campaign_id, status)`
  - `(org_id, campaign_id, completed_at desc)` for run history

---

## 8.4 Real-time Updates (Optional)

Optional push channel for run/failure updates:

- SSE endpoint (recommended simple option): `GET /api/v1/events?campaign_id=...`
- or WebSocket channel per campaign/org

Event types:

- `run.status.changed`
- `failed_action.created`
- `conversation.updated`

Payload shape should include:

- `event_type`
- `campaign_id`
- `occurred_at`
- `data` (resource-specific body)

If not enabled, polling remains supported and canonical.

---

## 9) Frontend Mapping

| UI Section | API Used |
|---|---|
| Setup Campaign Table | `GET /api/v1/campaigns` |
| Dashboard Stats + Chart | `GET /api/v1/overview` |
| Dashboard Recent Runs | `GET /api/v1/overview` and/or `GET /api/v1/runs` |
| Failed Actions List (summary) | `GET /api/v1/overview` |
| Failed Action Logs/Screenshot Modal | `GET /api/v1/failed-actions/{id}` |
| Detail Drilldown Screen | `GET /api/v1/details/{metric_key}` |
| Messaging Screen | `GET /api/v1/conversations` |
| Send Message | `POST /api/v1/conversations/{id}/messages` |
| Acceptance Runs Section | `POST /api/v1/acceptance-run`, `GET /api/v1/acceptance-run/{campaign_id}` |
| Messages Runs Section | `POST /api/v1/messages-run`, `GET /api/v1/messages-run/{campaign_id}` |
| Unified Run History | `GET /api/v1/runs` |

---

## 10) Error Handling

### Standard Error Response
```json
{
  "error": {
    "code": "string_code",
    "message": "Human-readable message",
    "http_status": 400,
    "details": {},
    "correlation_id": "uuid",
    "retryable": false
  }
}
```

### Recommended Status Codes
- `200` OK
- `201` Created (optional for run trigger if modeled as resource creation)
- `202` Accepted (preferred for async run trigger)
- `400` Validation error
- `401` Unauthorized
- `403` Forbidden
- `404` Not found
- `409` Conflict (duplicate active run)
- `422` Business rule error
- `429` Rate limited
- `500` Internal error
- `503` Dependency/job queue unavailable

### Retry Guidance
- Trigger APIs: retry on `429/503` with exponential backoff
- Status APIs: safe polling retries
- Message send: retry only if request is idempotency-protected (or client confirms duplicate-safe behavior)

---

## 10.1 Security Considerations

- Validate all inputs (path/query/body) with strict schemas
- Sanitize and encode untrusted text before storing/returning
- Reject unknown enum values for `status`, `type`, `metric_key`, `environment`
- Enforce campaign-level ACL checks for every endpoint using `campaign_id`
- Never expose secrets, cookies, auth headers, or internal stack traces in API responses
- Store logs/screenshot URLs securely (signed URLs where applicable)
- Apply audit logging for:
  - run trigger requests
  - failed_action creation
  - message send operations

---

## 10.2 Validation Rules (Status + Compatibility)

Inbox-related status fields (`details.rows[].status`, `conversations.items[].status`) must be validated as:

- `sent`
- `replied`
- `no_reply`
- `queued`

Rules:

- Backend must return normalized lowercase underscore values only.
- Legacy values such as `Queued`, `No reply`, `no response`, `pending`, `invited` must be normalized before response.
- If a value cannot be mapped, backend must either:
  - reject with validation error (`400`/`422`), or
  - sanitize to an allowed enum per explicit product rule.

Backward compatibility guidance:

- For existing integrations returning legacy casing/spacing, normalize in `/api/v1` response adapters.
- If normalization cannot be safely guaranteed for some clients, introduce versioned behavior under `/api/v2` with migration notes.

---

## 11) Future Scope

- Severity system for failed actions (`critical/warning/info`)
- AI-powered issue summaries and remediation suggestions
- Retry failed run action (`POST /runs/{id}/retry`)
- Real-time notifications (websocket/email/slack)
- Campaign health score endpoint and trend APIs

---

## Implementation Notes (Minimal + Scalable)

- Keep endpoint count as defined above (minimal set for current UI)
- Reuse shared run model base internally (`run_id`, `campaign_id`, `status`, timing)
- Ensure naming consistency (`snake_case` in API payloads)
- Add OpenAPI spec from these contracts before implementation start
