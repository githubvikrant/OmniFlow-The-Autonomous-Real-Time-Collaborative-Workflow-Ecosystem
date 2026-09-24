# OmniFlow — Project Interview Sheet
### The Autonomous Real-Time Collaborative Workflow Ecosystem

> **Your Revision Bible** — Read this before every interview. Don't memorize code. Understand the story.

---

---

# SECTION 1 — ONE-LINE DESCRIPTION

> **OmniFlow is a real-time collaborative Kanban board application — like Trello or Jira — where multiple users can manage tasks together and see each other's changes instantly without refreshing the page.**

---

# SECTION 2 — YOUR 30-SECOND ELEVATOR PITCH

> *Memorize this. Say it without thinking.*

"I built OmniFlow — a full-stack, real-time collaborative project management tool similar to Trello. It allows teams to create Kanban boards, manage tasks with drag-and-drop, and collaborate in real-time — meaning when one user moves a card, every other user on the same board sees it instantly. I built the backend with Node.js, Express, and MongoDB, and the frontend with Next.js. I implemented JWT-based authentication including Google OAuth, WebSocket communication using Socket.IO for real-time sync, file attachments via Cloudinary, and an AI-powered task generator using Google Gemini. The app is fully Dockerized and deployed on Vercel and Render."

---

# SECTION 3 — YOUR 2-MINUTE EXPLANATION

> *Use this when an interviewer says: "Tell me about your project."*

"OmniFlow is a real-time collaborative Kanban board — think of it as a Trello clone but with more engineering depth. The core problem it solves is team task management: multiple people working on the same board, seeing changes in real-time without any page refresh.

Here's how it works at a high level:

A user registers or signs in with Google OAuth. After login they land on a dashboard where they see all their boards. They can create a new board, which comes with default columns — To Do, In Progress, Review, and Done. Inside a board they can create tasks, drag and drop them between columns, upload file attachments, and assign priorities.

The real-time part is the core feature. I used Socket.IO — a WebSocket library — so when User A drags a card from 'To Do' to 'In Progress', all other users currently viewing that same board see the card move instantly. I also built a live presence system that shows avatars of who is currently online on the board.

I added an AI task generator powered by Google Gemini — the user types a high-level goal like 'Build a user authentication system' and the AI breaks it down into multiple sub-tasks and adds them to the board automatically.

On the backend I followed a clean layered architecture: Routes → Controllers → Services → Models. The controller only handles HTTP request/response. All business logic lives in the service layer. This makes the code testable and maintainable.

Security-wise I implemented JWT authentication with a dual-token strategy — a short-lived access token in memory and a long-lived refresh token in an HttpOnly cookie. The app is deployed with Docker and hosted on Vercel (frontend) and Render (backend)."

---

# SECTION 4 — PROBLEM STATEMENT

**What problem does OmniFlow solve?**

Teams working on projects need a shared workspace to track who is doing what, what stage tasks are in, and what is pending. Existing tools like Trello are powerful but building one from scratch allows you to demonstrate full-stack engineering skills including real-time communication, authentication, AI integration, file handling, and production deployment — all in one project.

**The specific engineering challenges that make this project non-trivial:**
1. Real-time synchronization across multiple browser clients without page refresh
2. Secure stateless authentication that survives page refreshes (JWT + cookie strategy)
3. Drag-and-drop with optimistic UI that rolls back on server failure
4. AI integration that generates structured data from natural language
5. File uploads streamed directly to cloud storage
6. Role-based access control at both the global and board level

---

# SECTION 5 — FEATURES (What I Built)

| # | Feature | What it does |
|---|---------|-------------|
| 1 | **Kanban Boards** | Create boards with customizable columns (To Do, In Progress, Review, Done) |
| 2 | **Task Management** | Create, edit, and delete tasks with title, description, priority, and column |
| 3 | **Real-Time Drag & Drop** | Drag cards between columns; all connected users see the move instantly |
| 4 | **Live Presence** | See avatars of who is currently viewing the same board |
| 5 | **JWT Authentication** | Secure login with email/password and auto-refresh token system |
| 6 | **Google OAuth** | Sign in with Google using the OAuth 2.0 Authorization Code flow |
| 7 | **File Attachments** | Upload images, PDFs, documents to tasks via Cloudinary |
| 8 | **AI Task Generation** | Type a goal, Google Gemini breaks it into actionable sub-tasks |
| 9 | **Admin Portal** | View all users, manage roles, blacklist accounts, see ecosystem stats |
| 10 | **Dark/Light Mode** | Theme toggle with CSS variables persisted across sessions |
| 11 | **Forgot/Reset Password** | Email-based password reset with a 10-minute expiry token |
| 12 | **Docker Deployment** | Fully containerized with Docker and Docker Compose |
| 13 | **Team Collaboration** | Add members to a board by email; board-level role system |
| 14 | **Share Board** | Share board with specific users or via invite link |

---

# SECTION 6 — TECH STACK

## Backend
| Technology | Version | Why I Used It |
|------------|---------|---------------|
| **Node.js** | v22+ | JavaScript runtime for the server — same language as frontend |
| **Express.js** | v5 | Minimal, flexible HTTP framework; routes, middleware, error handling |
| **MongoDB** | Atlas | Document database; perfect for flexible task/board schemas |
| **Mongoose** | Latest | ODM that gives schemas, validation, middleware hooks, and virtuals |
| **Socket.IO** | Latest | WebSocket library with rooms, reconnection, and fallback to HTTP polling |
| **Passport.js** | Latest | OAuth 2.0 middleware for Google Sign-In |
| **JWT (jsonwebtoken)** | Latest | Stateless authentication tokens |
| **bcryptjs** | Latest | Password hashing (pure JS, no native dependencies) |
| **Multer** | Latest | Multipart file upload middleware |
| **Cloudinary SDK** | Latest | Cloud storage for uploaded files |
| **Google Gen AI SDK** | Latest | Gemini AI API integration |
| **Helmet** | Latest | Sets ~15 security HTTP headers automatically |
| **CORS** | Latest | Cross-Origin Resource Sharing for frontend-backend communication |
| **Morgan** | Latest | HTTP request logger in development |
| **Cookie-Parser** | Latest | Reads HttpOnly refresh token cookie |
| **Docker** | Latest | Containerization for consistent deployment |

## Frontend
| Technology | Version | Why I Used It |
|------------|---------|---------------|
| **Next.js** | 15 (App Router) | React framework with file-based routing; supports SSR and client components |
| **Zustand** | Latest | Lightweight state management; simpler than Redux for this scale |
| **@dnd-kit/core** | Latest | Accessible, modular drag-and-drop library |
| **Socket.IO Client** | Latest | WebSocket client that connects to the backend Socket.IO server |
| **Axios** | Latest | HTTP client with interceptors for auto token refresh |
| **Vanilla CSS** | — | Full control over styling; no framework overhead |

---

# SECTION 7 — WHY EACH TECHNOLOGY? (The "WHY" Table)

| Decision | Why I made it | What was the alternative? |
|----------|--------------|--------------------------|
| **MongoDB over SQL** | Tasks have variable fields (some have attachments, subtasks, comments; others don't). A document model is more natural. Also, embedding comments inside the Task document saves a JOIN. | PostgreSQL — better for strict relational data with complex transactions |
| **Mongoose over raw MongoDB driver** | Schema validation, pre-save hooks (password hashing), virtuals, and populate() for references. Without Mongoose, I'd write all that manually. | Raw MongoDB Node.js driver |
| **Socket.IO over raw WebSockets** | Built-in rooms (board:${id}), automatic reconnection, auth middleware hooks, and graceful fallback to HTTP long-polling for restricted networks. | Raw `ws` library — would need to hand-roll rooms, reconnection, heartbeats |
| **JWT over sessions** | Stateless — no session store needed. Works perfectly across multiple server instances. Scales horizontally. | Express-session with Redis — requires a session store |
| **Dual token strategy** | Access token in memory (15 min) — JS-readable but short-lived. Refresh token in HttpOnly cookie (7 days) — XSS-proof. Neither token alone is enough to cause long-term damage. | Single long-lived token in localStorage — vulnerable to XSS |
| **Zustand over Redux** | Zustand has a much simpler API. No actions, reducers, or boilerplate. For a project this size, Redux would be overkill. | Redux Toolkit — better for very large apps with complex state |
| **@dnd-kit over react-beautiful-dnd** | @dnd-kit is actively maintained, has better performance, native keyboard accessibility, and works in React Strict Mode. react-beautiful-dnd was abandoned. | react-beautiful-dnd (deprecated) |
| **Next.js over Create React App** | File-based routing, App Router, server and client component model, built-in image optimization, and easy Vercel deployment. | Vite + React Router |
| **Cloudinary over S3** | Cloudinary has a generous free tier, built-in image transformations, and a simpler SDK. S3 requires more IAM setup. | AWS S3 — more control, better for high scale |
| **Soft delete (isArchived)** | Permanent deletion destroys data. isArchived: true hides it from normal queries but preserves data for audit/recovery. | Hard delete with cascading Task deletion |
| **Layered architecture** | Controller → Service → Model. Each layer has one responsibility. Business logic in the service makes it testable without spinning up HTTP. | Fat controllers with all logic in route handlers |

---

# SECTION 8 — ARCHITECTURE (Draw This From Memory)

```
                        BROWSER (Next.js)
                              │
                    ┌─────────┴─────────┐
                    │                   │
               HTTP (Axios)       WebSocket (Socket.IO)
                    │                   │
                    ▼                   ▼
         ┌──────────────────────────────────────┐
         │         Node.js HTTP Server           │
         │    (http.createServer wraps both)      │
         │                                       │
         │   ┌─────────────┐  ┌──────────────┐  │
         │   │  Express.js  │  │  Socket.IO   │  │
         │   │  REST API    │  │  /socket.io  │  │
         │   │  /api/v1     │  │              │  │
         │   └──────┬───────┘  └──────┬───────┘  │
         └──────────┼─────────────────┼───────────┘
                    │                 │
            ┌───────▼───────┐ ┌───────▼────────┐
            │  Middleware   │ │  Socket Auth   │
            │ (JWT protect, │ │  Middleware    │
            │  Helmet,CORS, │ │  (same JWT     │
            │  Passport)    │ │   verify)      │
            └───────┬───────┘ └───────┬────────┘
                    │                 │
            ┌───────▼───────┐ ┌───────▼────────┐
            │  Controllers  │ │  Socket Event  │
            │  (auth,board, │ │  Handlers      │
            │  task,admin)  │ │  (join,leave,  │
            └───────┬───────┘ │  disconnect)   │
                    │         └───────┬────────┘
            ┌───────▼───────┐         │
            │   Services    │◄────────┘
            │  (auth,board, │  (services can be called
            │  task,ai)     │   by both HTTP and socket)
            └───────┬───────┘
                    │
            ┌───────▼───────┐
            │    Models     │
            │ (User, Board, │
            │   Task)       │
            └───────┬───────┘
                    │
            ┌───────▼───────┐
            │   MongoDB     │
            │  (Atlas)      │
            └───────────────┘
```

**Key insight about the server:** I use `http.createServer(app)` to create one raw HTTP server and give it to BOTH Express and Socket.IO. This is important because WebSocket connections start as HTTP (the "upgrade" handshake). If Express and Socket.IO were on different servers, CORS and port management would be a nightmare.

---

# SECTION 9 — DATABASE DESIGN

## Collections (Tables in MongoDB)

### USER Collection
```
User {
  _id          ObjectId (PK)
  name         String (required, 2-50 chars)
  email        String (unique, required, lowercase)
  password     String (bcrypt hash, select: false — never returned in queries)
  role         String (enum: 'admin' | 'member' | 'viewer', default: 'member')
  oauthProvider String (enum: 'google' | null)
  oauthId      String (Google's unique user ID)
  isVerified   Boolean (default: false)
  isActive     Boolean (default: true)
  avatar       String (Cloudinary URL)
  passwordChangedAt   Date (used to invalidate old JWTs)
  passwordResetToken  String (hashed SHA-256)
  passwordResetExpires Date (10 min expiry)
  createdAt    Date (auto)
  updatedAt    Date (auto)
}
```

### BOARD Collection
```
Board {
  _id          ObjectId (PK)
  name         String (required, max 100 chars)
  description  String (max 500 chars)
  owner        ObjectId → User (FK)
  members      Array of { user: ObjectId → User, role: 'admin'|'member'|'viewer' }
  columns      Array of String (default: ['To Do', 'In Progress', 'Review', 'Done'])
  color        String (hex color, default: '#6366f1')
  isArchived   Boolean (soft delete flag)
  createdAt    Date (auto)
  updatedAt    Date (auto)
}
```

### TASK Collection
```
Task {
  _id          ObjectId (PK)
  title        String (required, max 200 chars)
  description  String (max 5000 chars)
  board        ObjectId → Board (FK, indexed)
  column       String (e.g., 'In Progress' — matches a value in board.columns)
  order        Number (position within the column for sorting)
  createdBy    ObjectId → User (FK)
  assignees    Array of ObjectId → User
  priority     String (enum: 'low' | 'medium' | 'high' | 'critical')
  status       String (enum: 'open' | 'in_progress' | 'in_review' | 'blocked' | 'done')
  dueDate      Date
  estimate     Number (hours)
  tags         Array of String (max 10)
  attachments  Array of { url, publicId, fileName, fileSize, fileType, uploadedBy, uploadedAt }
  comments     Array of embedded Comment sub-documents
  subtasks     Array of { title, isCompleted, completedAt, assignee }
  aiGenerated  Boolean (true if created by the AI generator)
  aiPrompt     String (the original user prompt that generated this task)
  isArchived   Boolean (soft delete flag)
  createdAt    Date (auto)
  updatedAt    Date (auto)
}

Comment sub-document {
  author       ObjectId → User
  content      String (max 2000 chars)
  attachment   { url, publicId, fileName, fileType }
  createdAt    Date
  updatedAt    Date
}
```

## Relationships
- **User → Board**: One-to-Many (a user can own many boards)
- **Board → Members (Users)**: Many-to-Many (a board has many members; a user can be on many boards) — stored as an embedded array in Board
- **Board → Tasks**: One-to-Many (a board has many tasks; each task belongs to one board)
- **User → Tasks**: Many-to-Many via assignees[] array
- **Task → Comments**: One-to-Many (embedded — avoids a separate collection)

## Why embed Comments in Task instead of a separate collection?
Because for this application scale, we always fetch comments together with the task. Embedding avoids a JOIN (populate). If comments had to be queried independently or paginated for millions of records, a separate collection would make more sense. For now, embedded is simpler and faster.

## Indexes (Performance decisions)
```
User:  { email }            — unique, for login lookup
User:  { oauthProvider, oauthId } — for Google OAuth user lookup

Board: { owner, createdAt: -1 }    — dashboard query
Board: { 'members.user' }           — find boards where user is member
Board: { isArchived }               — filter archived boards

Task:  { board, column, order }     — main Kanban query (most frequent)
Task:  { assignees }                — find tasks assigned to a user
Task:  { dueDate, status }          — find overdue tasks
Task:  { board, aiGenerated }       — find AI-generated tasks
```

---

# SECTION 10 — COMPLETE APPLICATION FLOW (The Story)

## Story Part 1: A New User Arrives

**The user opens the app in their browser.**

1. The Next.js frontend is served from Vercel. The user lands on `/` which immediately redirects to `/login`.
2. The user sees the login page — a clean form with email/password fields and a "Sign in with Google" button.

**The user decides to register with email and password.**

3. They click "Register", fill in name, email, and password, and click submit.
4. **Frontend:** The registration form calls `POST /api/v1/auth/register` via the Axios instance with the form data as JSON.
5. **Backend — Route layer:** The request hits `auth.routes.js` → the `validate(registerSchema)` middleware runs first. It checks: Is the name present? Is the email valid format? Is the password at least 8 characters? If any fail, it throws a 422 error right here — before the controller even runs.
6. **Backend — Controller layer:** `AuthController.register()` receives the validated request. Its only job is to call the service and format the response. No business logic here.
7. **Backend — Service layer:** `AuthService.register()` first checks if an account already exists with that email. If yes → throws a 409 Conflict error. If no → calls `User.create()`.
8. **Backend — Model layer:** Mongoose's `pre('save')` hook fires automatically before the document is saved. It hashes the password with bcrypt (12 salt rounds). The plain-text password is NEVER stored in the database.
9. **Back in the service:** The new user document is returned to the controller.
10. **Back in the controller:** `createAndSendTokens()` is called. This:
    - Signs an **Access Token** (JWT, expires in 15 minutes, contains userId and role)
    - Signs a **Refresh Token** (JWT, expires in 7 days, contains userId only)
    - Sets the refresh token as an **HttpOnly cookie** — JavaScript in the browser CANNOT read this
    - Sends a JSON response with the access token and user data
11. **Frontend:** The Axios response interceptor receives the response. The access token is stored in a JavaScript module-level variable (in memory, NOT localStorage, NOT sessionStorage — because those are vulnerable to XSS). The user is redirected to `/dashboard`.

## Story Part 2: The User Logs In Next Time

**The user comes back the next day. Their access token is gone (it only lives in memory — a page refresh wipes it). But their refresh token cookie is still there.**

12. The user opens the app. Next.js renders the dashboard layout. The `useEffect` in `DashboardLayout` immediately calls `GET /api/v1/auth/me`.
13. The Axios request interceptor tries to attach the access token — but it's empty (memory was cleared on page refresh). So the request goes out with no Authorization header.
14. The backend `protect` middleware sees no token → returns 401.
15. The Axios **response interceptor** catches the 401. It knows: "I should try to refresh the token." It calls `POST /api/v1/auth/refresh-token`. The browser automatically sends the HttpOnly refresh token cookie with this request.
16. The backend reads the refresh token from the cookie, verifies it, confirms the user still exists and is active, and issues a **new access token**.
17. The Axios interceptor stores the new access token in memory, retries the original `/auth/me` request with the new token, and this time it succeeds.
18. The user's profile is loaded and stored in `authStore`. The dashboard renders.

**The user never knew any of this happened. It was completely invisible.**

## Story Part 3: The User Signs In With Google

**A different user prefers Google Sign-In.**

19. They click "Sign in with Google" on the login page. The frontend redirects their browser to `GET /api/v1/auth/google`.
20. **Passport.js** intercepts this route and redirects the browser to **Google's OAuth consent page** — "OmniFlow wants access to your profile and email."
21. The user clicks "Allow". Google redirects the browser back to `GET /api/v1/auth/google/callback?code=xxxxx` with a one-time authorization code.
22. **Passport's Google Strategy** exchanges this code (server-to-server call to Google's token endpoint) for the user's profile data.
23. Our **Passport verify callback** runs: it looks up the user by their Google ID. If the user doesn't exist yet, it creates them (upsert pattern). The user is attached to `req.user`.
24. `AuthController.googleCallback()` runs. It issues OUR JWTs (not Google's tokens). Sets the refresh token cookie with `sameSite: 'lax'` (important: cannot use 'strict' here because the redirect chain crosses domains). Redirects the browser to `http://frontend/auth/callback?token=<accessToken>`.
25. The frontend `/auth/callback` page reads the token from the URL query string, stores it in memory, replaces the URL in history (so the token doesn't stay in the browser history), and redirects to `/dashboard`.

## Story Part 4: Creating a Board

**The user is on the dashboard and clicks "+ New Board".**

26. The frontend sends `POST /api/v1/boards` with `{ name: "New Project", columns: [...] }`.
27. The backend `protect` middleware verifies the JWT from the Authorization header. Decodes it → gets userId and role. Fetches the user from MongoDB (confirming they still exist and are active). Attaches user to `req.user`.
28. `BoardController.createBoard()` passes `req.user._id` and `req.body` to `BoardService.createBoard()`.
29. **Key security decision in the service:** The service **strips the `owner` field from req.body** before creating the board. Why? A malicious user could send `{ "owner": "someOtherUserId" }` in the body to claim ownership of a board they didn't create. The owner is ALWAYS derived from the authenticated user's ID — never from client input.
30. `Board.create()` saves the document. Returns 201 with the board.
31. The frontend receives the new board and immediately navigates to `/dashboard/board/<boardId>`.

## Story Part 5: The Kanban Board Page — Real-Time Begins

**The user arrives at the board page. This is where everything gets interesting.**

32. `BoardView.js` mounts. Two things happen simultaneously:
    - **HTTP:** `boardStore.fetchBoardData(boardId)` fires two parallel API calls with `Promise.all`: `GET /api/v1/boards/:id` (for board metadata) and `GET /api/v1/tasks?board=:id` (for all tasks). Using `Promise.all` means both requests run at the same time — total wait time is the slower of the two, not their sum.
    - **WebSocket:** `socketStore.connect(boardId)` runs. The Socket.IO client connects to the server and sends a JWT in the handshake's `auth.token` field.

33. **On the backend Socket.IO server:**
    - The auth middleware verifies the JWT from the handshake. If invalid → disconnect immediately.
    - If valid → fetches user from DB, attaches `socket.user` with name, initials, color.
    - The `connection` event fires. A handler for `board:join` is registered.

34. **The client emits `board:join` with `{ boardId }`.**
35. **The server's `board:join` handler:**
    - Calls `socket.join("board:688abc123")` — the socket is now in a private room named after the board.
    - Adds the user to the **presence map**: `boardPresence.get(boardId).set(socket.id, socket.user)`.
    - Broadcasts `presence:update` to everyone in the room with the updated list of who is online.

36. **The UI now shows:** The Kanban columns render with tasks sorted by `order`. The presence avatars bar shows who else is viewing the board.

37. **The Axios interceptor enhancement:** Once the socket connects, `socketStore` exposes `socket.id`. A `useEffect` in `BoardView` registers an Axios request interceptor that adds `X-Socket-ID: <socket.id>` to every outgoing API request. This is critical for preventing echo-back (explained in Part 6).

## Story Part 6: Real-Time Drag and Drop

**User A drags a task card from "To Do" to "In Progress". User B is also viewing the same board.**

38. **@dnd-kit detects the drag.** `PointerSensor` has an 8px activation distance, which means the user must drag at least 8px before it registers as a drag (not a click). This prevents accidentally triggering the task detail drawer instead of a drag.

39. **`handleDragStart` fires.** The dragged task is stored in `activeTask` state. The `DragOverlay` component renders a floating "clone" of the card that follows the cursor.

40. **`handleDragEnd` fires.** dnd-kit provides `over` data — what the card was dropped onto. The code checks:
    - Was it dropped on a **Column** droppable? (indicated by `over.data.current.type === 'Column'`)
    - Or was it dropped on another **Task** sortable?
    - This determines `targetColumn` and `newOrder`.

41. **`boardStore.moveTask(taskId, targetColumn, newOrder)` is called. The Optimistic UI Pattern:**
    - **Step 1 — Snapshot:** Save `previousTasks = [...tasks]` for rollback
    - **Step 2 — Optimistic Update:** Immediately update the Zustand store — the card visually snaps to its new column with zero perceived latency. User A sees the move happen instantly.
    - **Step 3 — API Call (background):** `POST /api/v1/tasks/:id/move` fires. It includes `X-Socket-ID: <User A's socket ID>` in the header.
    - **Step 4a — Success:** The server confirmed the move. Nothing more to do — the UI is already correct.
    - **Step 4b — Failure:** Restore `previousTasks`. The card snaps back. Show an error toast.

42. **On the server for the API call:**
    - `TaskController.moveTask()` validates the request, calls `TaskService.moveTask()`.
    - The service re-sequences all sibling tasks in the target column (preventing gaps/conflicts in `order` values).
    - Then it calls `emitTaskMoved(boardId, taskId, targetColumn, newOrder, actorSocketId)`.

43. **`socket.service.js` emitTaskMoved:**
    ```
    io.to("board:688abc123").except(actorSocketId).emit("task:moved", { taskId, targetColumn, newOrder })
    ```
    The `.except(actorSocketId)` is the key part — User A's socket is excluded. User A already updated their UI optimistically. If they received the socket event too, they'd apply the same move twice → visual glitch.

44. **User B's browser receives the `task:moved` event.** The `socketStore` handler fires:
    ```
    store.updateTaskLocally(taskId, { column: targetColumn, order: newOrder })
    ```
    User B's board instantly re-renders with the card in its new position. User B never clicked anything. This is real-time collaboration.

## Story Part 7: Creating a Task and File Attachments

**User A clicks "+ Add Task" in the "In Progress" column.**

45. The `TaskDetailDrawer` opens in **CREATE mode** (because no existing task was passed). The column selector is pre-set to "In Progress" and is enabled (you can change it during creation).
46. User A fills in title, description, priority, clicks "Create Task".
47. `POST /api/v1/tasks` fires with `{ board: boardId, title, description, priority, column: "In Progress" }`.
48. Server validates, creates the task, runs `emitTaskCreated(boardId, task, actorSocketId)`.
49. User A's local store is updated via `addTaskLocally(task)` (called right after the API response — not waiting for a socket event). User B sees the new card appear via the socket event.

**User A then opens an existing task and wants to attach a file.**

50. In the `TaskDetailDrawer` (EDIT mode), the `TaskAttachments` component is shown (it only appears in edit mode — you need an existing task ID).
51. User selects a file. Frontend sends `POST /api/v1/tasks/:id/attachments` as a multipart form with the file.
52. **Multer middleware** (on the backend) intercepts the multipart request. It's configured with Cloudinary storage — Multer streams the file directly to Cloudinary. The file never touches the server's filesystem.
53. Cloudinary returns a URL and `publicId`. These are stored in `task.attachments[]`.
54. The updated task is broadcast via socket so all viewers see the attachment.

## Story Part 8: AI Task Generation

**User B wants to use the AI feature. They open the AI modal and type: "Set up CI/CD pipeline with GitHub Actions".**

55. Frontend sends `POST /api/v1/tasks/generate` with `{ board: boardId, prompt: "Set up CI/CD..." }`.
56. `TaskController.generateTasks()` calls `aiService.generateTasks(prompt)`.
57. **`ai.service.js`** sends the prompt to **Google Gemini (`gemini-2.5-flash`)** with a system prompt instructing it to return a JSON object with a `tasks` array. `responseMimeType: 'application/json'` forces Gemini to return valid JSON (no markdown, no explanation).
58. Gemini responds with something like:
    ```json
    { "tasks": [
      { "title": "Create .github/workflows directory", "description": "...", "priority": "high" },
      { "title": "Write build.yml workflow file", "description": "...", "priority": "high" },
      { "title": "Add test step to pipeline", "description": "...", "priority": "medium" },
      { "title": "Configure secrets in GitHub repository", "description": "...", "priority": "high" }
    ]}
    ```
59. The service parses the JSON. `TaskService.bulkCreateTasks()` inserts all tasks at once into MongoDB with `Task.insertMany()`. Each task gets `aiGenerated: true` and `aiPrompt: <original prompt>`.
60. `emitTasksBulkAdded(board, createdTasks, actorSocketId)` fires. User A (and all other viewers) see multiple new cards appear on the board simultaneously.
61. If the Gemini API fails (bad key, network error, rate limit), the service has a **fallback** that returns hardcoded placeholder tasks so the UI doesn't break during development/demo.

## Story Part 9: User Leaves and Comes Back

**User A closes the browser tab.**

62. The browser WebSocket connection closes. Socket.IO's `disconnect` event fires on the server.
63. The disconnect handler checks `socket.currentBoardId`. It removes User A from the presence map for that board. Broadcasts an updated `presence:update` event. User B's avatar bar updates to show User A is gone.

**The next day, User B's access token has expired.**

64. User B opens the app. Their Axios request gets a 401. The response interceptor silently calls `/auth/refresh-token`. The browser sends the HttpOnly cookie automatically. A new access token is issued. The original request is retried. Everything works. User B never sees a "session expired" error.

**But if User B has been away for more than 7 days, the refresh token itself is expired.**

65. The `/auth/refresh-token` call fails. The response interceptor clears the stale token from memory and redirects to `/login?reason=session_expired`. User B has to log in again — this is expected and correct behavior.

## Story Part 10: The Admin Portal

**An admin user logs in and navigates to the Admin Portal.**

66. The sidebar shows an "🛡️ Admin Portal" link only for users with `role: 'admin'` — this is a frontend UI check. The backend independently enforces this.
67. The admin portal fetches three endpoints in parallel with `Promise.all`:
    - `GET /api/v1/admin/stats` — total users, online users, total boards, total tasks, role distribution
    - `GET /api/v1/admin/users` — all users with their projects, tasks, and online status
    - `GET /api/v1/admin/projects` — all boards with progress percentages

68. **Online user detection:** `getOnlineUserIds()` iterates over all currently connected sockets in the Socket.IO server and extracts unique user IDs. This is real-time — it reflects who is actually connected right now.

69. The admin can **blacklist a user** (set `isActive: false`). The next time that user's JWT is verified by the `protect` middleware, the middleware checks `user.isActive` → `false` → 401 error → user is kicked out. Even if they have a valid JWT, they cannot access the app.

70. The admin can **change a user's role** (promote to admin, demote to viewer). This immediately affects what they can see in the UI and what API calls they can make.

---

# SECTION 11 — API REFERENCE TABLE

## Auth APIs
| Method | Endpoint | Auth | Purpose | Request Body | Success Response |
|--------|----------|------|---------|-------------|-----------------|
| POST | `/auth/register` | None | Create account | `{ name, email, password }` | 201 + accessToken + user |
| POST | `/auth/login` | None | Login | `{ email, password }` | 200 + accessToken + user |
| POST | `/auth/logout` | None | Clear refresh cookie | — | 200 |
| POST | `/auth/refresh-token` | Cookie | Get new access token | — | 200 + accessToken |
| GET | `/auth/me` | JWT | Get my profile | — | 200 + user |
| PATCH | `/auth/change-password` | JWT | Change password | `{ currentPassword, newPassword }` | 200 + new tokens |
| POST | `/auth/forgot-password` | None | Send reset email | `{ email }` | 200 |
| POST | `/auth/reset-password/:token` | None | Set new password | `{ password }` | 200 + tokens |
| GET | `/auth/google` | None | Start Google OAuth | — | Redirect to Google |
| GET | `/auth/google/callback` | None | Google OAuth callback | — | Redirect to frontend |

## Board APIs
| Method | Endpoint | Auth | Purpose | Request Body | Success Response |
|--------|----------|------|---------|-------------|-----------------|
| POST | `/boards` | JWT | Create board | `{ name, description?, columns?, color? }` | 201 + board |
| GET | `/boards` | JWT | Get my boards | — | 200 + boards[] |
| GET | `/boards/:id` | JWT | Get single board | — | 200 + board |
| PATCH | `/boards/:id` | JWT (owner/admin) | Update board | `{ name?, description?, columns?, color? }` | 200 + board |
| DELETE | `/boards/:id` | JWT (owner/admin) | Soft delete board | — | 204 |
| POST | `/boards/:id/members` | JWT (owner/admin) | Add member | `{ email, role? }` | 200 + board |

## Task APIs
| Method | Endpoint | Auth | Purpose | Request Body | Success Response |
|--------|----------|------|---------|-------------|-----------------|
| POST | `/tasks` | JWT | Create task | `{ board, title, column, description?, priority? }` | 201 + task |
| GET | `/tasks?board=:id` | JWT | Get board tasks | Query: `board`, `column?`, `priority?` | 200 + tasks[] |
| GET | `/tasks/:id` | JWT | Get single task | — | 200 + task |
| PATCH | `/tasks/:id` | JWT | Update task | `{ title?, description?, priority?, ... }` | 200 + task |
| POST | `/tasks/:id/move` | JWT | Drag-and-drop | `{ targetColumn, newOrder }` | 200 + task |
| DELETE | `/tasks/:id` | JWT | Delete task | — | 204 |
| POST | `/tasks/:id/attachments` | JWT | Upload file | multipart/form-data | 200 + task |
| DELETE | `/tasks/:taskId/attachments/:attachmentId` | JWT | Delete file | — | 200 + task |
| POST | `/tasks/generate` | JWT | AI generate tasks | `{ board, prompt }` | 201 + tasks[] |

## Admin APIs (role: 'admin' only)
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/admin/stats` | JWT + admin | Ecosystem statistics |
| GET | `/admin/users` | JWT + admin | All users with workloads |
| PATCH | `/admin/users/:id/status` | JWT + admin | Blacklist/reactivate user |
| PATCH | `/admin/users/:id/role` | JWT + admin | Change user role |
| GET | `/admin/projects` | JWT + admin | All boards with progress |

---

# SECTION 12 — IMPORTANT CODE DECISIONS (WHY I Wrote It This Way)

## Decision 1: Password field with `select: false`

```javascript
password: {
  type: String,
  select: false   // ← NEVER returned in queries by default
}
```

**Why?** If `select: false` wasn't there, every single query to User would return the hashed password in the response. You'd have to remember to `.select('-password')` everywhere. This is error-prone — one forgotten `.select` and you're leaking password hashes to the client. By making it opt-out by default, you have to *explicitly* say `.select('+password')` in the login service where you actually need it. This is defensive programming.

## Decision 2: Mongoose pre-save hook for password hashing

```javascript
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordChangedAt = Date.now() - 1000;
});
```

**Why not hash in the service?** Because if I hash in the service, I have to remember to do it every time I create or change a password — in the register service, in the change-password service, in the reset-password service. If I ever miss one, passwords get stored as plain text. The pre-save hook fires automatically whenever the password field changes, regardless of which service saved it. It's one place, one responsibility, impossible to forget.

**Why the `-1000` on `passwordChangedAt`?** JWT creation and password save happen almost simultaneously. Due to millisecond-level timing, a freshly-issued JWT could technically have a timestamp slightly *before* `passwordChangedAt`, making the system think the password was changed after the JWT was issued — invalidating a valid token. Subtracting 1 second gives a safe buffer.

## Decision 3: The dual-token JWT strategy

```
Access Token:  15 minutes, stored in JS memory (module variable)
Refresh Token: 7 days, stored in HttpOnly cookie
```

**Why not one long-lived token?** A long-lived token that gets stolen can be used for days/weeks. With our strategy, even if the access token is stolen (via XSS or network interception), it's only valid for 15 minutes. The refresh token can't be stolen via XSS because HttpOnly cookies are invisible to JavaScript.

**Why not store access token in localStorage?** localStorage is vulnerable to XSS attacks — any injected script can read it. Memory storage only lasts for the page session but is XSS-safe. When the token expires or the page refreshes, the interceptor silently refreshes it from the cookie.

## Decision 4: The X-Socket-ID header pattern

```javascript
// Frontend Axios interceptor:
config.headers['X-Socket-ID'] = socketId;

// Backend controller:
const actorSocketId = req.headers['x-socket-id'] || null;
emitTaskCreated(boardId, task, actorSocketId);

// socket.service.js:
io.to(room).except(actorSocketId).emit('task:created', { task });
```

**Why?** Without this, when User A creates a task:
1. The API call succeeds → user A adds task to their local store ✅
2. Socket broadcasts to everyone in the room INCLUDING User A
3. User A receives their own task:created event → adds the task AGAIN → duplicate card ❌

By excluding the actor's socket from the broadcast, we avoid double-applying the update on the person who initiated it.

## Decision 5: Soft delete with `isArchived: true`

**Why not `Board.findByIdAndDelete()`?**
Hard deletes are irreversible. If a team member accidentally archives the board, it's recoverable. If they hard-delete it, all task data is gone forever. `isArchived: true` hides the board from normal queries but preserves the data. An admin restore endpoint could flip it back. The same pattern applies to tasks.

## Decision 6: Flat tasks array in Zustand (not nested by column)

```javascript
// Flat array:
tasks: [ { _id, title, column: "To Do", order: 0 }, { _id, title, column: "In Progress", order: 0 } ]

// NOT this:
tasks: { "To Do": [...], "In Progress": [...] }
```

**Why flat?** When you drag a task from column A to column B, you're just changing ONE field: `column`. With a flat array, that's one simple map operation. With nested objects, you'd have to splice it out of one array and push it into another — more complex, more error-prone. The columns are derived at render time: `tasks.filter(t => t.column === "To Do")`.

## Decision 7: Two sensors for drag-and-drop

```javascript
useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
```

**PointerSensor:** The 8px distance constraint is critical. Without it, clicking a task card to open the detail drawer would also initiate a drag. The user would lift their finger after a click and dnd-kit would interpret it as a drop — the card would jump around. 8px means the user must intentionally drag before dnd-kit engages.

**KeyboardSensor:** Accessibility. Users who can't use a mouse can still reorganize their board using arrow keys. This is the right thing to do.

## Decision 8: `catchAsync()` utility

```javascript
export const createTask = catchAsync(async (req, res) => {
  // ... if anything throws, it's automatically passed to next(error)
});
```

**Why?** In Express, if an async function throws an error, you must manually catch it and call `next(error)`. Without `catchAsync`, every controller would be wrapped in `try/catch`. `catchAsync` is a higher-order function that wraps the async handler and automatically calls `next(err)` on any thrown error. This sends it to the global error middleware in `app.js`. Cleaner controllers, no forgotten try/catch blocks.

## Decision 9: `boardService` reads before writing for RBAC

```javascript
async updateBoard(boardId, userId, data) {
  const board = await Board.findById(boardId);    // Step 1: Read
  // ... check if userId is owner or admin member  // Step 2: Authorize
  await Board.findByIdAndUpdate(boardId, safeData) // Step 3: Write
}
```

**Why two queries instead of one?** The authorization check requires knowing who the owner is and who the members are — data that only exists after you fetch the board. MongoDB's `findByIdAndUpdate` with a filter condition can't express the logic "update if userId equals owner OR userId is in members with role=admin" without a complex aggregation. Reading first and checking in JavaScript keeps the authorization logic readable, testable, and explicit.

---

# SECTION 13 — AUTHENTICATION FLOW (Deep Dive)

## Email/Password Login Flow

```
User submits email + password
            │
            ▼
POST /api/v1/auth/login
            │
            ▼
validate(loginSchema)  ← Middleware
  - Is email present?
  - Is password present?
  - Is email valid format?
  If any fail → 422 Validation Error
            │
            ▼
AuthController.login()
  - Extract email, password from req.body
  - Call AuthService.login(email, password)
            │
            ▼
AuthService.login()
  - Normalize email (lowercase, trim)
  - User.findOne({ email }).select('+password')
    ← select('+password') because password has select:false
  - If user not found → "Invalid email or password" (same message — prevents email enumeration)
  - If user.password is null → "Use Google Sign-In" (OAuth-only account)
  - await user.comparePassword(password)
    ← bcrypt.compare(candidatePassword, hashedPassword)
  - If mismatch → "Invalid email or password"
  - If user.isActive === false → "Account deactivated"
  - Return user
            │
            ▼
AuthController receives user
  - Call createAndSendTokens(user, 200, res)
            │
            ▼
createAndSendTokens()
  - signAccessToken(userId, role) → JWT (15 min)
  - signRefreshToken(userId) → JWT (7 days)
  - res.cookie('refreshToken', ..., { httpOnly: true, secure, sameSite })
  - res.json({ status: 'success', accessToken, data: { user } })
            │
            ▼
Frontend receives response
  - setAccessToken(accessToken) → stores in memory variable
  - useAuthStore.login(user) → stores user in Zustand
  - router.push('/dashboard')
```

## Token Refresh Flow (Silent Background Process)

```
Any API call with expired access token
            │
            ▼
Backend returns 401 Unauthorized
            │
            ▼
Axios response interceptor catches 401
  - Is this already a retry? (._retry flag) → No
  - Is this the refresh-token endpoint? → No
  - Set originalRequest._retry = true
            │
            ▼
Is another refresh already in progress?
  YES → Queue this request (wait)
  NO  → Set isRefreshing = true
            │
            ▼
POST /api/v1/auth/refresh-token
  ← Browser automatically sends HttpOnly refresh token cookie
            │
            ▼
Backend AuthService.refreshToken()
  - Read token from req.cookies.refreshToken
  - Verify JWT signature
  - Find user by decoded.id
  - Check user.isActive
  - Issue new accessToken
            │
            ▼
Interceptor receives new accessToken
  - setAccessToken(newToken)
  - processQueue(null, newToken) → all queued requests proceed
  - Retry original request with new token
            │
            ▼
Original request succeeds
  ← User never saw any error
```

---

# SECTION 14 — REAL-TIME ARCHITECTURE (Socket.IO Deep Dive)

## How Socket.IO Rooms Work

Every board gets a private Socket.IO room named `board:<boardId>`. When User A is viewing Board X and User B is viewing Board Y, they are in different rooms. Events emitted to Board X's room never reach Board Y's users. This scoping is automatic via Socket.IO's `io.to(room).emit(event, data)`.

## Presence System

```
boardPresence = Map {
  "board-id-1": Map {
    "socket-id-abc": { userId: "u1", name: "Alice", initials: "AL", color: "#3b82f6" },
    "socket-id-def": { userId: "u2", name: "Bob",   initials: "BO", color: "#8b5cf6" }
  }
}
```

Why `socketId` as the key and not `userId`? Because Alice might have the board open in two tabs. Each tab has a different socket. If we keyed by userId, the second tab would overwrite the first and we'd have no way to clean up correctly when one tab closes. By keying on socketId, both connections are tracked independently.

Why deduplicate when broadcasting? When we send the presence list to clients, we deduplicate by userId — we don't want Alice appearing twice in the avatar bar just because she has two tabs open.

## Connection State Recovery

```javascript
connectionStateRecovery: {
  maxDisconnectionDuration: 2 * 60 * 1000 // 2 minutes
}
```

If a user briefly loses their network connection (mobile switching from WiFi to 4G), Socket.IO will buffer any missed events on the server for up to 2 minutes. When the user reconnects, the events are replayed. This prevents the board from showing stale data after a network hiccup.

---

# SECTION 15 — ERROR HANDLING STRATEGY

## Global Error Middleware

All errors in the application flow to one place — `globalErrorHandler` in `app.js`. Here's how:

1. **Validation errors** — thrown by `validate(schema)` middleware → caught by global handler → 422 response
2. **AppError** — custom error class used throughout services → caught → formatted response
3. **Async errors** — wrapped with `catchAsync()` → automatically passed to `next(error)` → caught by global handler
4. **Mongoose validation errors** — detected by type in global handler → formatted as 400
5. **MongoDB duplicate key (11000)** — detected by error code → formatted as 409 Conflict
6. **JWT errors** — detected by name (`JsonWebTokenError`, `TokenExpiredError`) → formatted as 401

## Frontend Error Handling

- **API errors:** Axios interceptor catches 401 → tries to refresh → if fails, redirects to login
- **Move task failures:** Zustand rolls back the optimistic update and shows a toast
- **Form submission errors:** `error.response?.data?.message` shown in a toast notification
- **Socket connection errors:** Logged to console; the Socket.IO client automatically attempts reconnection

---

# SECTION 16 — SECURITY MEASURES

| Security Measure | Where Applied | Why |
|-----------------|--------------|-----|
| **bcrypt (12 rounds)** | User pre-save hook | Slow hashing makes brute-force extremely expensive |
| **JWT with short expiry** | access token 15 min | Limits exposure if token is stolen |
| **HttpOnly cookie** | refresh token | JavaScript cannot read it — XSS-proof |
| **`select: false` on password** | User model | Password hash never accidentally returned in API responses |
| **Helmet.js** | Express middleware | Sets 15 security headers (HSTS, X-Frame-Options, CSP, etc.) |
| **CORS whitelist** | Express CORS middleware | Only our frontend domain can make cross-origin requests |
| **Input validation (Joi/Zod)** | validate middleware | Prevents malformed/malicious input from reaching controllers |
| **Owner field stripped in service** | board.service.js | Prevents privilege escalation via request body |
| **Same error message for login failures** | auth.service.js | Prevents email enumeration attacks |
| **isActive check on every request** | protect middleware | Blacklisted users are immediately denied even with valid JWT |
| **passwordChangedAt invalidation** | protect middleware | Tokens issued before a password change are rejected |
| **JSON size limit** | Express body parser | `limit: '10kb'` prevents JSON bomb attacks |
| **Socket JWT auth middleware** | socket.server.js | WebSocket connections are authenticated the same as HTTP |
| **X-Socket-ID exclusion** | socket.service.js | Actor doesn't receive echo of their own actions |

---

# SECTION 17 — PERFORMANCE DECISIONS

| Decision | Why | Impact |
|----------|-----|--------|
| **MongoDB indexes** | Compound index on `{ board, column, order }` for the main Kanban query | Query doesn't need a full collection scan |
| **`Promise.all` for parallel fetches** | Board + tasks loaded simultaneously on page open | Page load time = max(boardFetch, tasksFetch), not their sum |
| **Flat tasks array** | O(1) column access with `.filter()` vs tree traversal | Simpler rendering, O(n) filtering is fast for task counts |
| **Optimistic UI for drag-and-drop** | UI updates before API confirmation | Zero perceived latency for the acting user |
| **Minimal socket payload for move** | Sends only `{ taskId, targetColumn, newOrder }` — not the full task | Less bandwidth for the most frequent real-time event |
| **Connection state recovery (2 min)** | Buffers events for briefly disconnected users | Users don't see stale boards after brief network drops |
| **Soft delete** | `isArchived: true` instead of `DELETE` + `CASCADE` | Avoids expensive cascading deletes; enables recovery |
| **Gemini `responseMimeType: 'application/json'`** | Forces AI to return valid JSON directly | Eliminates the need for markdown stripping / complex parsing |
| **Single HTTP+WS server** | `http.createServer(app)` shared by Express and Socket.IO | One port, simpler CORS, aligned WebSocket upgrade handling |

---

# SECTION 18 — WHAT I WOULD IMPROVE (If I Had More Time)

| Improvement | Why | How I'd Do It |
|-------------|-----|--------------|
| **Redis for presence/sessions** | In-memory presence breaks if running multiple Node.js instances (horizontal scaling) | Replace `boardPresence` Map with Redis Pub/Sub |
| **JWT blacklist** | Currently logout only clears the cookie. A stolen access token is valid for 15 minutes. | Redis token blacklist — on logout, store the JTI (JWT ID) in Redis with the token's TTL |
| **WebSocket authentication on reconnect** | If access token expires during a long session, the socket becomes unauthenticated | Implement token refresh over the socket connection |
| **Pagination for tasks** | Loading all tasks at once works for small boards but breaks with hundreds of tasks | Cursor-based pagination on GET /tasks |
| **Unit and integration tests** | The project lacks automated tests | Jest for unit tests on services; Supertest for API integration tests |
| **Rate limiting** | No rate limiting on login or AI endpoints — vulnerable to brute force and AI cost abuse | `express-rate-limit` on sensitive routes |
| **Email verification** | `isVerified` field exists in the User schema but the verification flow isn't implemented | Send verification email on register; block login until verified |
| **Audit log** | No record of who changed what, when | Append-only audit collection recording every mutation |
| **Board activity feed** | No activity history visible in the UI | Store board events (task created, moved, etc.) in a separate collection |
| **Collaborative cursor tracking** | Presence shows who is on the board, not what they're looking at | Emit `cursor:moved` events with coordinates (like Figma/Notion) |

---

# SECTION 19 — BUGS & CHALLENGES I FACED

## Challenge 1: The "Echo Back" Problem (Double Optimistic Update)

**Problem:** When I first implemented Socket.IO, every drag-and-drop would cause the card to visually flicker. The card would move, then snap back, then settle. It looked broken.

**Investigation:** I realized what was happening: User A drags a card → optimistic UI update (card moves instantly) → API call fires → socket broadcasts to everyone in the room including User A → User A receives `task:moved` event → applies the move AGAIN to already-updated state → visual glitch.

**Root Cause:** I was broadcasting to the entire room including the actor.

**Solution:** I implemented the `X-Socket-ID` header pattern. The frontend sends its socket ID with every API request. The backend's `socket.service.js` uses `io.to(room).except(actorSocketId).emit(...)`. The actor is excluded from receiving their own events.

**What I learned:** Optimistic UI + real-time sync creates a specific class of bugs — double-application. Whenever you have both optimistic local state updates AND real-time event subscriptions, you need explicit mechanisms to prevent the same action from being applied twice.

## Challenge 2: WebSocket Upgrade vs Express CORS

**Problem:** My Socket.IO client was getting CORS errors even though I had configured CORS on Express.

**Investigation:** I realized I had used `app.listen()` which creates an internal HTTP server that Express manages. Socket.IO was then creating a SEPARATE server — two different servers on the same port (which fails) or two separate ports (which requires two CORS configs).

**Root Cause:** Socket.IO must share the SAME HTTP server instance as Express because WebSocket connections begin as HTTP upgrade requests.

**Solution:** Changed from `app.listen()` to `const httpServer = http.createServer(app)` and passing `httpServer` to both `new Server(httpServer)` (Socket.IO) and `httpServer.listen()`. Now everything goes through one server, one port, one CORS configuration.

## Challenge 3: Google OAuth Cookie Not Being Sent (sameSite Issue)

**Problem:** After Google OAuth login in production (Vercel frontend → Render backend), the refresh token cookie was being set but the frontend was never actually logged in. Subsequent requests returned 401.

**Investigation:** The refresh token was in the cookie (I could see it in DevTools). But when the frontend called `/auth/me`, the browser wasn't sending it.

**Root Cause:** In development, both frontend and backend are on `localhost` — same-site. In production, the frontend is on `vercel.app` and the backend is on `render.com` — cross-site. With `sameSite: 'strict'`, cross-site requests don't include the cookie. With `sameSite: 'lax'`, top-level navigations include the cookie but XHR/fetch requests don't (without `credentials: true`). The issue was also that for `sameSite: 'none'` (required for cross-site cookies), the cookie MUST have `secure: true`.

**Solution:** In production, set `sameSite: 'none'` and `secure: true` on the cookie. On the frontend, ensure `withCredentials: true` is set on the Axios instance. This tells the browser to include cookies in cross-origin requests.

## Challenge 4: The Drag-and-Drop Click vs Drag Conflict

**Problem:** When I implemented drag-and-drop, clicking on a task card to open the detail drawer would instead trigger a drag. The card would "jump" slightly and the drawer wouldn't open.

**Root Cause:** Without an activation constraint, dnd-kit treats any click+release as a drag — the card appears to move to the same position, which looked like a flicker.

**Solution:** Added `activationConstraint: { distance: 8 }` to the PointerSensor. Now a movement of less than 8 pixels is treated as a click, not a drag. The onClick on the task card fires correctly for the drawer.

## Challenge 5: JWT Timing Race Condition (passwordChangedAt)

**Problem:** After changing a password and immediately logging in, the system would sometimes reject the new JWT saying "token issued before password change."

**Root Cause:** The `passwordChangedAt` timestamp and the JWT issue timestamp are both generated within milliseconds of each other. Sometimes the JWT's `iat` (issued at) was fractionally earlier than `passwordChangedAt`.

**Solution:** `this.passwordChangedAt = Date.now() - 1000;` — subtract 1 second from `passwordChangedAt`. This creates a safe buffer: the new JWT's `iat` is always considered newer than `passwordChangedAt`. Simple and effective.

---

# SECTION 20 — TESTING APPROACH

## What I Tested Manually (via Postman / Browser DevTools)

### Auth APIs
| Test Case | Expected | Verified |
|-----------|----------|---------|
| Register with valid data | 201 + tokens | ✅ |
| Register with duplicate email | 409 Conflict | ✅ |
| Register with missing name | 422 Validation | ✅ |
| Register with password < 8 chars | 422 Validation | ✅ |
| Login with correct credentials | 200 + tokens | ✅ |
| Login with wrong password | 401 "Invalid email or password" | ✅ |
| Login with non-existent email | 401 "Invalid email or password" (same message — prevents enumeration) | ✅ |
| Call /auth/me without token | 401 | ✅ |
| Call /auth/me with expired token | 401 → interceptor refreshes → 200 | ✅ |
| Refresh token after 7 days | 401 → redirect to /login | ✅ |
| Forgot password with invalid email | 404 | ✅ |
| Reset password with expired token | 400 Token expired | ✅ |

### Board APIs
| Test Case | Expected | Verified |
|-----------|----------|---------|
| Create board | 201 + board | ✅ |
| Get boards (shows own + member boards) | 200 + array | ✅ |
| Access board you don't own/member of | 403 | ✅ |
| Update board as owner | 200 | ✅ |
| Update board as regular member | 403 | ✅ |
| Delete board → verify it's soft deleted | 204, board.isArchived = true | ✅ |
| Add member with non-existent email | 404 | ✅ |
| Add member who is already a member | 400 | ✅ |

### Task APIs
| Test Case | Expected | Verified |
|-----------|----------|---------|
| Create task without board ID | 400 | ✅ |
| Move task to non-existent column | 400 | ✅ |
| Drag task → other users see it move | Real-time sync verified in two browser tabs | ✅ |
| Delete task → other users see it disappear | Real-time sync verified | ✅ |
| Upload file → verify Cloudinary URL in response | 200 + attachment in task | ✅ |

### Real-Time Tests (Two Browser Tabs)
- Opened same board in Tab A and Tab B
- Dragged card in Tab A → Tab B updated instantly ✅
- Created task in Tab B → Tab A showed new card instantly ✅
- Tab A joined board → Tab B's presence bar showed Tab A's avatar ✅
- Closed Tab A → Tab B's presence bar removed Tab A's avatar ✅

## How I Would Add Automated Tests (If I Had More Time)

**Unit tests with Jest:**
```javascript
// auth.service.test.js
describe('AuthService.login()', () => {
  it('should throw 401 for wrong password', async () => {
    // Mock User.findOne to return a user
    // Mock comparePassword to return false
    await expect(AuthService.login('test@test.com', 'wrongpass')).rejects.toThrow('Invalid email or password');
  });
});
```

**Integration tests with Supertest:**
```javascript
// auth.routes.test.js
describe('POST /api/v1/auth/login', () => {
  it('should return 200 and tokens for valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@test.com', password: 'Password123' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });
});
```

---

# SECTION 21 — DEPLOYMENT

## Development Setup
```
Frontend: npm run dev → http://localhost:3000
Backend:  npm run dev → http://localhost:5000
Database: MongoDB Atlas (cloud)
```

## Production Deployment
```
Frontend: Vercel (Next.js → perfect pairing, auto-deploy from Git)
Backend:  Render (Node.js web service)
Database: MongoDB Atlas (cloud)
Files:    Cloudinary CDN
```

## Docker Setup
```yaml
# Two containers, one network
docker-compose up --build -d
  → omniflow-backend   : Node.js + Express + Socket.IO
  → omniflow-frontend  : Next.js
```

**Key environment variables:**
```
JWT_SECRET          ← Sign JWTs (must be same in both containers)
MONGO_URI           ← MongoDB Atlas connection string
GEMINI_API_KEY      ← Google AI Studio key
CLOUDINARY_*        ← Cloud storage credentials
GOOGLE_CLIENT_ID/SECRET ← OAuth 2.0 credentials
FRONTEND_URL        ← For CORS whitelist and OAuth redirect
```

---

# SECTION 22 — INTERVIEW QUESTIONS & MY ANSWERS

## Basic Questions

**Q: Tell me about your project.**
> Use the 30-second elevator pitch from Section 2. Then expand based on what they want to hear.

**Q: What problem does OmniFlow solve?**
> Teams need a shared workspace to track tasks in real-time. OmniFlow solves real-time collaboration, file management, AI-powered task generation, and secure multi-user access control — all in one tool.

**Q: What was your role?**
> I built the entire project solo — backend REST API, WebSocket server, database design, frontend with drag-and-drop, authentication system, AI integration, file uploads, admin portal, and Docker deployment.

---

## Architecture Questions

**Q: Explain your architecture.**
> I used a layered architecture on the backend: Routes → Middleware → Controllers → Services → Models → MongoDB. The controller handles HTTP request/response. The service has all business logic. The model defines the schema. On the frontend, Next.js handles routing, Zustand manages state, and Socket.IO client handles real-time updates. Both HTTP and WebSocket traffic go through the same Node.js server instance.

**Q: Why did you use MongoDB instead of a relational database?**
> Tasks have variable structure — some have attachments, some have subtasks, some have comments. A document model is a natural fit. Also, I embed comments directly inside the Task document because they're always fetched together. In a relational database, that would require a JOIN on every task fetch. The trade-off is that MongoDB isn't ideal for complex multi-document transactions, but for this application's scale, that's acceptable.

**Q: Why did you separate Controllers from Services?**
> The controller's only job is to speak HTTP — read from req, call the service, write to res. All business logic lives in the service. This means: (1) I can unit test the service without spinning up Express, (2) Socket.IO handlers can call the same service methods without duplicating logic, (3) if we add a GraphQL layer later, it can reuse the same services.

---

## Authentication Questions

**Q: How does authentication work?**
> On login, I issue two JWTs. An access token (15 minutes) stored in JavaScript memory — short-lived, XSS-resistant because it's in memory not localStorage. A refresh token (7 days) stored in an HttpOnly cookie — JavaScript can't read it at all, so XSS can't steal it. The Axios instance has a response interceptor: when any request gets a 401, it silently calls the refresh endpoint, stores the new access token, and retries the original request. The user never sees the expiry.

**Q: Why not store the access token in localStorage?**
> localStorage is accessible to any JavaScript on the page. A successful XSS attack (injected script via a user comment, malicious npm package, etc.) can read localStorage and steal the token. Memory storage is isolated — the token is gone when the tab closes, and injected scripts cannot access module-level variables from another module.

**Q: How does Google OAuth work in your project?**
> It's the Authorization Code flow. User clicks "Sign in with Google" → my backend redirects them to Google's consent page → user approves → Google sends a one-time code to my callback URL → Passport.js exchanges the code for user profile data in a server-to-server call → I upsert the user in MongoDB → issue my own JWTs (not Google's) → set the refresh token cookie → redirect the browser to the frontend with the access token in the URL query string → frontend stores it in memory and removes it from the URL.

**Q: How do you handle token refresh if multiple requests fail simultaneously?**
> The `isRefreshing` flag and `failedQueue` pattern. If 5 API calls all get 401 at the same time, only the first one triggers a refresh. The other 4 are pushed to `failedQueue`. When the refresh succeeds, all 4 queued requests are resolved with the new token and retried. If it fails, all 4 are rejected. This prevents 5 simultaneous refresh requests — what's sometimes called the "thundering herd" problem.

---

## Real-Time Questions

**Q: How does the real-time drag-and-drop work?**
> When a user drags a card, dnd-kit's `onDragEnd` fires with the target column and new position. I call `boardStore.moveTask()` which immediately updates local state (optimistic UI — zero latency for the actor). Simultaneously it fires `POST /api/v1/tasks/:id/move`. When the server processes this, it re-sequences the column order and broadcasts `task:moved` via Socket.IO to everyone in the board's room — except the actor (because they already updated their own UI). Other users' socketStore handlers receive the event and call `updateTaskLocally()`.

**Q: What is optimistic UI?**
> It means updating the local state BEFORE the server confirms the action. The UI feels instant. If the server later rejects the action (network error, validation failure), we roll back to the previous state and show an error. It's the same pattern Jira, Trello, Notion, and Linear use. The trade-off is that you need careful rollback logic — without it, users might see changes that "stuck" even after a failure.

**Q: Why Socket.IO instead of raw WebSockets?**
> Raw WebSockets require you to hand-roll: room/namespace management, reconnection logic, heartbeats, and graceful fallback for restricted networks (corporate firewalls that block WebSocket upgrades). Socket.IO gives all of that out of the box. The trade-off is a slightly heavier library and a proprietary handshake protocol — but for a project at this scale, the developer experience benefit is worth it.

---

## Database Questions

**Q: Explain your database schema.**
> Three main collections. User stores authentication data, OAuth info, and profile. Board stores the board metadata, its columns array, and an embedded members array (each member has a reference to a User and a board-level role). Task stores all task data — which board it belongs to, which column, its order for sorting, and embedded arrays for comments, subtasks, and attachments.

**Q: Why is `password` not returned by default?**
> I set `select: false` on the password field in the Mongoose schema. This means every query to User automatically excludes the hashed password. You have to explicitly write `.select('+password')` to include it — which I only do in the login and change-password services. This prevents accidentally leaking password hashes in API responses.

**Q: What is a soft delete? Why did you use it?**
> Instead of deleting a board or task from the database, I set `isArchived: true`. The document still exists but all normal queries filter it out with `isArchived: false`. Benefits: data is recoverable, you maintain an audit trail, and cascading deletes (which would need to remove all tasks when a board is deleted) are avoided. The trade-off is that the database grows over time and you need periodic cleanup jobs for truly stale archived data.

---

## Performance Questions

**Q: How does drag-and-drop stay fast even with many tasks?**
> Three things: (1) Tasks are stored in a flat array sorted by `order`, not nested by column. Column rendering is `.filter(t => t.column === col)` — O(n) but fast for realistic task counts. (2) Optimistic UI means the user sees the move before the API responds. (3) The socket broadcast payload is minimal — just `{ taskId, targetColumn, newOrder }` — not the full task object. Less data transmitted means faster delivery.

**Q: What would you change if traffic increased 10x?**
> First, I'd add Redis for presence tracking — currently it's in-memory on one Node.js instance, which breaks with horizontal scaling. Second, I'd implement pagination on the tasks API — currently it fetches all tasks for a board at once. Third, I'd add a job queue (BullMQ) for AI task generation so it's non-blocking. Fourth, I'd add rate limiting to prevent API abuse. For the database, MongoDB Atlas auto-shards, so that scales automatically.

---

## Testing Questions

**Q: How did you test your APIs?**
> I tested manually with Postman for every endpoint — happy paths and failure paths. I specifically tested real-time collaboration by opening the same board in two browser tabs and verifying that drag-and-drop, task creation, and deletion all propagated correctly. I also tested the authentication flow by intentionally expiring tokens and verifying the silent refresh mechanism worked.

**Q: What is a happy path vs failure path?**
> Happy path: valid input, expected outcome, success response. For example, POST /auth/login with correct email and password → 200 + tokens. Failure path: all the ways it can go wrong. For login: wrong password → 401, missing email → 422, deactivated account → 401, non-existent email → 401 (same message to prevent enumeration), OAuth account trying password login → 400 with specific guidance. Failure path testing is what separates someone who "got it working" from someone who built something production-quality.

---

## Code Quality Questions

**Q: How do you handle errors consistently?**
> I use a global error middleware in Express that's the single destination for all errors. Every async controller is wrapped in `catchAsync()` which automatically forwards any thrown error to `next(err)`. Services throw typed `AppError` instances with a status code and message. The global handler formats all of them into a consistent response shape: `{ status: 'fail', message: '...' }`. For production, stack traces are hidden from the response.

**Q: What is the `catchAsync` utility?**
> It's a higher-order function: `catchAsync(fn) => (req, res, next) => fn(req, res, next).catch(next)`. It wraps async route handlers so any thrown error or rejected promise automatically calls `next(error)`, which routes to the global error handler. Without it, I'd need a try/catch in every single controller function — repetitive and easy to forget.

---

# SECTION 23 — YOUR 5-MINUTE EXPLANATION (Practice This Out Loud)

"OmniFlow is a full-stack, real-time collaborative project management tool I built from scratch. Think of it as Trello — but I built the whole thing.

The core problem was: how do multiple users collaborate on a shared task board and see each other's changes instantly without refreshing?

I solved this with Socket.IO. Every board gets a private room. When a user drags a card, the backend re-orders the column and broadcasts a socket event to everyone else viewing that board. Their boards update instantly.

For the frontend, I used Next.js with the App Router and Zustand for state management. For drag-and-drop I used the @dnd-kit library. I implemented optimistic UI — when a user drags a card, the local state updates immediately before the server confirms. If the server rejects it, I roll back and show an error toast.

For authentication, I implemented a dual-token JWT strategy. Access tokens are stored in JavaScript memory — they last 15 minutes. Refresh tokens are stored in HttpOnly cookies — JavaScript can't read them at all, which protects against XSS. I also integrated Google OAuth using Passport.js. The Axios instance has a response interceptor that automatically refreshes expired tokens in the background — the user never sees a 'session expired' error.

For file attachments, I used Multer to intercept multipart uploads and stream them directly to Cloudinary — the files never touch the server's filesystem.

I built an AI task generator using Google Gemini. Users type a high-level goal, the AI returns a structured JSON array of sub-tasks, and I bulk insert them and broadcast them to all board members via socket in real-time.

I also built a full Admin Portal where admin-role users can see ecosystem stats, view all users, change roles, and blacklist accounts.

The backend follows a strict layered architecture: Routes, Middleware, Controllers, Services, Models. Controllers only handle HTTP. All business logic lives in the service layer. This makes the code testable and the services reusable by both HTTP controllers and Socket.IO handlers.

The whole thing is Dockerized and deployed on Vercel and Render."

---

*Last updated: 2026-08-31*
*Project: OmniFlow — The Autonomous Real-Time Collaborative Workflow Ecosystem*
*Stack: Node.js, Express, MongoDB, Socket.IO, Next.js, Zustand, @dnd-kit, Gemini AI*
