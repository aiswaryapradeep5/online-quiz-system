# Online Quiz System (Node.js + Express + MySQL)

A backend-intensive online quiz platform with server-controlled timing,
secure answer storage, admin quiz management, and a static
HTML/CSS/JS frontend.

## Stack
- **Backend:** Node.js, Express.js
- **Database:** MySQL (normalized schema, foreign keys, joins)
- **Auth:** JWT (bcrypt-hashed passwords, role-based: `user` / `admin`)
- **Frontend:** Plain HTML/CSS/JS (no framework)

## Features
- JWT auth with `user` and `admin` roles
- Admin CRUD for quizzes, questions, and options
- **Server-controlled timing** — quiz attempts are stamped with `started_at`
  on the server; expiry is enforced server-side regardless of client clock
- **Secure question/answer storage** — answer keys (`is_correct`) are NEVER
  sent to non-admin users; scoring happens entirely on the server
- Score calculation + persistent results (`attempts` + `attempt_answers`)
- Pagination, filtering on quiz listing
- Joi validation, centralized error handler, parameterized SQL

## Project structure
```
server/
  src/
    config/db.js              MySQL pool
    controllers/              auth, quiz, attempt, admin
    middleware/               auth, role, error handler
    routes/                   /api/auth /api/quizzes /api/attempts /api/admin
    validators/               Joi schemas
    utils/                    jwt, asyncHandler, ApiError
    app.js, server.js
  sql/schema.sql              tables, constraints, seed admin
  .env.example
client/
  index.html                  login / register
  pages/quizzes.html          browse quizzes
  pages/quiz.html             take a quiz (timer)
  pages/result.html           score + per-question review
  pages/admin.html            admin dashboard
  css/styles.css
  js/                         api.js, auth.js, quizzes.js, quiz.js, admin.js
```

## Setup

### 1. Database
```sh
mysql -u root -p < server/sql/schema.sql
```
This creates the `quiz_app` database, all tables, and a seed admin
(`admin@quiz.local` / `Admin@123`).

### 2. Backend
```sh
cd server
cp .env.example .env        # then fill in MySQL creds + JWT_SECRET
npm install
npm run dev                 # http://localhost:4000
```

### 3. Frontend
Serve the `client/` folder with any static server, e.g.
```sh
cd client
npx serve -l 5173
```
Open http://localhost:5173. The API base URL is set in `client/js/api.js`.

## Notable design choices
- **Server-side timing:** `attempts.started_at` + `quizzes.duration_seconds`
  determine `expires_at`. Submissions after expiry are rejected.
- **Answer secrecy:** `GET /api/quizzes/:id/play` returns questions and
  options *without* `is_correct`. Only admins ever see correct answers.
- **Scoring:** done in a single SQL pass joining `attempt_answers` against
  the option key, then written back to `attempts.score`.
- **Normalization:** users, quizzes, questions, options, attempts,
  attempt_answers — all separate tables with FK constraints + cascading
  deletes where appropriate.

## API summary
- `POST /api/auth/register` `{email,password,name}`
- `POST /api/auth/login` → `{token, user}`
- `GET  /api/quizzes?page=&limit=&search=`
- `POST /api/attempts/start` `{quizId}` → `{attemptId, expiresAt, questions}`
- `POST /api/attempts/:id/submit` `{answers:[{questionId,optionId}]}` → `{score,total,details}`
- `GET  /api/attempts/me`
- **Admin** (`role=admin` required):
  - `POST/PUT/DELETE /api/admin/quizzes[/:id]`
  - `POST/PUT/DELETE /api/admin/questions[/:id]`
  - `GET  /api/admin/quizzes/:id/full`

## License
MIT
