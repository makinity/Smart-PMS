# HRMO Hub — Connection Handshake Design

> **Last updated:** August 22, 2026
> **Status:** PMS side built. L&D side needs to be built. Handshake protocol documented here.
> **Scope:** PMS ↔ L&D connection via mutual token exchange

---

## Overview

The HRMO Hub in PMS (`/administrator/hris`) is the admin UI for managing connections to other HRIS pillars (RSP, RNR, L&D). The `ld` pillar row already exists in `hrmo_hub_connections`.

**Current limitation:** The Hub right now is a one-sided UI — PMS admin enters a URL + token and saves it. There is no handshake. The L&D system has no Hub equivalent and has no way to accept or reject a connection request.

**Goal:** Build a proper mutual connection flow where:
1. PMS admin initiates a connection request to L&D
2. L&D admin sees a pending request and accepts it
3. Both sides are then marked as connected and operational

---

## Current PMS Hub State

### What exists
- `hrmo_hub_connections` table — one row per pillar (`rsp`, `pms`, `rnr`, `ld`)
- `HrmoHubController` — `connect()`, `disconnect()`, `testConnection()`, `sync()`
- `HrmoHubConnection` model — stores `pillar`, `base_url`, `token`, `status`, `last_sync_at`, `last_sync_result`, `config`
- Frontend: `Admin/HrmoHub/Index.jsx` — slide-out panel per pillar, connect form, test button

### How `connect()` works today (PMS side)
Admin enters `base_url` + `token` → POST `/administrator/hrmo-hub/connect` → saves to `hrmo_hub_connections`, sets `status = 'connected'`. No outbound call to L&D. No L&D confirmation.

### What `testConnection()` does today
Makes a GET request to `{base_url}` with the token as Bearer. If HTTP 200 → pass. This is the only actual network call the Hub makes toward L&D.

### How `LndHandoffService` uses the config
**Important:** `LndHandoffService` does NOT read from `hrmo_hub_connections`. It reads from:
- `config('services.lnd.base_url')` → `LND_BASE_URL` in `.env`
- `config('services.lnd.token')` → `LND_API_TOKEN` in `.env`

The Hub table is currently display-only for the L&D pillar. The actual API calls use `.env` values directly.

---

## Proposed Handshake Protocol

### Concept

```
PMS Admin fills in L&D base_url + token in Hub
        │
        ▼
PMS sends a connection request to L&D:
  POST {lnd_base_url}/api/hub/connection-request
  Body: { pillar: "pms", base_url: "https://pms.test", callback_token: "..." }
        │
        ▼
L&D stores it as a pending connection request
L&D admin sees it in their Hub page → clicks Accept
        │
        ▼
L&D calls back to PMS:
  POST {pms_base_url}/api/hub/connection-accepted
  Body: { pillar: "ld", status: "accepted" }
        │
        ▼
PMS marks hrmo_hub_connections ld row as status = 'connected'
Both sides are now connected
```

### Status values

| Status | Meaning |
|---|---|
| `disconnected` | No connection configured |
| `pending_acceptance` | PMS sent request, waiting for L&D admin to accept |
| `connected` | Both sides confirmed — handshake complete |
| `rejected` | L&D admin rejected the connection request |
| `built_in` | PMS pillar itself (never changes) |

---

## Part 1: What PMS Needs to Add

### 1a. Migration — add `pending_acceptance` and `rejected` to status values (no migration needed, it's a string column)

### 1b. New API route — accept callback from L&D

```php
// routes/api.php
Route::middleware(VerifyLndCallbackToken::class)
    ->prefix('hub')
    ->group(function () {
        Route::post('/connection-accepted', [HrmoHubApiController::class, 'connectionAccepted'])
            ->name('hub.connection-accepted');
    });
```

### 1c. New controller — `HrmoHubApiController`

```php
// app/Http/Controllers/Api/HrmoHubApiController.php

public function connectionAccepted(Request $request)
{
    $data = $request->validate([
        'pillar' => ['required', 'string', 'in:ld,rsp,rnr'],
        'status' => ['required', 'string', 'in:accepted,rejected'],
    ]);

    $connection = HrmoHubConnection::where('pillar', $data['pillar'])->firstOrFail();

    $connection->update([
        'status'          => $data['status'] === 'accepted'
                             ? HrmoHubConnection::STATUS_CONNECTED
                             : HrmoHubConnection::STATUS_REJECTED,
        'last_sync_at'    => now(),
        'last_sync_result'=> ['handshake' => $data['status'], 'at' => now()->toISOString()],
    ]);

    return response()->json(['ok' => true]);
}
```

### 1d. Update `HrmoHubController::connect()` for L&D pillar

When the pillar is `ld`, instead of just saving locally, also fire the connection request to L&D:

```php
public function connect(Request $request)
{
    $data = $request->validate([
        'pillar'   => ['required', 'string', 'in:rsp,rnr,ld'],
        'base_url' => ['required', 'url'],
        'token'    => ['required', 'string', 'min:8'],
    ]);

    $connection = HrmoHubConnection::where('pillar', $data['pillar'])->firstOrFail();
    $connection->update([
        'base_url' => $data['base_url'],
        'token'    => $data['token'],
        'status'   => $data['pillar'] === 'ld'
                      ? HrmoHubConnection::STATUS_PENDING
                      : HrmoHubConnection::STATUS_CONNECTED,
    ]);

    // For L&D: fire a connection request and wait for their admin to accept
    if ($data['pillar'] === 'ld') {
        $pmsCallbackToken = config('services.pms.callback_token');
        $pmsBaseUrl       = config('app.url');

        try {
            Http::withToken($data['token'])
                ->timeout(10)
                ->post(rtrim($data['base_url'], '/') . '/api/hub/connection-request', [
                    'pillar'         => 'pms',
                    'base_url'       => $pmsBaseUrl,
                    'callback_token' => $pmsCallbackToken,
                ]);
        } catch (\Throwable $e) {
            // Store error but don't abort — pending status is already saved
        }

        return back()->with('success', 'Connection request sent to L&D. Waiting for their admin to accept.');
    }

    return back()->with('success', ucfirst($data['pillar']) . ' connected successfully.');
}
```

### 1e. Add `STATUS_PENDING` and `STATUS_REJECTED` constants to `HrmoHubConnection` model

```php
const STATUS_PENDING      = 'pending_acceptance';
const STATUS_REJECTED     = 'rejected';
```

### 1f. Update the Hub frontend — show `pending_acceptance` and `rejected` states

In `Index.jsx`, add to the `SidePanel` and badge logic:
- `pending_acceptance` → yellow "Pending Acceptance" badge
- `rejected` → red "Rejected" badge

---

## Part 2: What L&D Needs to Build

> This is fully documented in `HRMO_HUB.md` inside the CapstoneFinalSystem project.
> Summary below for cross-reference.

### L&D needs:
1. `pms_hub_connection` table (or `hrmo_hub_connections` — same concept) — stores PMS connection state
2. `POST /api/hub/connection-request` — receives PMS's connection request, stores it as `pending`
3. Admin Hub page — shows pending connection from PMS, Accept/Reject buttons
4. Accept action → calls back `POST {pms_base_url}/api/hub/connection-accepted`
5. `VerifyLndApiToken` already exists and can guard the `/api/hub/connection-request` route

---

## Part 3: How LndHandoffService Should Use Hub Config (Future)

Currently `LndHandoffService` reads from `.env` directly. After the Hub is live, it should optionally read from `hrmo_hub_connections`:

```php
// Preferred: read from Hub if connected, fall back to .env
$connection = HrmoHubConnection::where('pillar', 'ld')
    ->where('status', HrmoHubConnection::STATUS_CONNECTED)
    ->first();

$baseUrl = $connection?->base_url ?? config('services.lnd.base_url', '');
$token   = $connection?->token   ?? config('services.lnd.token', '');
```

This makes the Hub the single source of truth and removes the need to manually edit `.env` for the L&D URL and token.

> Do NOT make this change until the handshake flow is working end-to-end.
> Keep `.env` as the fallback so existing functionality isn't broken.

---

## Part 4: Environment Variables Involved

### PMS `.env` (already set)
```env
LND_BASE_URL=https://{lnd-host}
LND_API_TOKEN={token}             # sent as Bearer when calling L&D
PMS_CALLBACK_TOKEN={token}        # sent inside the connection-request payload
```

### config/services.php (PMS) — relevant keys
```php
'lnd' => ['base_url' => ..., 'token' => ...],
'pms' => ['callback_token' => ...],
```

---

## Part 5: Implementation Checklist

### PMS side
- [ ] Add `STATUS_PENDING = 'pending_acceptance'` and `STATUS_REJECTED = 'rejected'` to `HrmoHubConnection`
- [ ] Update `HrmoHubController::connect()` — fire outbound request to L&D when pillar = `ld`, set status to `pending_acceptance`
- [ ] Create `app/Http/Controllers/Api/HrmoHubApiController.php` with `connectionAccepted()` method
- [ ] Add route `POST /api/hub/connection-accepted` guarded by `VerifyLndCallbackToken`
- [ ] Update `Index.jsx` SidePanel to show `pending_acceptance` (yellow) and `rejected` (red) states
- [ ] (Future) Update `LndHandoffService` to read from `hrmo_hub_connections` instead of `.env`

### L&D side
- [ ] See `HRMO_HUB.md` in CapstoneFinalSystem

---

*Document created: August 22, 2026*
