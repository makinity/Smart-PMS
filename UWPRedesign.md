# UWP Redesign — UI/UX Prototype Guide (Editor Focus)

Frame-by-frame breakdown for Stitch. Focus: **UWP Editor** across 3 breakpoints.
Follows the same conventions as RESPONSIVENESS.md (inline styles, CSS variables, `useBreakpoint` hook).

---

## Breakpoints

| Name      | Width      | Devices                            |
|-----------|------------|------------------------------------|
| `desktop` | >= 1024px  | Laptops, desktops, iPad Pro        |
| `tablet`  | 768-1023px | iPad Mini, iPad, Android tablets   |
| `mobile`  | < 768px    | Phones (portrait & landscape)      |

---

## Current Problems

| Issue                                                                                          |
|-----------------------------------------------------------------------------------------------|
| Hamburger triggers a slide-over drawer that hides the indicator cards behind it               |
| Users lose spatial context — can't see nav and content at the same time on tablet/mobile      |
| On mobile, Save Draft and Submit are invisible until user notices the bottom bar               |
| QET Standards modal (3-row x 5-column grid) is completely unusable on mobile/tablet           |
| Add Indicator / Add MFO panels slide over with no spatial relationship to the trigger         |

---

## Navigation Redesign — Replacing the Hamburger

| Breakpoint | Pattern                        | How it works                                                                      |
|------------|--------------------------------|-----------------------------------------------------------------------------------|
| Desktop    | Fixed 270px left sidebar       | Always visible, no interaction needed                                             |
| Tablet     | **Breadcrumb pills** (sticky)  | `[Function v] > [MFO v]` under top bar — tap opens inline dropdown, no overlay   |
| Mobile     | **Horizontal MFO tab strip**   | One tab per MFO, sticky, scrollable — tap switches MFO, zero extra taps           |

---

## Exact Data in the System

### Functions & MFOs (Left Panel / Nav)

Each **Function**: Name (e.g. `A. CORE FUNCTIONS`), Type (Core/Support), Weight %. Edit + Delete icons on hover. Collapsible MFO list. `+ Add MFO / PPA` link when expanded.

Each **MFO**: Title (e.g. `RECRUITMENT, SELECTION AND PLACEMENT (RSP)`). Active = blue left-border accent.

Bottom of panel: `+ Add Function` (separated by top border).

### Indicator Card — exact fields

1. Indicator text — large, bold, clickable (opens Context Panel)
2. Budget — briefcase icon + `P 0.00` monospace
3. Assignee avatar stack — overlapping initials circles, max 3 + "+N"
4. Action row:
   - `Assign` — blue-tinted pill, person-plus icon
   - `QET Standards` — green-tinted pill, checkmark icon
   - `...` overflow menu: View Details / Assign Employee / Edit QET Standards / --- / Delete Indicator (red)
5. `+ Add Indicator` dashed full-width button at bottom of MFO group

### Indicator Context Panel (300px, slides from right)

Header: `INDICATOR CONTEXT` + X close

Editable fields:
- SUCCESS INDICATOR TEXT (textarea)
- TARGET QTY (input, e.g. `1`, `100%`)
- TARGET TIMELINE (textarea, e.g. `within 5 working days upon receipt`)
- BUDGET ALLOTTED P (number input)

Read-back: `SUCCESS INDICATOR` label + indicator text in a muted box

### Add Indicator Panel (420px, slides from right)

- Header: `New Success Indicator` + function name subtitle + X
- SUCCESS INDICATOR NAME — textarea, 4 rows, blue accent border
- BUDGET ALLOTTED — `P` prefix + number input
- TARGET QUANTITY + TARGET TIMELINE — side by side inputs
- AI BENCHMARK ANALYSIS banner (dark tinted box):
  - `* AI BENCHMARK ANALYSIS *` in blue uppercase
  - "Based on 2025 performance, similar indicators target **100% completion** within **5 working days**."
  - `Apply Suggestion >` blue link
- `(i) Indicators added here will be pending review by the Planning Office...`
- Footer: `CANCEL` + `Create Indicator` (filled blue)

### Add MFO Panel (420px, slides from right)

- Header: `New MFO / PPA` or `Edit MFO` + function name + X
- MFO TITLE textarea (255 char limit, counter bottom-right)
- Footer: `CANCEL` + `ADD MFO` / `SAVE MFO`

### Function Modal (centered overlay, max 420px)

- FUNCTION NAME input
- TYPE select (Core / Support) + WEIGHT % number input — side by side
- Footer: `Cancel` + `Add Function` / `Save Changes`

### QET Standards Modal (centered overlay, max 860px)

**3 rows x 5 columns grid:**

- Header: `PERFORMANCE STANDARDS` (blue uppercase) + `QET Standards — "[indicator text]"` + X
- Columns: DIMENSION | 5 Outstanding | 4 Very Satisfactory | 3 Satisfactory | 2 Unsatisfactory | 1 Poor
- Rating badge colors: 5=green, 4=blue, 3=yellow, 2=orange, 1=red (colored circle per column)
- Rows: checkmark Quality / lightning Efficiency / clock Timeliness
- Each cell: editable textarea, placeholder `"[Dimension] standard for rating [N]..."`
- Footer: `Cancel` + `Save Standards` (filled blue)

---

## Frame 1 — Desktop (>= 1024px)

```
+--------------------------------------------------------------------------+
| <-  |  Draft: FY 2026 Annual Performance Period   [Save Draft] [Submit]  |
+------------------------+-------------------------------------------------+
| MFOs / PPAs            |  RECRUITMENT, SELECTION AND PLACEMENT (RSP)     |
| ----------------------  |  ----------------------------------------       |
| A. CORE FUNCTIONS  P D  |                              8 Indicators       |
|  * RECRUITMENT, SEL...  |                                                 |
|    PERSONNEL BENEF...   |  +-------------------------------------------+ |
|    PERSONNEL RELAT...   |  | 1 plantilla prepared with 3-4 minor       | |
|    HUMAN RESOURCE ...   |  | errors on the 26th day after instruction   | |
|    PERFORMANCE MG...    |  | [B] P0.00                                 | |
|  + Add MFO / PPA        |  | [Assign]  [QET Standards]           [...]  | |
|                         |  +-------------------------------------------+ |
| B. SUPPORT FUNCTIONS    |                                                 |
|    HR Services          |  +-------------------------------------------+ |
|  + Add MFO / PPA        |  | 100% legal opinions rendered within 5     | |
|                         |  | working days upon receipt of request       | |
| + Add Function          |  | [B] P120,000.00  . [AN][CR]+1             | |
|                         |  | [Assign]  [QET Standards]           [...]  | |
|                         |  +-------------------------------------------+ |
|                         |                                                 |
|                         |  [+ + +] Add Indicator (dashed)                |
+------------------------+-------------------------------------------------+
```

With **Indicator Context Panel** open (slides from right, 300px):

```
+------- center panel --------+  +---- context panel (300px) -----+
| (cards visible, dimmed)     |  | INDICATOR CONTEXT          [X] |
|                             |  | ------------------------------ |
|                             |  | SUCCESS INDICATOR TEXT         |
|                             |  | [1 plantilla prepared with     |
|                             |  |  3-4 minor errors on the       |
|                             |  |  26th day after instruction__] |
|                             |  | TARGET QTY                     |
|                             |  | [1___________________________] |
|                             |  | TARGET TIMELINE                |
|                             |  | [on the 26th day after         |
|                             |  |  instruction________________]  |
|                             |  | BUDGET ALLOTTED P              |
|                             |  | [0.00_______________________]  |
|                             |  |                                |
|                             |  | SUCCESS INDICATOR              |
|                             |  | +----------------------------+ |
|                             |  | | 1 plantilla prepared with  | |
|                             |  | | 3-4 minor errors on the    | |
|                             |  | | 26th day after instruction | |
|                             |  | +----------------------------+ |
+-----------------------------+  +--------------------------------+
```

With **Add Indicator Panel** open (slides from right, 420px):

```
+--- center panel ---+  +-------- add indicator panel (420px) ---------+
|                    |  | New Success Indicator                    [X] |
|                    |  | A. CORE FUNCTIONS                            |
|                    |  | -------------------------------------------- |
|                    |  | SUCCESS INDICATOR NAME                       |
|                    |  | +------------------------------------------+ |
|                    |  | | Describe the measurable outcome for this  | |
|                    |  | | unit... (textarea, blue border, 4 rows)   | |
|                    |  | +------------------------------------------+ |
|                    |  |                                              |
|                    |  | BUDGET ALLOTTED                              |
|                    |  | [P | 0.00                                  ] |
|                    |  |                                              |
|                    |  | TARGET QUANTITY       TARGET TIMELINE        |
|                    |  | [e.g. 1, 95%, 100%]   [e.g. Q4 2026]        |
|                    |  |                                              |
|                    |  | +------------------------------------------+ |
|                    |  | | * AI BENCHMARK ANALYSIS *                 | |
|                    |  | | Based on 2025 performance, similar        | |
|                    |  | | indicators target 100% completion         | |
|                    |  | | within 5 working days.                    | |
|                    |  | | Apply Suggestion >                        | |
|                    |  | +------------------------------------------+ |
|                    |  |                                              |
|                    |  | (i) Indicators pending Planning Office review|
|                    |  | -------------------------------------------- |
|                    |  |              [CANCEL]  [Create Indicator]    |
+--------------------+  +----------------------------------------------+
```

With **QET Standards Modal** open:

```
+-----------------------------------------------------------------------------------+
| PERFORMANCE STANDARDS                                                        [X]  |
| QET Standards — "1 plantilla prepared with 3-4 minor errors..."                   |
| --------------------------------------------------------------------------------- |
| DIMENSION    | (5) Outstanding | (4) Very Satisf. | (3) Satisf. | (2) Unsat. | (1) Poor |
| ------------ | --------------- | ---------------- | ----------- | ---------- | -------- |
| [check]      | [textarea       | [textarea        | [textarea   | [textarea  | [textarea|
| Quality      |  3 rows]        |  3 rows]         |  3 rows]    |  3 rows]   |  3 rows] |
| ------------ | --------------- | ---------------- | ----------- | ---------- | -------- |
| [lightning]  | [textarea]      | [textarea]       | [textarea]  | [textarea] | [textarea|
| Efficiency   |                 |                  |             |            |          |
| ------------ | --------------- | ---------------- | ----------- | ---------- | -------- |
| [clock]      | [textarea]      | [textarea]       | [textarea]  | [textarea] | [textarea|
| Timeliness   |                 |                  |             |            |          |
| --------------------------------------------------------------------------------- |
|                                                  [Cancel]  [Save Standards]       |
+-----------------------------------------------------------------------------------+
```

Note: rating column headers show a colored number circle (5=green, 4=blue, 3=yellow, 2=orange, 1=red) with label below.

With **Function Modal** open (centered, max 420px):

```
          +------------------------------------+
          | New Function                  [X]  |
          | Add a new function group           |
          | ---------------------------------- |
          | FUNCTION NAME                      |
          | [e.g. A. CORE FUNCTIONS_________]  |
          |                                    |
          | TYPE              WEIGHT %         |
          | [Core v]          [e.g. 80_______] |
          | ---------------------------------- |
          |             [Cancel]  [Add Function]|
          +------------------------------------+
```

---

## Frame 2 — Tablet (768-1023px)

```
+--------------------------------------------------------+
| <-  |  Draft: FY 2026 Annual Performance Period        |
|                                   [Save Draft] [Submit]|
+--------------------------------------------------------+
| [A. CORE FUNCTIONS v]  >  [RECRUITMENT, SELECTION... v]|  <- breadcrumb row, sticky
+--------------------------------------------------------+
|                                                        |
| RECRUITMENT, SELECTION AND PLACEMENT (RSP)             |
| ---------------------------------------- 8 Indicators  |
|                                                        |
| +----------------------------------------------------+ |
| | 1 plantilla prepared with 3-4 minor errors on the  | |
| | 26th day after instruction                         | |
| | [B] P0.00                                          | |
| | [Assign]   [QET Standards]                  [...]  | |
| +----------------------------------------------------+ |
|                                                        |
| +----------------------------------------------------+ |
| | 100% legal opinions rendered within 5 working days | |
| | upon receipt of request                            | |
| | [B] P120,000.00  .  [AN][CR]+1                     | |
| | [Assign]   [QET Standards]                  [...]  | |
| +----------------------------------------------------+ |
|                                                        |
| [+ + +] Add Indicator (dashed)                        |
+--------------------------------------------------------+
```

**Right MFO pill tapped — inline dropdown (no overlay, no backdrop):**

```
| [A. CORE FUNCTIONS v]  >  [RECRUITMENT, SELECTION... v] |
|                           +------------------------+     |
|                           | * RECRUITMENT, SEL...  |     |  <- checked, blue
|                           |   PERSONNEL BENEFITS.. |     |
|                           |   PERSONNEL RELATIONS. |     |
|                           |   HUMAN RESOURCE DEV.. |     |
|                           |   PERFORMANCE MGMT.... |     |
|                           | + Add MFO / PPA        |     |
|                           +------------------------+     |
```

**Left Function pill tapped — inline dropdown:**

```
| [A. CORE FUNCTIONS v]  >  [RECRUITMENT... v]            |
| +--------------------+                                   |
| | * A. CORE FUNC...  |  <- checked, blue                |
| |   B. SUPPORT FU... |                                   |
| | + Add Function     |                                   |
| +--------------------+                                   |
```

**QET Standards — centered modal, table horizontally scrollable:**

```
+--------------------------------------------------------+
| PERFORMANCE STANDARDS                            [X]   |
| QET Standards — "1 plantilla prepared with..."         |
| ------------------------------------------------------ |
|  <- swipe table right to see all 5 rating columns ->   |
| DIMENSION  | (5) Outstanding | (4) Very Sat. | ...     |
| [check] Q  | [textarea]      | [textarea]    | ...     |
| [light] E  | [textarea]      | [textarea]    | ...     |
| [clock] T  | [textarea]      | [textarea]    | ...     |
| ------------------------------------------------------ |
|                          [Cancel]  [Save Standards]    |
+--------------------------------------------------------+
```

**Indicator Context Panel, Add Indicator, Add MFO** — same right-side slide-in panels as desktop (300px / 420px).

---

## Frame 3 — Mobile (< 768px)

```
+----------------------------------+
| <-  |  Draft: FY 2026            |  <- top bar, NO action buttons
+----------------------------------+
| <- RECRUIT... | PERSONNEL B... ->|  <- sticky MFO tab strip, scrollable
| (underline)                      |     active tab: blue underline + blue text
+----------------------------------+
|                                  |
| RECRUITMENT, SELECTION AND       |
| PLACEMENT (RSP)    8 Indicators  |
| ---------------------------------|
|                                  |
| +------------------------------+ |
| | 1 plantilla prepared with    | |
| | 3-4 minor errors on the 26th | |
| | day after instruction        | |
| | [B] P0.00                    | |
| | [Assign] [QET Standards] ... | |
| +------------------------------+ |
|                                  |
| +------------------------------+ |
| | 100% legal opinions rendered | |
| | within 5 working days upon   | |
| | receipt of request           | |
| | [B] P120,000.00  [AN][CR]+1  | |
| | [Assign] [QET Standards] ... | |
| +------------------------------+ |
|                                  |
| [+ + +] Add Indicator (dashed)   |
|                                  |
+----------------------------------+
|   [Save Draft]      [Submit]     |  <- sticky bottom bar, position fixed
+----------------------------------+
```

**Indicator text tapped — full-screen overlay (no rounded corners):**

```
+----------------------------------+
| INDICATOR CONTEXT           [X]  |
| -------------------------------- |
| SUCCESS INDICATOR TEXT           |
| +------------------------------+ |
| | 1 plantilla prepared with    | |
| | 3-4 minor errors on the 26th | |
| | day after instruction_______ | |
| +------------------------------+ |
| TARGET QTY                       |
| [1___________________________]   |
| TARGET TIMELINE                  |
| [on the 26th day after           |
|  instruction________________]    |
| BUDGET ALLOTTED P                |
| [0.00________________________]   |
|                                  |
| SUCCESS INDICATOR                |
| +------------------------------+ |
| | 1 plantilla prepared with    | |
| | 3-4 minor errors on the      | |
| | 26th day after instruction   | |
| +------------------------------+ |
+----------------------------------+
```

**QET Standards — full-screen, table swipeable:**

```
+----------------------------------+
| PERFORMANCE STANDARDS       [X]  |
| QET Standards —                  |
| "1 plantilla prepared with       |
|  3-4 minor errors..."            |
| -------------------------------- |
| <- swipe right to see all cols-> |
| +------+-------+-------+------+  |
| | DIM  |  (5)  |  (4)  | (3)…|  |
| +------+-------+-------+------+  |
| | [ch] |[text] |[text] |[tex]|  |
| |  Q   |       |       |     |  |
| | [li] |[text] |[text] |[tex]|  |
| |  E   |       |       |     |  |
| | [cl] |[text] |[text] |[tex]|  |
| |  T   |       |       |     |  |
| +------+-------+-------+------+  |
| -------------------------------- |
| [Cancel]    [Save Standards]     |
+----------------------------------+
```

**Add Indicator — full-screen overlay:**

```
+----------------------------------+
| New Success Indicator       [X]  |
| A. CORE FUNCTIONS                |
| -------------------------------- |
| SUCCESS INDICATOR NAME           |
| +------------------------------+ |
| | Describe the measurable      | |
| | outcome for this unit...     | |
| | (textarea, blue border,      | |
| |  4 rows, full width)         | |
| +------------------------------+ |
| BUDGET ALLOTTED                  |
| [P | 0.00                     ]  |
| TARGET QUANTITY  TARGET TIMELINE |
| [e.g. 1, 95%]   [e.g. Q4 2026]  |
| +------------------------------+ |
| | * AI BENCHMARK ANALYSIS *    | |
| | Similar indicators target    | |
| | 100% completion within       | |
| | 5 working days.              | |
| | Apply Suggestion >           | |
| +------------------------------+ |
| (i) Pending Planning Office      |
|     review before approval.      |
| -------------------------------- |
| [CANCEL]    [Create Indicator]   |
+----------------------------------+
```

---

## Responsive Behavior Summary

| Element                    | Desktop                   | Tablet                          | Mobile                          |
|---------------------------|---------------------------|---------------------------------|---------------------------------|
| MFO navigation             | Fixed 270px sidebar       | Breadcrumb pills + dropdown     | Horizontal MFO tab strip        |
| Save Draft / Submit        | Top bar                   | Top bar                         | Sticky bottom bar (fixed)       |
| Indicator cards            | Center panel, full width  | Full width                      | Full width                      |
| Clicking indicator title   | Right panel 300px         | Right panel 300px               | Full-screen overlay             |
| Add Indicator              | Right panel 420px         | Right panel 420px               | Full-screen overlay             |
| Add MFO / Edit MFO         | Right panel 420px         | Right panel 420px               | Full-screen overlay             |
| QET Standards modal        | Centered 860px, scrollable| Centered, h-scrollable table    | Full-screen, h-scrollable table |
| Function modal             | Centered 420px            | Centered 420px                  | Full-screen overlay             |

---

## Implementation Checklist

- [ ] `useBreakpoint()` returns `'mobile' | 'tablet' | 'desktop'`
- [ ] Desktop: fixed 270px left sidebar with Function/MFO tree
- [ ] Tablet: breadcrumb pills row sticky under top bar; inline dropdowns, no drawer, no backdrop
- [ ] Mobile: MFO tab strip sticky under top bar, `overflowX: auto`, `scrollbarWidth: none`
- [ ] Desktop + Tablet: Save Draft + Submit in top bar
- [ ] Mobile: Save Draft + Submit in `position: fixed` bottom bar
- [ ] Context panel + Add Indicator + Add MFO: right-side panels on desktop/tablet; `position: fixed, inset: 0, borderRadius: 0` on mobile
- [ ] QET modal: `overflowX: auto` wrapper + `minWidth: 640px` table on all breakpoints
- [ ] QET modal: centered on desktop/tablet; full-screen on mobile
- [ ] Function modal: centered on desktop/tablet; full-screen on mobile
- [ ] All tap targets >= 44px on mobile
- [ ] No horizontal scroll on page body at any breakpoint
