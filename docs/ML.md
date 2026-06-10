# ML Integration — Feature Specification
**Smart PMS × FastAPI · AI Module**

---

## Architecture

```
PMS (Laravel + React)
  │
  ├── UWP Editor (Supervisor)
  │     └── AssignModal ──POST /predict──► FastAPI ML Server
  │                      ◄── predictions ─┘
  │
  └── MySQL Database ◄──── FastAPI reads history directly (read-only)
```

**Same database, read-only from FastAPI.**
FastAPI never writes to the PMS database. Laravel calls FastAPI via HTTP for predictions.

---

## Feature 1 — Assignment Risk Prediction (Already Built)

> "If I assign this employee to this indicator, what is the risk of non-completion?"

### FastAPI Endpoint
```
POST /predict
```

### Input (sent by PMS)
```json
{
  "target_quantity": 5,
  "target_timeline_days": 7,
  "mfo_category": 0,
  "office_size": 10,
  "past_completion_rate": 88,
  "employee_count_assigned": 3
}
```

### Output
```json
{
  "verdict": "achievable",
  "risk": "LOW",
  "recommendation": "APPROVE",
  "confidence": 84.5
}
```

### PMS Data Sources
| Input Feature | PMS Source |
|---|---|
| `target_quantity` | `uwp_success_indicators.target_quantity` |
| `target_timeline_days` | `uwp_success_indicators.target_timeline` parsed to days |
| `mfo_category` | `uwp_functions.function_type` encoded |
| `office_size` | `COUNT(users) WHERE office_id = ?` |
| `past_completion_rate` | `AVG(ipcrs.final_score) / 5 * 100` for this employee |
| `employee_count_assigned` | `COUNT(uwp_indicator_assignments) WHERE uwp_success_indicator_id = ?` |

---

## Feature 2 — Suggested Success Indicators (To Build)

> "Given this employee's history, which indicators in the current UWP are the best fit for them?"

### How It Works

```
Employee's past IPCR history:
  Period 1: "Prepare 10 reports within 5 days"      → score 4.5
  Period 2: "Review 5 plantilla within 3 days"      → score 4.2
  Period 3: "Conduct 3 trainings within 7 days"     → score 2.8

Current UWP indicators (candidates):
  A. "1 plantilla reviewed with 3-4 minor errors"   ← similar to Period 2
  B. "2 reports submitted within 5 days"            ← similar to Period 1
  C. "5 seminars organized within 10 days"          ← similar to Period 3

ML Output:
  A → 88% fit  Strong fit   (text similar to plantilla task, past score 4.2)
  B → 85% fit  Strong fit   (text similar to report task, past score 4.5)
  C → 41% fit  Weak fit     (text similar to training task, past score 2.8)
```

### FastAPI Endpoint
```
POST /suggest-indicators
```

### Input (sent by PMS)
```json
{
  "employee_id": 6,
  "employee_history": [
    {
      "indicator_text": "Prepare 10 reports within 5 days",
      "function_type": "core",
      "score": 4.5,
      "period": "1st Semester 2024"
    },
    {
      "indicator_text": "Review 5 plantilla within 3 days",
      "function_type": "core",
      "score": 4.2,
      "period": "2nd Semester 2024"
    }
  ],
  "past_completion_rate": 88,
  "candidate_indicators": [
    {
      "id": 12,
      "indicator_text": "1 plantilla reviewed with 3-4 minor errors on the 5th day",
      "function_type": "core",
      "mfo_title": "RECRUITMENT, SELECTION AND PLACEMENT",
      "target_quantity": 1,
      "target_timeline_days": 5
    }
  ]
}
```

### Output
```json
{
  "suggestions": [
    {
      "indicator_id": 12,
      "fit_score": 88,
      "fit_label": "Strong fit",
      "risk": "LOW",
      "reason": "Similar to past plantilla review tasks where employee scored 4.2"
    }
  ]
}
```

### ML Approach for Similarity

Two-step scoring:

**Step 1 — Text similarity (TF-IDF or sentence embeddings)**
```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Compare candidate indicator text vs all past indicator texts
# weighted by past score
similarity_score = cosine_similarity(candidate_vector, history_vectors)
weighted_score = sum(similarity * past_score for each history item)
```

**Step 2 — Combine with existing Random Forest features**
```python
final_fit_score = (text_similarity * 0.6) + (rf_success_prob * 0.4)
```

### PMS Data Sources for History
| Field | PMS Source |
|---|---|
| `indicator_text` | `ipcr_items.indicator_text` (snapshot stored at commit time) |
| `function_type` | `ipcr_items.uwp_function_id` → `uwp_functions.function_type` |
| `score` | `ipcrs.final_score` or `ipcrs.pmt_adjusted_score` |
| `period` | `performance_periods.name` via `ipcrs.performance_period_id` |

**No new table needed.** All data already exists in `ipcr_items` joined to `ipcrs`.

---

## Snapshot Table — `employee_performance_snapshots`

A dedicated denormalized table. **FastAPI reads only this table — no joins into PMS tables needed.**

### Schema
| Column | Type | Source |
|---|---|---|
| `employee_id` | FK → users | `ipcrs.employee_id` |
| `performance_period_id` | FK → performance_periods | `ipcrs.performance_period_id` |
| `ipcr_id` | FK → ipcrs | `ipcrs.id` |
| `indicator_text` | text | `ipcr_items.indicator_text` |
| `function_type` | string | `uwp_functions.function_type` |
| `mfo_title` | string | `uwp_mfos.title` |
| `target_quantity` | integer | `ipcr_items.target_quantity` |
| `target_timeline_days` | integer | parsed from `ipcr_items.target_timeline` |
| `office_size` | integer | COUNT users in same office |
| `employee_count_assigned` | integer | COUNT assignments on indicator |
| `final_score` | decimal | `ipcrs.pmt_adjusted_score` ?? `final_score` |
| `adjectival_rating` | string | `ipcrs.pmt_adjusted_rating` ?? `adjectival_rating` |

### How It Gets Populated

`IpcrObserver` fires automatically when PMT releases an IPCR (`status = 'released_by_pmt'`).
Each `ipcr_item` under that IPCR becomes one snapshot row.

**Files created:**
- `database/migrations/2026_06_10_000001_create_employee_performance_snapshots_table.php`
- `app/Models/EmployeePerformanceSnapshot.php`
- `app/Observers/IpcrObserver.php`
- `app/Providers/AppServiceProvider.php` (registers observer)

### FastAPI Query — No Joins
```python
import pandas as pd
from sqlalchemy import create_engine

engine = create_engine("mysql+pymysql://user:pass@host/smart_pms")

# Training data — ready to use
df = pd.read_sql("SELECT * FROM employee_performance_snapshots", engine)

# Employee history for /suggest-indicators
history = pd.read_sql(
    "SELECT * FROM employee_performance_snapshots WHERE employee_id = %s",
    engine, params=[employee_id]
)
```

---

## Database Access

| System | Access |
|---|---|
| Laravel PMS | Read + Write (full access) |
| FastAPI ML | Read-only (history queries only) |

FastAPI connects to the same MySQL database using the same `.env` credentials, but only runs `SELECT` queries.

Alternatively (preferred for production): Laravel collects and sends the history as JSON in the HTTP request body — FastAPI never touches the DB directly.

---

## Laravel Side — What to Build

### 1. History Query (for Feature 2 input)
```php
// In a future PmtController or UwpEditorController
$history = IpcrItem::with(['ipcr.period', 'indicator.uwpMfo.uwpFunction'])
    ->whereHas('ipcr', fn($q) => $q->where('employee_id', $employeeId)
        ->whereNotNull('final_score'))
    ->get()
    ->map(fn($item) => [
        'indicator_text' => $item->indicator_text,
        'function_type'  => $item->indicator?->uwpMfo?->uwpFunction?->function_type,
        'score'          => $item->ipcr->pmt_adjusted_score ?? $item->ipcr->final_score,
        'period'         => $item->ipcr->period?->name,
    ]);
```

### 2. HTTP Call to FastAPI
```php
// Using Laravel HTTP client
$response = Http::post(config('services.ml.url') . '/suggest-indicators', [
    'employee_id'          => $employeeId,
    'employee_history'     => $history,
    'past_completion_rate' => $completionRate,
    'candidate_indicators' => $candidates,
]);

return $response->json('suggestions');
```

### 3. Config (`config/services.php`)
```php
'ml' => [
    'url' => env('ML_API_URL', 'http://localhost:8001'),
],
```

---

## Current Status

| Feature | PMS | FastAPI |
|---|---|---|
| Assignment Risk (`/predict`) | Simulated (AssignModal prototype) | Built (Random Forest) |
| Suggested Indicators (`/suggest-indicators`) | Prototype UI ready (AssignModal ★ button) | **To build** |
| Snapshot table + observer | **Done** (`IpcrObserver` auto-populates) | Read via `pd.read_sql` |

---

## Implementation Order

1. ~~**Snapshot table**~~ — Done. Run `php artisan migrate` to create.
2. **FastAPI**: Add `/suggest-indicators` endpoint using TF-IDF on `indicator_text` + RF score
3. **Laravel**: Add `ML_API_URL` to `.env`, create history query from snapshot table
4. **AssignModal**: Replace `suggestIndicators()` simulation with real API call
5. **Test**: Release a few IPCRs, verify snapshot rows appear, verify suggestions
