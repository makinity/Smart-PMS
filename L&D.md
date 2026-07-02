# PMS → L&D Integration Handoff

---

## Part 1: Production-Verified API Contract

> All details in this section are captured from a live local sandbox run at **2026-06-29 21:10:36**.

### Endpoint

```
POST http://{LD_HOST}/api/lnd/development-plans
```

**Headers**

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |
| `Accept` | `application/json` |
| `Authorization` | `Bearer {LND_API_TOKEN}` |

---

### Request Payload (verified from sandbox log)

```json
{
  "external_plan_id": "PMS-DP-42",
  "source_system": "PMS",
  "period": {
    "id": 3,
    "name": "Jan-Jun 2026"
  },
  "employee": {
    "id": 17,
    "name": "Mark Juntilla",
    "position": "HR Staff",
    "office_id": 1,
    "office_name": "Human Resource Management Office"
  },
  "performance": {
    "official_score": 1.20,
    "official_rating": "Poor",
    "evaluated_as_of": "2026-06-29T21:00:00Z"
  },
  "idp_rows": [
    {
      "performance_gap": "Lacks proficiency in backend optimization",
      "developmental_activity": "Attend advanced Laravel training",
      "support_needed": "Training budget, mentorship",
      "support_from_supervisor": "Weekly coaching sessions",
      "expected_completion": "Q3 2026",
      "results": null
    }
  ],
  "performance_gaps": [
    {
      "function_type": "Core Functions",
      "mfo": "Recruitment, Selection and Placement",
      "indicator": "1 plantilla prepared with 3-4 minor errors...",
      "q_rating": 1.10,
      "e_rating": 0.80,
      "t_rating": 1.20,
      "actual_rating": 1.03,
      "supervisor_entry_remarks": "Consistently late submission, needs time management intervention"
    }
  ]
}
```

**Field reference**

| Field | Type | Description |
|---|---|---|
| `external_plan_id` | string | PMS-side stable identifier. Format: `PMS-DP-{id}` |
| `source_system` | string | Always `"PMS"` |
| `period.id` | integer | Performance period primary key from PMS |
| `period.name` | string | Human-readable period label |
| `employee.id` | integer | PMS user ID — use this as `pms_user_id` in L&D (see Part 2) |
| `performance.official_score` | decimal | PMT-calibrated IPCR score (1.00–5.00) |
| `performance.official_rating` | string | Adjectival: `Outstanding`, `Very Satisfactory`, `Satisfactory`, `Unsatisfactory`, `Poor` |
| `performance.evaluated_as_of` | ISO 8601 | Point-in-time snapshot timestamp |
| `idp_rows` | array | PMT-authored training objectives — primary driver for TNA automation |
| `performance_gaps` | array | Per-indicator Q/E/T breakdown — contextual evidence layer |
| `performance_gaps[].q_rating` | decimal | Quality dimension average |
| `performance_gaps[].e_rating` | decimal | Efficiency dimension average |
| `performance_gaps[].t_rating` | decimal | Timeliness dimension average |
| `performance_gaps[].actual_rating` | decimal | Average of Q + E + T |

> **Note on `performance_gaps`:** Values are computed live from ORS work logs at send time. Treat this block as a **point-in-time snapshot** — do not use it as a live feed. Supervisor entry remarks are per-log-entry notes and may be sparse; `idp_rows` is the authoritative structured TNA signal.

---

### Response (201 Created)

```json
{
  "status": "acknowledged",
  "lnd_reference_id": "SANDBOX-REF-4821"
}
```

**Response field reference**

| Field | Type | Description |
|---|---|---|
| `status` | string | `"acknowledged"` triggers `lnd_sync_status = acknowledged` on PMS side. Any other value is stored as `"sent"`. |
| `lnd_reference_id` | string | Stored in `development_plans.lnd_reference_id` for cross-system tracking. Return `null` if not applicable. |

**PMS database state after a successful response**

| Column | Before | After |
|---|---|---|
| `development_plans.status` | `submitted_to_pmt` | `submitted_to_ld` |
| `development_plans.lnd_sync_status` | `not_sent` | `acknowledged` or `sent` |
| `development_plans.lnd_reference_id` | `null` | value from response |
| `development_plans.submitted_to_ld_at` | `null` | current timestamp |

**Error handling:** Any non-2xx response sets `lnd_sync_status = failed` and stores the error message in `lnd_last_error`. The PMT user will see a failure indicator on the dashboard and can retry.

---

## Part 2: Proposed Authentication & Account Lockout Workflow

> This section is an architectural proposal for a future phase. No code exists for this yet on either side.

### Data Isolation

The PMS and L&D systems maintain **completely separate databases**. Passwords, sessions, and credentials are never shared or transmitted between systems. Each system handles its own authentication independently.

The two systems are linked by a single shared identifier: the `employee.id` from PMS. The L&D system should store this as `pms_user_id` on its `users` / `trainees` table at the point of receiving the first IDP submission. This is the only field needed for cross-system mapping.

```
PMS users.id  ──────────────────►  L&D trainees.pms_user_id
```

---

### Lock-Step Training Lifecycle

```
PMT clicks "Submit to L&D"
        │
        ▼
PMS: development_plans.status = submitted_to_ld
PMS: users.training_status = locked_training   ← restricts login
        │
        ▼
L&D receives payload, provisions training path
        │
        ▼
Employee completes all remediation courses
        │
        ▼
L&D POSTs callback to PMS:
POST /api/lnd-callback/complete-training
        │
        ▼
PMS: users.training_status = active            ← restores login
PMS: development_plans.status = completed
```

The `locked_training` state on the PMS side is a UX/access control flag — the exact enforcement mechanism (full login block vs. restricted dashboard) is a PMS implementation decision to be confirmed before building.

---

### Callback Endpoint (to be built on PMS)

```
POST /api/lnd-callback/complete-training
Authorization: Bearer {PMS_CALLBACK_TOKEN}
Content-Type: application/json
```

**Expected payload from L&D:**

```json
{
  "pms_user_id": 17,
  "lnd_reference_id": "SANDBOX-REF-4821",
  "external_plan_id": "PMS-DP-42",
  "completed_at": "2026-09-15T10:30:00Z",
  "courses_completed": [
    {
      "course_code": "LND-BE-201",
      "title": "Advanced Laravel & Database Profiling",
      "completed_at": "2026-09-10T14:00:00Z"
    }
  ],
  "trainer_remarks": "Employee demonstrated marked improvement in backend module delivery."
}
```

**Field reference**

| Field | Required | Description |
|---|---|---|
| `pms_user_id` | yes | Must match `users.id` in PMS — primary lookup key |
| `lnd_reference_id` | yes | Echo back the value PMS sent — used for record matching |
| `external_plan_id` | yes | Echo back `PMS-DP-{id}` — secondary verification |
| `completed_at` | yes | ISO 8601 timestamp of final course completion |
| `courses_completed` | yes | Array of completed courses (can be empty array `[]` if not tracked) |
| `trainer_remarks` | no | Optional narrative for storage in `development_plans.lnd_completion_remarks` |

**PMS response to the callback (200 OK):**

```json
{
  "ok": true,
  "message": "Training completion recorded."
}
```

---

### Open Items for L&D Developer

1. Confirm the production endpoint base URL and preferred token rotation strategy
2. Confirm whether `lnd_reference_id` is generated server-side on their end or echoed from our `external_plan_id`
3. Confirm whether `courses_completed` can be an empty array or is always populated
4. Provide the static Bearer token for the PMS callback endpoint so we can implement the inbound webhook handler
5. Agree on the `locked_training` enforcement level — full login restriction vs. restricted-access mode
