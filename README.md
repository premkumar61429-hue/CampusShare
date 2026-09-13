# 🎓 CampusShare Pro — Smart Campus Academic Resource Sharing & Collaboration Platform

> A production-style, full-stack academic resource hub designed for college students and faculty to share, discover, review, approve, and collaborate on study materials, previous year question papers (PYQs), lab manuals, assignments, and campus notices.

---

## 📌 1. Problem Statement

In most colleges and universities, study materials, notes, lab manuals, and previous year question papers are scattered across fragmented channels like WhatsApp groups, Telegram channels, personal Google Drive folders, and local devices. 

Students often struggle to find reliable, high-quality, and verified resources. Meanwhile, faculty members lack an organized platform to review materials, publish course assignments, broadcast notices, and incentivize active student participation.

---

## 💡 2. The Solution: CampusShare Pro

**CampusShare Pro** solves this by providing a unified, role-based platform where:
1. **Students** upload study resources (Notes, PYQs, Lab Manuals, Books, PPTs).
2. **Faculty (Teachers)** review and approve submissions through a dedicated portal, preventing low-quality or inappropriate uploads.
3. **Gamification & Points**: Approved uploads award **+10 points** to the student, unlocking dynamic achievements and moving them up the campus leaderboard.
4. **Collaboration & Community**: Real-time view tracking, like toggles, protected file downloads, upcoming assignment deadlines, and official announcements.

---

## 🚀 3. Technology Stack

- **Frontend**: HTML5, Modern CSS3 (Vanilla design system with CSS custom properties, responsive flex/grid layouts, micro-animations), Vanilla JavaScript (ES6+), Lucide Icons SVG library, Google Fonts (*Plus Jakarta Sans* & *Inter*).
- **Backend**: Node.js, Express.js RESTful API architecture.
- **Database**: SQLite with adaptive engine supporting native Node.js `DatabaseSync` (zero C++ native dependencies) and `better-sqlite3`.
- **Authentication**: Session-based auth using `express-session` and `bcryptjs` password hashing.
- **File Upload & Security**: `multer` with strict MIME-type, extension, and 10 MB size validation, with protected `/api/resources/:id/download` delivery.

---

## 🏛️ 4. System Architecture

```
                               +----------------------------+
                               |     Browser Client         |
                               | (Vanilla SPA + Lucide SVG) |
                               +--------------+-------------+
                                              |
                                              | REST JSON / Form-Data
                                              v
                               +----------------------------+
                               |      Express.js App        |
                               |       (server.js)          |
                               +--------------+-------------+
                                              |
               +------------------------------+-----------------------------+
               |                              |                             |
               v                              v                             v
+-----------------------------+ +---------------------------+ +----------------------------+
|     Auth & Session Layer    | |   Multer File Storage     | |     SQLite Database        |
| (bcryptjs + express-session)| |      (/uploads)           | |  (/data/campusshare.db)    |
+-----------------------------+ +---------------------------+ +----------------------------+
```

---

## 🗄️ 5. Database Schema

The SQLite database (`data/campusshare.db`) is automatically initialized and seeded on first run:

- **`users`**: `id`, `name`, `email`, `password` (bcrypt), `role` ('student' | 'teacher'), `course`, `semester`, `faculty_id`, `points`, `created_at`
- **`resources`**: `id`, `title`, `description`, `subject`, `type`, `file_name`, `original_name`, `file_size`, `uploader_id`, `approved` (0=Pending, 1=Approved, -1=Rejected), `rejection_reason`, `views`, `likes`, `points_awarded`, `created_at`
- **`resource_likes`**: `id`, `user_id`, `resource_id`, `created_at` (UNIQUE constraint prevents multi-likes)
- **`resource_views`**: `id`, `user_id`, `resource_id`, `session_id`, `created_at` (Deduplicated view tracking)
- **`assignments`**: `id`, `title`, `description`, `subject`, `due_date`, `teacher_id`, `created_at`
- **`announcements`**: `id`, `title`, `message`, `teacher_id`, `created_at`
- **`notifications`**: `id`, `user_id`, `title`, `message`, `type`, `is_read`, `created_at`

---

## ⚡ 6. Installation & Quickstart

### Prerequisites
- **Node.js** (v18, v20, v22, or v24+)

### Steps

1. **Clone or navigate to the project directory**:
   ```bash
   cd CampusShare-Pro
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the application**:
   ```bash
   npm start
   ```

4. **Access in Browser**:
   Open **`http://localhost:3000`**

*(On Windows, you can also simply double-click `START-WINDOWS.bat`)*

---

## 🔑 7. Demo Credentials

| Role | Email | Password | Faculty ID | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Student** | `student@campusshare.com` | `student123` | *N/A* | Pre-seeded with 70 points |
| **Faculty (Teacher)** | `teacher@campusshare.com` | `teacher123` | `FAC-1001` | Server-validated Faculty ID |

---

## 📡 8. REST API Documentation

### 🔐 Authentication (`/api/auth`)
- `POST /api/auth/register` — Register new student with password confirmation and course/semester.
- `POST /api/auth/login` — Login as student or teacher (verifies role and Faculty ID on server).
- `POST /api/auth/logout` — Terminate session.
- `GET /api/auth/me` — Return sanitized active user profile.

### 📚 Resources (`/api/resources`)
- `GET /api/resources` — Discover public approved resources with search (`?q=`), subject filter (`?subject=`), type filter (`?type=`), and sort (`?sort=likes|views|newest`).
- `GET /api/resources/:id` — Resource details with deduplicated view counter increment.
- `POST /api/resources` — Multipart file upload (PDF/DOC/DOCX/PPT/PPTX <= 10MB).
- `GET /api/resources/:id/download` — Protected file download.
- `POST /api/resources/:id/like` — Toggle like/unlike with prevention of repeated likes.
- `GET /api/resources/user/my-uploads` — List all user uploads with approval status and feedback.
- `DELETE /api/resources/:id` — Delete uploaded resource and file from disk.

### 👨‍🏫 Teacher Portal (`/api/teacher`)
- `GET /api/teacher/overview` — Faculty dashboard metrics and review queue.
- `GET /api/teacher/resources/pending` — Pending student uploads awaiting review.
- `POST /api/teacher/resources/:id/approve` — Approve resource, award **+10 points** to student uploader, and notify student.
- `POST /api/teacher/resources/:id/reject` — Reject resource with mandatory rejection reason and notify student.
- `GET /api/teacher/students` — Searchable student directory with contribution metrics and points.
- `POST /api/teacher/assignments` — Create coursework assignment and broadcast to students.
- `POST /api/teacher/announcements` — Broadcast official department notices.

### 🏆 Gamification & Updates (`/api`)
- `GET /api/dashboard` — Student dashboard metrics, recent uploads, assignments, and progress.
- `GET /api/leaderboard` — Campus leaderboard ordered by points with active user highlighted.
- `GET /api/achievements` — Dynamic achievements calculated from live database metrics.
- `GET /api/assignments` — Coursework assignments with calculated status: *Overdue*, *Due Soon*, *Upcoming*.
- `GET /api/announcements` — Department announcements timeline.
- `GET /api/notifications` — User notifications and unread counter.
- `POST /api/notifications/read-all` — Mark notifications as read.
- `GET /api/profile` — Full profile summary.

---

## 🔒 9. Security Features

1. **Password Hashing**: Stored using bcrypt with 10 salt rounds.
2. **Faculty ID Validation**: Server-side verification for teacher logins.
3. **Protected Downloads**: Unapproved files cannot be downloaded by the public.
4. **File Validation**: MIME-type, extension, and 10MB file-size checks enforced on the backend.
5. **No Credential Exposure**: Passwords and session secrets are never returned in responses.
6. **XSS & Injection Protection**: HTML output escaping and parameterized SQLite queries.

---

## 🔮 10. Future Scope

- **AI Note Summarizer**: Automatic summary and flashcard generation using Gemini API.
- **OCR Integration**: Text extraction from scanned handwritten notes.
- **Peer Discussion Threads**: Real-time Q&A on resource cards.
- **College Single Sign-On (SSO)**: SAML/OAuth integration with university portals.
- **Push Notifications**: Web push alerts for upcoming assignment deadlines.

---

## 📜 License & Viva Information

Designed for B.Tech Computer Science & Engineering capstone, software engineering lab, and full-stack project demonstrations.
