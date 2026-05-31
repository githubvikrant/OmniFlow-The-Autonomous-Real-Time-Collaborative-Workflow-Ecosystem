# OmniFlow — Challenges & Solutions (Day 1 to Day 7)
## How We Tackled the Hard Problems, Phase by Phase

> **Purpose:** This document captures the genuinely difficult engineering decisions made across Days 1–7 of OmniFlow.  
> For each challenge: what the problem was, why it was hard, and exactly how we solved it.

---

## 📋 Quick Reference Table

| Day | Focus | Key Challenge |
|---|---|---|
| 1 | Backend Architecture | ES Modules + Express 5 wildcard breaking change |
| 2 | MongoDB Schemas | Designing the `order` field for drag-and-drop without knowing the DnD algorithm yet |
| 3 | Authentication | Dual-token strategy — where to store each token, and why |
| 4 | API & Error Handling | Writing `moveTask` without race conditions; route ordering bugs |
| 5 | Next.js Frontend | XSS-safe token storage + Google OAuth token hand-off across a browser redirect chain |
| 6 | Global State & DnD | Optimistic UI with correct rollback — updating UI before the server responds |
| 7 | UI Polish & Dark Mode | DnD broken for card-on-card drops; Drawer animation impossible with mount/unmount |

---

---

## 🟦 Day 1 — System Design & Node.js Architecture

### Challenge 1: ES Modules vs CommonJS — The Ecosystem Choice

**What happened:**  
We chose `"type": "module"` in `package.json` to use ES Module syntax (`import`/`export`). This works great — but it's a commitment. The moment you write `import express from 'express'`, **every file** in the project must be an ES Module. You can't `require()` anything ever again in this project.

**Why it was hard:**  
Most Node.js tutorials, Stack Overflow answers, and older packages still use CommonJS (`require`). Mixing them causes a runtime crash:
```
Error [ERR_REQUIRE_ESM]: require() of ES Module ...
```

**How we handled it:**  
We decided at Day 1 because changing it on Day 8 would break every file. The drivers were:
- **BullMQ v5** (Day 11) and the **OpenAI SDK** (Day 12) are ES Module-only packages. They'd crash with CommonJS.
- **Modern syntax readability** — `import` is cleaner than `require`.
- **No `__dirname`** — In ES Modules, `__dirname` doesn't exist by default. We preemptively noted this for Day 9 (file uploads with Multer) where we'd need `import.meta.url` instead.

The decision cost us nothing on Day 1 but saved us hours of migration on Day 11.

---

### Challenge 2: Express 5 Breaking Change — The `*` Wildcard

**What happened:**  
When setting up the 404 handler (for any unrecognized route), we wrote:
```js
app.all('*', (req, res) => { ... });
```

The server **crashed on startup** with:
```
Error: PathError: Missing parameter name at character 0: *
```

**Why it was hard:**  
Every Express tutorial uses `'*'`. The crash message isn't clear — it says "Missing parameter name" but the route string looks fine. It took research to discover this was an Express 5 change, not a syntax error.

**How we handled it:**  
Express 5 changed the wildcard syntax — the `*` must now be a named parameter:
```js
// ❌ Express 4 (and every tutorial)
app.all('*', handler);

// ✅ Express 5 — the * must be a named segment
app.all('/{*splat}', handler);
```

We updated the handler and documented this in the code as a comment so future contributors (or Day 8's new Socket.IO additions) wouldn't accidentally revert it.

---

### Challenge 3: Why Separate `app.js` from `server.js`?

**The question:** This seems like over-engineering for a single-dev project. Why bother?

**Why it matters:**  
On Day 13 (Testing), Supertest needs to import the Express application object **without** binding to a port. If the server starts listening the moment it's imported, running multiple test files simultaneously causes `Error: EADDRINUSE` (port already in use).

```js
// Day 13 tests — this ONLY works because server.js is separate
import { app } from '../src/app.js';
const request = supertest(app);
await request.post('/api/v1/auth/login').expect(200);
```

**Solution:** `app.js` exports the configured Express app. `server.js` imports it and calls `app.listen()`. Tests import from `app.js`. Production starts via `server.js`. Clean separation, zero extra cost.

---

---

## 🟦 Day 2 — Database Design & MongoDB

### Challenge 1: Designing the `order` Field for Drag-and-Drop We Hadn't Built Yet

**What happened:**  
On Day 2, we hadn't written a single line of frontend code. But we needed to design the Task schema in a way that would support Kanban drag-and-drop ordering — something we wouldn't actually build until Day 6.

**Why it was hard:**  
The wrong design would cascade into rewrites on Days 4 and 6. Two bad options we considered:

- **Option A — No order field.** Sort by `createdAt`. Problem: moving a card would require updating timestamps, which is semantically wrong and fragile.
- **Option B — Array of task IDs in the Board document.** The board stores `{ toDoTasks: [id1, id2, id3], inProgressTasks: [...] }`. Problem: MongoDB has a 16MB document size limit. 1,000 tasks per board approaches that limit.

**How we handled it:**  
We chose the **`order: Number` field on each Task document**:
```js
order: {
  type: Number,
  required: true,
  default: 0,
}
```

Combined with the compound index `{ board: 1, column: 1, order: 1 }`, sorting tasks is always a single indexed query:
```js
Task.find({ board: boardId, column: 'To Do' }).sort({ order: 1 })
```

When a task is moved (Day 4 `moveTask` service), we use MongoDB's `$inc` to shift sibling tasks atomically. The `order` field is the backbone that makes the entire Kanban engine work.

---

### Challenge 2: `select: false` on Password — The Silent Leak

**What happened:**  
During the seed script testing, we queried a user and noticed the full document was returned including the password hash. This is a massive security vulnerability — any unfiltered `User.findOne()` would expose bcrypt hashes.

**Why it was hard:**  
This is easy to miss. The issue only becomes critical when a careless endpoint like `GET /users` is added. By then, it's a deployed vulnerability.

**How we handled it:**  
```js
password: {
  type: String,
  required: true,
  select: false, // ← NEVER returned in any query by default
}
```

The only place that retrieves the password is the login function, which explicitly opts in:
```js
const user = await User.findOne({ email }).select('+password');
```

The `select: false` design means even if a developer adds a new endpoint and forgets to exclude the password, it **cannot be returned**. Security by default, not by vigilance.

---

### Challenge 3: Embedded Comments vs. Separate Collection

**The debate:**  
Comments on tasks — should they live inside the Task document as an embedded array, or in their own `Comments` collection?

**The tension:**  
- **Embedded:** One DB read gets the task AND all its comments. Fast. Simple. But documents can't exceed 16MB, and embedded arrays can't be queried independently.
- **Separate collection:** Scales to millions of comments. But every task detail view requires two DB queries (one for task, one for comments), or a complex aggregation pipeline.

**How we handled it:**  
We chose embedding based on our access patterns:
1. Comments are **always** shown with their parent task — never queried independently.
2. A Kanban task comment thread realistically has fewer than 50 comments.

The 16MB limit is not a real constraint at our scale. We documented the trade-off in the schema file with a comment:
```js
// DESIGN DECISION: Comments embedded (not a separate collection).
// Rationale: Always accessed with parent task. Bounded size (~50 max).
// If OmniFlow scales to 10,000+ comments/task, migrate to a separate collection.
```

---

---

## 🟦 Day 3 — Authentication & Security

### Challenge 1: Where to Store the Access Token

**The security dilemma:**  
Every major option for storing a JWT in the browser has a problem:

| Storage | XSS Vulnerable | CSRF Vulnerable | Survives Refresh |
|---|---|---|---|
| `localStorage` | ✅ Yes — any script can read it | ❌ No | ✅ Yes |
| `sessionStorage` | ✅ Yes — any script can read it | ❌ No | ❌ No |
| Cookie (no HttpOnly) | ✅ Yes | ✅ Yes | ✅ Yes |
| Cookie (HttpOnly) | ❌ No — JS can't read it | ✅ Yes (needs SameSite) | ✅ Yes |
| **Module memory variable** | ❌ No | ❌ No | ❌ No (but refresh cookie handles this) |

**Why this was genuinely hard:**  
There is no perfect option. Every storage mechanism has a trade-off. The industry debate between localStorage and HttpOnly cookies for JWTs has no consensus.

**How we handled it — Dual Token Strategy:**  
We implemented a split strategy:

- **Access token** (15-minute lifetime) → stored in a JavaScript **module-level variable** in `auth.js`.
  - XSS-safe: injected scripts cannot read another module's closure.
  - No CSRF risk: it's never in a cookie.
  - Doesn't survive page refresh → that's solved by the refresh token.

- **Refresh token** (7-day lifetime) → stored in an **HttpOnly cookie**.
  - XSS-safe: JavaScript cannot read `HttpOnly` cookies at all.
  - When the page refreshes, the Axios interceptor silently calls `/auth/refresh-token`, the backend reads the cookie, and issues a new access token.

The 15-minute window on the access token means even if it's somehow compromised, the attacker's window is tiny.

---

### Challenge 2: `findByIdAndUpdate` vs `.save()` for Password Changes

**What happened:**  
Initially, the `changePassword` function used `findByIdAndUpdate()` to update the password field. This was a silent, critical bug: **the new password would be stored in plaintext**.

**Why it was hard:**  
`findByIdAndUpdate()` is the obvious, efficient way to update a single field. The bug is non-obvious because the code "works" — the password gets changed — but without hashing.

**Root cause:**  
Mongoose's pre-save middleware (which bcrypt-hashes the password) **only fires on `.save()`**. It does NOT fire on `findByIdAndUpdate()`, `updateOne()`, or any MongoDB update method.

```js
// ❌ BROKEN — bypasses bcrypt pre-save hook
await User.findByIdAndUpdate(userId, { password: newPassword });
// Stores raw plaintext password in MongoDB!

// ✅ CORRECT — triggers the pre-save bcrypt hook
user.password = newPassword;
await user.save(); // ← pre-save fires here, hashes the password before writing
```

**How we handled it:**  
Always `.save()` when password is involved. We documented this as a project-wide rule in the model file.

---

### Challenge 3: The 5 Security Checks in the `protect` Middleware

**The common mistake:**  
Most auth middleware just verifies the JWT signature:
```js
const decoded = jwt.verify(token, secret);
req.user = decoded; // DONE?
```

**Why this is insufficient:**  
A JWT signature being valid only proves the token was issued by us and wasn't tampered with. It doesn't prove:
- The user hasn't been **deleted** since the token was issued
- The account hasn't been **deactivated** (banned)
- The user hasn't **changed their password** (a security incident)

**How we handled it — 5-layer verification:**
```
1. Token exists in Authorization header?
2. JWT signature valid? (jwt.verify)
3. User still exists in the database?
4. Account is still active?
5. Password changed AFTER the token was issued?
```

The 5th check is the clever one. The `passwordChangedAt` timestamp on the user document lets us invalidate ALL previously issued tokens the moment a user changes their password — a critical security feature for responding to credential compromise without needing a token blacklist.

---

---

## 🟦 Day 4 — Robust API Layer & Error Handling

### Challenge 1: The Route Ordering Bug

**What happened:**  
After implementing the task routes, calling `GET /api/v1/tasks/move` would sometimes return a CastError 400 instead of calling the moveTask handler. The error message said "Invalid _id: move" — Express was treating the string "move" as a MongoDB ObjectId.

**Why it was hard:**  
Express routes are matched in registration order. `/:id` is a catch-all parameter — it matches ANYTHING, including the literal string "move".

```js
// ❌ Wrong order — /:id captures "move" as a parameter
router.route('/:id').get(getTask).patch(updateTask).delete(deleteTask);
router.post('/:id/move', moveTask); // ← NEVER REACHED for "move"

// ✅ Correct — specific literal routes registered BEFORE parameterized routes
router.post('/:id/move', moveTask);  // matches first
router.route('/:id').get(getTask).patch(updateTask).delete(deleteTask);
```

**How we handled it:**  
Always register specific routes before parameterized routes. This is documented as a rule in the router file.

---

### Challenge 2: The `moveTask` Race Condition

**The problem:**  
In the initial implementation of `moveTask`, we used `.save()` to update the moved task's column and order:
```js
task.column = targetColumn;
task.order = newOrder;
await task.save();
```

But we had JUST run `updateMany()` to shift all sibling tasks. If another request modified the `task` document in the 5ms between our `findById` fetch and our `.save()` call, the `.save()` would **overwrite that concurrent change**.

**Why this was hard:**  
Race conditions don't surface in development where you're the only user. They only appear under real concurrent load.

**How we handled it:**  
Replaced `.save()` with `findByIdAndUpdate()` — but ONLY for the moved task itself (not for the sibling shifts):

```js
// ✅ Atomic update — only touches column and order
// Does NOT risk overwriting concurrent changes to title, description, etc.
const movedTask = await Task.findByIdAndUpdate(
  taskId,
  { column: targetColumn, order: newOrder },
  { new: true, runValidators: true }
);
```

`findByIdAndUpdate()` with a targeted `$set` touches only the specific fields, making it safe even under concurrent access.

---

### Challenge 3: The Duplicate Key Error — Pretty vs Raw

**What happened:**  
When a user tried to register with an email that already existed, the API returned MongoDB's raw error:
```json
{ "message": "E11000 duplicate key error collection: omniflow.users index: email_1 dup key: { email: \"test@test.com\" }" }
```

This exposes database internals to the client and looks completely unprofessional.

**Why it was hard:**  
You can't prevent MongoDB from throwing the 11000 error. You can only catch it and transform it.

**How we handled it:**  
The global error handler catches error code `11000` and extracts the field name from `err.keyValue` (a structured object, not by parsing the raw string):

```js
// ❌ Fragile — parses the raw error string (breaks across MongoDB versions)
const field = err.errmsg.match(/(["'])(\.*)\1/)[2];

// ✅ Reliable — uses the structured keyValue object
const field = Object.keys(err.keyValue)[0];
const message = `An account with this ${field} already exists.`;
return new AppError(message, 409);
```

The result: a clean `409 Conflict` with "An account with this email already exists."

---

---

## 🟦 Day 5 — Next.js Frontend & Google OAuth

### Challenge 1: Google OAuth Token Hand-off Across a Browser Redirect

**The problem:**  
OAuth 2.0 works by redirecting the browser — not by making API calls. The flow is:
```
User clicks "Continue with Google"
→ Frontend navigates to: http://localhost:5000/api/v1/auth/google
→ Google shows consent screen
→ Google redirects to: http://localhost:5000/api/v1/auth/google/callback
→ Backend issues JWT, must get it to the frontend somehow
→ Frontend lands at: http://localhost:3000/auth/callback
```

The challenge: **how does the backend hand the access token to the frontend across this redirect chain?** You can't use a JSON response body because the browser is navigating (not fetching). You can't use the HttpOnly cookie for the access token because the frontend needs to read it.

**How we handled it:**  
The backend embeds the short-lived access token (15 minutes) in the redirect URL query string:
```js
// Backend — after OAuth handshake succeeds
const accessToken = signAccessToken(user._id, user.role);
res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${accessToken}`);
```

The frontend `/auth/callback` page immediately:
1. Reads `?token=` from `window.location.search`
2. Stores it in the module-level variable via `setAccessToken()`
3. Clears it from the URL with `window.history.replaceState({}, '', '/auth/callback')` — the token is gone from the address bar and browser history
4. Redirects to `/dashboard`

The 15-minute lifetime makes this window acceptable. The refresh token (longer-lived) traveled safely in the HttpOnly cookie during the backend callback — it never touches the URL.

This is the exact same pattern used by Auth0, Supabase, and GitHub OAuth.

---

### Challenge 2: The Axios Interceptor for Silent Token Refresh

**The problem:**  
The access token expires after 15 minutes. We can't ask the user to log in again every 15 minutes. We need a system that automatically refreshes the token when it expires — invisibly.

**How we handled it:**  
The Axios response interceptor catches every `401 Unauthorized` error and attempts a token refresh before propagating the error to the component:

```js
api.interceptors.response.use(
  (response) => response, // success — pass through unchanged
  async (error) => {
    const original = error.config;
    
    // Only retry once (prevents infinite refresh loops)
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      
      try {
        // The refresh token is in the HttpOnly cookie — browser sends it automatically
        const { data } = await axios.post('/auth/refresh-token', {}, { withCredentials: true });
        setAccessToken(data.accessToken);
        
        // Retry the original request with the new token
        original.headers['Authorization'] = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        // Refresh also failed — truly expired, redirect to login
        clearAccessToken();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

The `_retry` flag prevents infinite loops — if the refresh token itself is expired, we don't keep retrying.

---

### Challenge 3: The Next.js `(auth)` Route Group

**The confusion:**  
We needed `/login` and `/register` to share a layout (a centered form card) while `/dashboard` used a completely different layout (sidebar + main area). In Next.js App Router, every route inherits its nearest `layout.js`.

**Why this was hard:**  
If we put a `layout.js` at the `app/` root that included the auth layout, the dashboard would also get the auth layout. We'd have to create a complex layout that conditionally renders different UIs — messy.

**How we handled it:**  
Next.js App Router's **route groups** — folders wrapped in parentheses `(name)` — let you create a sub-tree of routes that share a layout WITHOUT adding a URL segment:

```
app/
├── (auth)/          ← Route group — no URL segment added
│   ├── layout.js    ← Auth-specific layout (centered form card)
│   ├── login/
│   │   └── page.js  → URL: /login ✅
│   └── register/
│       └── page.js  → URL: /register ✅
└── dashboard/
    ├── layout.js    ← Completely different layout (sidebar + main)
    └── page.js      → URL: /dashboard ✅
```

`/login` and `/register` share the auth layout. `/dashboard` has its own layout. No conditional rendering. Clean and declarative.

---

---

## 🟦 Day 6 — Global State & Optimistic UI

### Challenge 1: Optimistic UI with Correct Rollback

**What we wanted:**  
When a user drags a Kanban card, it should snap to the new column **instantly** — zero latency. The API call happens in the background.

**The challenge:**  
What if the API call fails? The card is already shown in the wrong column. You can't leave the UI in an incorrect state.

**The naive approach (wrong):**  
```js
// Wait for the API, THEN update the UI
const result = await api.post('/tasks/:id/move');
updateLocalState(result.data);
// User sees a 200-300ms delay every single drag. Feels sluggish.
```

**How we handled it — Three-Phase Optimistic Pattern:**

```js
moveTask: async (taskId, newColumn, newOrder) => {
  const { tasks } = get();
  
  // Phase 1 — SNAPSHOT: save current state for rollback
  const previousTasks = [...tasks];
  
  // Phase 2 — OPTIMISTIC: update local state IMMEDIATELY
  // UI re-renders right now, zero waiting
  const updatedTasks = computeNewTaskOrder(tasks, taskId, newColumn, newOrder);
  set({ tasks: updatedTasks });
  
  // Phase 3 — API: fire in background, user doesn't wait
  try {
    await api.post(`/tasks/${taskId}/move`, { targetColumn: newColumn, newOrder });
    // Success — state is already correct, nothing more to do
  } catch (error) {
    // ROLLBACK — restore the snapshot
    set({ tasks: previousTasks });
    // Notify user the move was reverted
    useToastStore.getState().addToast('Failed to move task. Changes reverted.', 'error');
  }
}
```

The card moves at 0ms. The API call happens at ~200ms in the background. If it fails, the card snaps back and shows an error toast. This is exactly how Linear.app and Jira implement their drag-and-drop.

---

### Challenge 2: The 404 Task Fetch Error

**What happened:**  
After building the board page, no tasks appeared even after creating several. The browser Network tab showed a `404` on the tasks request.

**Root cause:**  
The frontend was calling:
```
GET /api/v1/boards/:id/tasks   ← ❌ This route doesn't exist
```

But the backend's actual route was:
```
GET /api/v1/tasks?board=:id    ← ✅ Query parameter, not nested route
```

**Why this happens:**  
REST API design has two valid conventions for nested resources. We used the query-parameter style in the backend. The frontend assumed the nested-route style.

**How we handled it:**  
Updated the `fetchBoardData` function in `boardStore.js`:
```js
// ❌ Wrong
api.get(`/boards/${boardId}/tasks`)

// ✅ Correct
api.get(`/tasks?board=${boardId}`)
```

And added a comment explaining the pattern to prevent future confusion.

---

### Challenge 3: The Flat Task Array vs Nested-by-Column Object

**Design decision:**  
Should the Zustand store hold tasks in a flat array or grouped by column?

```js
// Option A — Grouped object
{
  tasks: {
    "To Do": [task1, task2],
    "In Progress": [task3],
    "Done": [task4]
  }
}

// Option B — Flat array (what we chose)
{
  tasks: [task1, task2, task3, task4]
}
```

**Why grouped is tempting:**  
Direct column access — no filtering needed.

**Why flat is correct:**  
When a task moves from "To Do" to "In Progress", the grouped approach requires:
1. Find and remove the task from `tasks["To Do"]`
2. Add it to `tasks["In Progress"]`
3. Update ordering in both arrays

With a flat array, you just update the one task's `column` property and re-sort. The columnar view is computed at render time with `.filter(t => t.column === col).sort(...)`. Zustand state stays simple; components handle the view logic.

Also critically: **drag-and-drop doesn't know which column a task is in until `handleDragEnd`**. A flat array handles in-progress state transitions trivially.

---

---

## 🟦 Day 7 — UI Polish, Dark Mode & Component Architecture

### Challenge 1: Drag-and-Drop Broken for Card-on-Card Drops

**What happened:**  
Dragging a card from "To Do" and dropping it directly onto another card in "In Progress" did nothing. The card snapped back. Only dropping on the empty space at the bottom of a column worked.

**Root cause:**  
The `closestCorners` collision detection algorithm identifies the closest droppable bounding box corner. When a card is dragged over another card in a different column, the system correctly identifies the TASK as the closest target — but the `handleDragEnd` logic only checked if `over.data.current?.type === 'Column'`. When `type === 'Task'`, it tried to find the task's column... but used the wrong variable, resulting in `undefined` as the target column, and bailing out silently.

**The broken logic:**
```js
const targetColumn = overIsColumn ? over.id : overTask?.column;
// If overTask is in a different column from the dragged task,
// this correctly gets the column name...
// BUT: the overTask lookup was using the wrong 'tasks' reference
// (stale closure from before the optimistic update)
```

**How we handled it:**  
Rewrote the entire collision detection to use a **custom two-algorithm strategy**:

```js
function customCollisionDetection(args) {
  // Step 1: Try pointerWithin — finds the exact element under the cursor
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }
  // Step 2: Fall back to rectIntersection — finds overlapping bounding boxes
  // This handles the empty-column drop case where the pointer is in the
  // column background, not over any specific task
  return rectIntersection(args);
}
```

And fixed `handleDragEnd` to correctly resolve the target column regardless of whether the drop target is a Column or a Task:

```js
const overIsColumn = over.data.current?.type === 'Column';
const overTask = overIsColumn
  ? null
  : tasks.find(t => (t.id || t._id) === overId); // find from CURRENT tasks array

const targetColumn = overIsColumn
  ? overId                    // Column's id IS the column name
  : (overTask?.column ?? draggedTask.column); // fall back to dragged task's column
```

---

### Challenge 2: Drawer Animation Impossible with Mount/Unmount

**What happened:**  
The original Drawer component returned `null` when closed:
```js
if (!isOpen) return null; // ← the problem
return <div className="drawer-overlay">...</div>;
```

We tried to add a CSS animation:
```css
.drawer-content {
  transition: transform 250ms ease;
  transform: translateX(0);
}
```

The animation **never fired**. The drawer just popped in and out instantly regardless of the transition.

**Why this happens:**  
CSS transitions require an element to have a **starting state** before the state change. When you return `null`, the element doesn't exist at all. When `isOpen` becomes `true`, the element is created at `translateX(0)` — there's no "from" state to transition from. The browser sees the element go from nonexistent → at-target, skipping the animation entirely.

**How we handled it:**  
Remove the `return null` pattern entirely. Keep the drawer in the DOM at all times. Use a `data-open` attribute to drive all visual states via CSS:

```jsx
// ❌ Before — no animation possible
if (!isOpen) return null;
return <div className="drawer-overlay">...</div>;

// ✅ After — always in DOM, CSS does the animation
return (
  <div className="drawer-overlay" data-open={isOpen}>
    <div className="drawer-content">...</div>
  </div>
);
```

```css
/* Default (closed) — off-screen to the right, invisible overlay */
.drawer-overlay {
  visibility: hidden;
  background-color: rgb(0 0 0 / 0);
  transition: background-color 250ms, visibility 250ms;
}
.drawer-content {
  transform: translateX(100%);
  transition: transform 250ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Open state — slides into view */
.drawer-overlay[data-open="true"] {
  visibility: visible;
  background-color: rgb(0 0 0 / 0.4);
}
.drawer-overlay[data-open="true"] .drawer-content {
  transform: translateX(0);
}
```

Now the element exists in both states. The transition has a clear "from" (`translateX(100%)`) and "to" (`translateX(0)`). The animation fires correctly.

We also added a **focus trap** so Tab key cycling stays within the open drawer (accessibility), and **focus restoration** so when the drawer closes, keyboard focus returns to the element that opened it.

---

### Challenge 3: Dark Mode Without Breaking Everything

**The requirement:**  
Implement dark mode across the entire app without:
- Adding CSS classes to every component
- Installing Tailwind's `dark:` utilities
- Passing a `theme` prop through every component tree

**Why this is actually hard:**  
React state-based theming (passing `isDark` as a prop or context value) forces every component that uses colors to re-render on theme switch. With 15+ components, that's a lot of prop drilling and a lot of unnecessary renders.

**How we handled it — CSS Custom Properties + `data-theme` Attribute:**

```css
/* :root defines LIGHT MODE as the default */
:root {
  --color-bg: #ffffff;
  --color-text: #0f172a;
  --color-accent: #2563eb;
  /* ...30+ variables */
}

/* [data-theme="dark"] OVERRIDES only what changes */
[data-theme="dark"] {
  --color-bg: #0d1117;
  --color-text: #e6edf3;
  --color-accent: #58a6ff;
  /* ...30+ overrides */
}
```

Every component uses `var(--color-bg)` — never a raw hex. `ThemeProvider.js` does exactly one thing: set `data-theme` on `<html>`.

```js
// ThemeProvider.js — the entire dark mode implementation
document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
localStorage.setItem('omniflow-theme', isDark ? 'dark' : 'light');
```

When the user clicks the toggle:
- One DOM attribute changes on `<html>`
- CSS variables cascade to every element automatically
- Zero React re-renders
- Zero prop drilling
- Preference persists across refresh via `localStorage`

This is how Radix UI, shadcn, and GitHub itself implement dark mode.

---

### Challenge 4: Border Visibility in Light Mode

**What happened:**  
The UI looked "flat" — task cards, columns, and the sidebar all blended together. Users (and reviewers) couldn't visually distinguish UI regions.

**Root cause:**  
The original borders used `1px solid #e5e7eb` on backgrounds of `#f8fafc` and `#ffffff`. The contrast ratio between these two near-white colors was insufficient.

```
#e5e7eb on #f9fafb → Contrast ratio: ~1.1:1 (barely perceptible)
```

**How we handled it:**  
Three changes:

1. **Increased border width** from `1px` to `1.5px` — a subtle but meaningful visual weight increase.

2. **Stronger border color** — added a new token `--color-border-strong: #cbd5e1` (Slate 300, noticeably darker than `#e2e8f0` Slate 200).

3. **Priority left-border system** — instead of colored badges that clutter cards, each card gets a 3px colored left-border driven by a `data-priority` CSS attribute selector:
   ```css
   .kanban-task-card[data-priority="low"]      { border-left-color: #22c55e; }
   .kanban-task-card[data-priority="medium"]   { border-left-color: #eab308; }
   .kanban-task-card[data-priority="high"]     { border-left-color: #f97316; }
   .kanban-task-card[data-priority="critical"] { border-left-color: #ef4444; }
   ```
   
   The component just sets `data-priority={task.priority}`. No conditional `className` strings, no inline styles. Pure, fast CSS.

---

### Challenge 5: The "Full Board Flash" on Task Update

**What happened:**  
When a user edited a task and clicked "Save Changes", the task saved successfully, but the entire Kanban board disappeared for a fraction of a second, showed a "Loading Board..." spinner, and then reappeared. Furthermore, simply opening the task drawer caused a slight frame drop.

**Why it was hard:**  
React performance issues are often death by a thousand cuts. It wasn't one single bug, but a combination of state management patterns that cascaded into full-tree remounts.

**How we handled it (Three-part fix):**  

1. **The Loading Flash (The biggest offender):**  
   After saving a task, the drawer called `fetchBoardData` to sync with the server. `fetchBoardData` started with:
   ```js
   set({ isLoading: true }); // ❌ Caused page.js to render <div className="board-loading">
   ```
   We changed it to only show the spinner on the *initial* load, allowing background refreshes to happen silently:
   ```js
   const isFirstLoad = !get().activeBoard || get().activeBoard._id !== boardId;
   if (isFirstLoad) set({ isLoading: true }); // ✅ Silent refresh
   ```

2. **Zustand Subscription Over-rendering:**  
   Components were pulling the entire store object:
   ```js
   const { openTaskDrawer } = useBoardStore(); // ❌ Subscribes to EVERYTHING
   ```
   If *any* store value changed (even `tasks`), every component re-rendered. We refactored `page.js`, `BoardView.js`, `Column.js`, and `TaskCard.js` to use specific selectors:
   ```js
   const openTaskDrawer = useBoardStore(state => state.openTaskDrawer); // ✅ Safe
   ```

3. **Task Card Memoization:**  
   Even with silent background refreshes, the new data from the API meant new object references for every task. We wrapped `TaskCard` in `React.memo` with a custom `arePropsEqual` function that compares the actual visual data (`title`, `priority`, etc.). Now, when the background refresh completes, React short-circuits the render cycle for all cards except the one that actually changed.

---

---

## 🎓 Cross-Cutting Themes — What These Challenges Teach

Looking across all 7 days, three engineering themes repeat:

### Theme 1: Design for the Future Layer
- **Day 1:** Separated `app.js` from `server.js` for a Day 13 testing benefit we couldn't see yet.
- **Day 2:** Added the `order` field and `aiGenerated` flag for functionality we'd build on Days 6 and 12.
- **Day 3:** Chose the dual-token strategy to protect against Day 10's Redis token blacklist scenario.

> **Principle:** Good architecture anticipates future requirements without over-engineering for them.

### Theme 2: Security as a Default, Not an Afterthought
- `select: false` on passwords (Day 2) — can't accidentally return passwords
- `bcryptjs` instead of `bcrypt` (Day 3) — works in Docker without native bindings
- `findByIdAndUpdate` for race-condition-safe writes (Day 4)
- Module memory for access tokens (Day 5) — XSS-safe by design, not by discipline

> **Principle:** Make the secure thing the easy/default thing. Make the insecure thing impossible.

### Theme 3: Understand the Browser/CSS Runtime, Not Just the JavaScript
- Express 5 wildcard change (Day 1) — framework behavior, not language behavior
- JWT in URL for OAuth (Day 5) — browser navigation vs. API fetching are different
- CSS transition requires existing DOM node (Day 7) — animation fundamentals
- `data-theme` attribute for dark mode (Day 7) — CSS cascade, not JavaScript

> **Principle:** JavaScript frameworks sit on top of the browser platform. Understanding the platform solves problems that framework docs don't address.

---

*Document written on Day 7 — Phase 2 complete.*
