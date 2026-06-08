# Notification System — PMS Prototype

## Overview

The notification system combines **Laravel database notifications**, **real-time WebSocket broadcasting via Laravel Reverb**, and a **Livewire component** for the UI dropdown. Notifications are both persisted in the database (so they survive page reloads) and pushed live to the browser without polling.

---

## Tech Stack

| Layer | Technology |
|---|---|
| WebSocket Server | **Laravel Reverb** (self-hosted, runs on `localhost:8080`) |
| JS WebSocket Client | **Laravel Echo** + **Pusher-JS** (configured with `broadcaster: 'reverb'`) |
| Notification Storage | **Laravel database notifications** (`notifications` table) |
| Broadcast Channel | **Private channel** — `App.Models.User.{id}` |
| UI Component | **Livewire v3** component (`NotificationDropdown`) |
| Sound | `public/sounds/notifications/new-notification.wav` (unlocked via user gesture) |
| CSS Framework | Tailwind CSS + Flowbite |
| Icon Library | Font Awesome 6 |

---

## Architecture Flow

```
Controller Action
      │
      ▼
WorkflowNotificationDispatcher::notifyUser() / notifyRole()
      │
      ▼
$user->notify(new WorkflowEventNotification(...))
      │
      ├── [database] → stored in `notifications` table
      │
      └── [broadcast] → Laravel Reverb WebSocket
                              │
                              ▼
                   Private channel: App.Models.User.{id}
                              │
                              ▼
              realtime-notifications.blade.php (inline JS)
              Echo.private(channel).notification(callback)
                              │
                              ▼
              window.dispatchEvent('pms-notification-received')
                              │
                              ▼
              Livewire @pms-notification-received.window
              → $wire.refreshNotifications()
              → re-fetches last 10 from DB + updates unreadCount
```

---

## Files

### PHP (Backend)

| File | Role |
|---|---|
| `app/Notifications/WorkflowEventNotification.php` | Main notification class — channels: `database` + `broadcast` |
| `app/Notifications/TaskReminderNotification.php` | Supervisor → employee reminder — channel: `database` only |
| `app/Services/WorkflowNotificationDispatcher.php` | Helper service — `notifyUser()` and `notifyRole()` |
| `app/Livewire/NotificationDropdown.php` | Livewire component — loads, marks, and refreshes notifications |
| `app/Events/TestNotification.php` | Dev/debug test event on a public `test-channel` |
| `routes/channels.php` | Authorizes `App.Models.User.{id}` private channel |

### Frontend (JS / Blade)

| File | Role |
|---|---|
| `resources/js/bootstrap.js` | Initializes `window.Echo` with Reverb config; enables `Pusher.logToConsole` in dev |
| `resources/views/partials/realtime-notifications.blade.php` | Inline JS — subscribes to private channel, handles sound, dispatches `pms-notification-received` event |
| `resources/views/livewire/notification-dropdown.blade.php` | Livewire blade UI — bell icon, panel, notification list |
| All layout files (`layouts/*.blade.php`) | Include `@include('partials.realtime-notifications')` before `</body>`, and `<livewire:notification-dropdown />` in the top nav |

---

## Notification Data Structure

Every notification stored in the `notifications` table has this `data` JSON shape:

```json
{
  "title": "UWP Submitted",
  "body": "John Doe submitted a Unit Work Plan for review.",
  "type": "info",
  "url": "/supervisor/uwp/123",
  "meta": {
    "event": "uwp.submitted",
    "uwp_id": 123,
    "office_id": 5,
    "performance_period_id": 2,
    "status": "submitted",
    "source_role": "supervisor"
  }
}
```

**type** values and their UI treatment:

| type | Icon | Color |
|---|---|---|
| `info` | `fa-regular fa-bell` | Sky blue |
| `success` | `fa-solid fa-circle-check` | Emerald green |
| `alert` | `fa-solid fa-triangle-exclamation` | Rose red |

---

## Operational Notification Triggers

### Unit Work Plan (UWP)

| Event | Trigger | Who Gets Notified | Type |
|---|---|---|---|
| `uwp.submitted` | Supervisor submits UWP | Department Head | `info` |
| `uwp.returned` (by Dept Head) | Dept Head returns UWP for revision | Supervisor (UWP creator) | `alert` |
| `uwp.consolidated` | Dept Head consolidates UWP to OPCR | Each consolidated Supervisor | `success` |
| `uwp.returned` (by PMT) | PMT returns UWP | Supervisor (UWP creator) | `alert` |
| `uwp.pmt_approved` | PMT approves UWP | Supervisor (creator) + Dept Head | `success` |

### OPCR

| Event | Trigger | Who Gets Notified | Type |
|---|---|---|---|
| `opcr.pmt_approved` | PMT gives final OPCR approval | Department Head | `success` |
| `ipcr.ready_for_commitment` | PMT approves OPCR (cascades) | All linked Employees (IPCR holders) | `success` |
| OPCR returned | PMT/Dept Head returns OPCR | Relevant role | `alert` |
| OPCR endorsed | Dept Head endorses OPCR to PMT | PMT role | `info` |

### MPOR (Monthly Performance Output Report)

| Event | Trigger | Who Gets Notified | Type |
|---|---|---|---|
| `mpor.endorsed_to_dept_head` | Supervisor endorses MPOR | Department Head | `info` |
| MPOR submitted | Employee submits MPOR | Supervisor | `info` |
| MPOR returned | Supervisor returns MPOR | Employee | `alert` |

### ORS (Output Recording Sheet)

| Event | Trigger | Who Gets Notified | Type |
|---|---|---|---|
| `ors.submitted_to_supervisor` | Employee submits ORS entry | Supervisor | `info` |
| ORS reviewed/returned | Supervisor reviews ORS entry | Employee | `alert` / `success` |

### QAR (Quality Assurance Report)

| Event | Trigger | Who Gets Notified | Type |
|---|---|---|---|
| QAR submitted | Dept Head submits QAR | PMT role | `info` |
| QAR returned | PMT returns QAR | Dept Head | `alert` |

### Accomplishment Review

| Event | Trigger | Who Gets Notified | Type |
|---|---|---|---|
| Accomplishment submitted | Employee submits accomplishment | Supervisor | `info` |
| Accomplishment approved | Supervisor/Dept Head/PMT approves | Employee | `success` |
| Accomplishment returned | Reviewer returns accomplishment | Employee | `alert` |

### Employee Calibration / Office Calibration

| Event | Trigger | Who Gets Notified | Type |
|---|---|---|---|
| Calibration submitted | Dept Head submits calibration | PMT role (all PMT users) | `info` |
| Calibration returned | PMT returns calibration | Dept Head | `alert` |
| Calibration approved | PMT approves calibration | Dept Head | `success` |

### Task Reminder

| Event | Trigger | Who Gets Notified | Type |
|---|---|---|---|
| Task reminder sent | Supervisor clicks "Remind" on team task | Individual Employee | `alert` |

> **Note:** Task reminders use `TaskReminderNotification` which only uses the `database` channel (no real-time push).

---

## WorkflowNotificationDispatcher

```php
// Notify a specific user
$notifier->notifyUser($user, new WorkflowEventNotification(...));

// Notify all active users with a given role (optional filter callback)
$notifier->notifyRole('pmt', new WorkflowEventNotification(...));
$notifier->notifyRole('supervisor', $notification, fn($u) => $u->office_id === $officeId);
```

Inactive users (`is_active = false`) are automatically skipped.

---

## WebSocket Configuration

### Environment Variables (`.env`)

```env
BROADCAST_CONNECTION=reverb

REVERB_APP_ID=958923
REVERB_APP_KEY=o6tx6ynpivmqlo0kyshc
REVERB_APP_SECRET=mahdavaophnvsntwyrfy
REVERB_HOST=localhost
REVERB_PORT=8080
REVERB_SCHEME=http

VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"
```

### Laravel Echo Initialization (`resources/js/bootstrap.js`)

```js
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
window.Pusher = Pusher;

if (import.meta.env.DEV) {
    Pusher.logToConsole = true; // debug logging in dev
}

window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST ?? '127.0.0.1',
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
    enabledTransports: ['ws', 'wss'],
});
```

### Channel Authorization (`routes/channels.php`)

```php
Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});
```

---

## Real-Time Listener (`partials/realtime-notifications.blade.php`)

The inline JS partial does the following on every page:

1. Reads `<meta name="auth-user-id">` from the layout to get the current user ID.
2. Waits for `window.Echo` to be available (polls every 250ms, up to 10s).
3. Subscribes to `Echo.private('App.Models.User.{userId}')`.
4. On `.notification()` callback: dispatches `pms-notification-received` window event (with a 300ms delay to let DB write commit).
5. Plays notification sound (unlocked by first user gesture: `pointerdown`, `keydown`, or `touchstart`).
6. Exposes `window.__pmsRealtimeDebug` for console debugging.

### Debug Console Helper

```js
// Check WebSocket state
window.__pmsRealtimeDebug.getEchoState()
// Returns: { echoExists, pusherExists, connectionState, channels[] }

// Manually trigger a notification refresh (test without actual push)
window.__pmsRealtimeDebug.emitTestEvent()

// Properties
window.__pmsRealtimeDebug.userId       // current user ID
window.__pmsRealtimeDebug.channelName  // e.g. "App.Models.User.42"
```

### Connection State Logs (console)

| Log | Meaning |
|---|---|
| `[PMS RT] Echo initialized` | Echo object created, key/host printed |
| `[PMS RT] Subscribing to private channel: ...` | Channel subscription started |
| `[PMS RT] ✅ WebSocket CONNECTED` | Pusher connection confirmed |
| `[PMS RT] ✅ Channel subscription succeeded` | Private channel authorized and active |
| `[PMS RT] 🔔 Notification received: {...}` | Incoming real-time notification payload |
| `[PMS RT] Audio unlocked.` | Sound playback enabled after user gesture |
| `[PMS RT] ❌ Pusher error` | Connection error |
| `[PMS RT] ❌ Channel subscription error` | Channel auth failed |
| `[PMS RT] ❌ window.Echo not available after 10s` | Reverb server not running or JS not loaded |

---

## Livewire Component (`NotificationDropdown`)

### Component Class

```php
class NotificationDropdown extends Component
{
    public bool $open = false;
    public array $notifications = [];
    public int $unreadCount = 0;

    // Triggered by JS window event 'pms-notification-received'
    #[On('pms-notification-received')]
    public function refreshNotifications(): void { ... }

    public function toggle(): void { ... }      // opens/closes panel
    public function markAllRead(): void { ... } // marks all as read
    public function markRead(int $index): void { ... } // marks one as read
}
```

### What `loadNotifications()` Does

- Fetches the **latest 10** notifications from the `notifications` table for the authenticated user.
- Maps each to: `title`, `body`, `time` (diffForHumans), `type`, `is_read`, `url`.
- Sets `unreadCount` from unread items.

### Blade Behavior

- Bell icon shows a **rose dot** badge when `unreadCount > 0`.
- Panel opens via `wire:click="toggle"`, closes via `wire:click.outside="close"` or `Escape`.
- Notifications are rendered as `<a>` (if `url`) or `<button>` (if no url).
- Unread indicator: small emerald dot on the right.
- Empty state: "You're all caught up."

---

## How to Run Reverb

```bash
php artisan reverb:start
# WebSocket server starts at ws://localhost:8080
```

Also run the queue worker if `QUEUE_CONNECTION` is not `sync`:

```bash
php artisan queue:work
```

---

## Re-implementation Guide (React)

Since your new project uses React instead of Livewire, here is what maps to what:

| PMS Prototype (Livewire) | New Project (React) |
|---|---|
| `NotificationDropdown` Livewire component | React `<NotificationPanel>` component |
| `#[On('pms-notification-received')]` + `$wire.refreshNotifications()` | `window.addEventListener('pms-notification-received', fetchNotifications)` |
| `wire:click="toggle"` | `onClick` state toggle |
| `wire:click="markAllRead"` | `fetch('/api/notifications/mark-all-read', { method: 'POST' })` |
| `wire:click="markRead(index)"` | `fetch('/api/notifications/{id}/read', { method: 'POST' })` |
| `loadNotifications()` (PHP) | `GET /api/notifications` endpoint returning same shape |
| Livewire mount | `useEffect(() => fetchNotifications(), [])` |

### Minimum API Endpoints Needed

```
GET  /api/notifications           → returns last 10, same data shape
POST /api/notifications/read-all  → marks all read
POST /api/notifications/{id}/read → marks one read
```

### Real-time Listener (same script works in React)

The `partials/realtime-notifications.blade.php` script is pure vanilla JS and works as-is. Include it in your layout or port it to a `useEffect` hook:

```js
// React hook equivalent
useEffect(() => {
  if (!window.Echo || !userId) return;

  const channel = window.Echo.private(`App.Models.User.${userId}`);
  channel.notification(() => {
    setTimeout(() => fetchNotifications(), 300);
  });

  return () => window.Echo.leave(`App.Models.User.${userId}`);
}, [userId]);
```

### Notification Data Shape (from API)

```json
[
  {
    "id": "uuid",
    "title": "UWP Submitted",
    "body": "John submitted a UWP for review.",
    "type": "info",
    "url": "/dept-head/uwp/42",
    "time": "2 minutes ago",
    "is_read": false
  }
]
```

### Type → Icon + Color Mapping

```js
const TYPE_CONFIG = {
  alert:   { icon: 'fa-solid fa-triangle-exclamation', color: 'text-rose-300 bg-rose-500/10' },
  success: { icon: 'fa-solid fa-circle-check',         color: 'text-emerald-300 bg-emerald-500/10' },
  info:    { icon: 'fa-regular fa-bell',               color: 'text-sky-300 bg-sky-500/10' },
};
```
