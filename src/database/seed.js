const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { db, uploadsDir } = require("./db");

function initializeDatabase() {
  // Execute schema definitions
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student', 'teacher')),
      course TEXT DEFAULT '',
      semester TEXT DEFAULT '',
      faculty_id TEXT DEFAULT '',
      points INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      subject TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('Notes', 'PYQ', 'Assignment', 'Lab Manual', 'Book', 'PPT', 'Other')),
      file_name TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      uploader_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      approved INTEGER DEFAULT 0,
      rejection_reason TEXT DEFAULT '',
      views INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      points_awarded INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS resource_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, resource_id)
    );

    CREATE TABLE IF NOT EXISTS resource_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
      session_id TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      subject TEXT NOT NULL,
      due_date TEXT NOT NULL,
      teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed sample files into uploads folder
  function createSampleFile(fileName, contentText) {
    const filePath = path.join(uploadsDir, fileName);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, contentText, "utf8");
    }
  }

  createSampleFile(
    "sample-dbms-unit3-notes.pdf",
    "%PDF-1.4\n1 0 obj\n<< /Title (DBMS Unit 3: Relational Normalization & SQL) /Author (CampusShare) >>\nendobj\nCampusShare Academic Resource - Database Management Systems: BCNF, 3NF, 2NF and Transaction Processing."
  );

  createSampleFile(
    "sample-data-structures-pyq-2025.pdf",
    "%PDF-1.4\n1 0 obj\n<< /Title (Data Structures Previous Year Question Paper 2025) /Author (CampusShare) >>\nendobj\nCampusShare Academic Resource - Data Structures and Algorithms End-Semester Examination Papers with Solutions."
  );

  createSampleFile(
    "sample-os-lab-manual.pdf",
    "%PDF-1.4\n1 0 obj\n<< /Title (Operating Systems Lab Manual) /Author (CampusShare) >>\nendobj\nCampusShare Academic Resource - OS Laboratory Experiments: CPU Scheduling (FCFS, SJF, Round Robin), Semaphore & Deadlock Detection."
  );

  createSampleFile(
    "sample-computer-networks-cheatsheet.pdf",
    "%PDF-1.4\n1 0 obj\n<< /Title (Computer Networks OSI & TCP/IP Quick Revision) /Author (CampusShare) >>\nendobj\nCampusShare Academic Resource - Computer Networks: OSI 7-Layer Model, TCP Handshake, Subnetting and Routing Protocols."
  );

  createSampleFile(
    "sample-ml-handwritten-notes.pdf",
    "%PDF-1.4\n1 0 obj\n<< /Title (Machine Learning Comprehensive Notes) /Author (CampusShare) >>\nendobj\nCampusShare Academic Resource - Supervised vs Unsupervised Learning, Linear Regression, SVM, and Neural Networks."
  );

  // Seed Users
  const checkUser = db.prepare("SELECT id FROM users WHERE email = ?");

  function seedUser(name, email, password, role, course = "", semester = "", facultyId = "", points = 0) {
    const existing = checkUser.get(email.toLowerCase());
    if (!existing) {
      const hashed = bcrypt.hashSync(password, 10);
      const res = db.prepare(`
        INSERT INTO users (name, email, password, role, course, semester, faculty_id, points)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(name, email.toLowerCase(), hashed, role, course, semester, facultyId, points);
      return res.lastInsertRowid;
    }
    return existing.id;
  }

  // Teacher Account (Faculty ID: FAC-1001)
  const teacherId = seedUser(
    "Dr. Arvind Mehta",
    "teacher@campusshare.com",
    "teacher123",
    "teacher",
    "Computer Science & Engineering",
    "Faculty",
    "FAC-1001",
    0
  );

  // Support .local alias as well for legacy references
  seedUser(
    "Dr. Arvind Mehta",
    "teacher@campusshare.local",
    "teacher123",
    "teacher",
    "Computer Science & Engineering",
    "Faculty",
    "FAC-1001",
    0
  );

  // Demo Student Account (70 points)
  const studentRahulId = seedUser(
    "Rahul Sharma",
    "student@campusshare.com",
    "student123",
    "student",
    "B.Tech CSE",
    "Semester 5",
    "",
    70
  );

  seedUser(
    "Rahul Sharma",
    "student@campusshare.local",
    "student123",
    "student",
    "B.Tech CSE",
    "Semester 5",
    "",
    70
  );

  // Additional Leaderboard Students
  const studentAmanId = seedUser(
    "Aman Verma",
    "aman@campusshare.com",
    "student123",
    "student",
    "B.Tech IT",
    "Semester 7",
    "",
    210
  );

  const studentPriyaId = seedUser(
    "Priya Patel",
    "priya@campusshare.com",
    "student123",
    "student",
    "B.Tech CSE",
    "Semester 5",
    "",
    180
  );

  const studentNehaId = seedUser(
    "Neha Gupta",
    "neha@campusshare.com",
    "student123",
    "student",
    "B.Tech ECE",
    "Semester 3",
    "",
    150
  );

  // Seed Resources
  const checkResource = db.prepare("SELECT id FROM resources WHERE title = ?");

  function seedResource(title, description, subject, type, fileName, origName, uploaderId, approved, views, likes, pointsAwarded) {
    if (!checkResource.get(title)) {
      const filePath = path.join(uploadsDir, fileName);
      let size = 1024 * 50;
      try {
        if (fs.existsSync(filePath)) size = fs.statSync(filePath).size;
      } catch (_) {}

      const res = db.prepare(`
        INSERT INTO resources (title, description, subject, type, file_name, original_name, file_size, uploader_id, approved, views, likes, points_awarded)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(title, description, subject, type, fileName, origName, size, uploaderId, approved, views, likes, pointsAwarded);
      return res.lastInsertRowid;
    }
  }

  // Approved Resources
  const r1 = seedResource(
    "DBMS Unit 3: Normalization & Indexing Notes",
    "Comprehensive handwritten lecture notes covering 1NF, 2NF, 3NF, BCNF with solved examination problems and indexing concepts.",
    "DBMS",
    "Notes",
    "sample-dbms-unit3-notes.pdf",
    "DBMS_Unit3_Notes.pdf",
    studentRahulId,
    1,
    142,
    38,
    1
  );

  const r2 = seedResource(
    "Data Structures & Algorithms - PYQ Papers 2024-2025",
    "Previous year solved question papers including Tree Traversals, Graph Shortest Path (Dijkstra), DP and Trie problems.",
    "Data Structures",
    "PYQ",
    "sample-data-structures-pyq-2025.pdf",
    "DSA_EndSem_PYQs.pdf",
    studentAmanId,
    1,
    285,
    64,
    1
  );

  const r3 = seedResource(
    "Operating Systems Complete Lab Manual",
    "Standard lab manual containing C source code for Process Scheduling (FCFS, SJF, RR), Producer-Consumer, and Banker's Algorithm.",
    "Operating System",
    "Lab Manual",
    "sample-os-lab-manual.pdf",
    "OS_Lab_Manual_2025.pdf",
    studentPriyaId,
    1,
    98,
    22,
    1
  );

  const r4 = seedResource(
    "Computer Networks Protocol Quick Reference",
    "Concise study sheets explaining Subnetting, TCP 3-Way Handshake, DNS, DHCP, and HTTP/HTTPS header architectures.",
    "Computer Networks",
    "Notes",
    "sample-computer-networks-cheatsheet.pdf",
    "CN_Quick_Notes.pdf",
    studentNehaId,
    1,
    176,
    45,
    1
  );

  // Pending Resource (Awaiting Teacher Approval)
  seedResource(
    "Machine Learning Unit 1 & 2 Handwritten Notes",
    "Detailed class notes on Supervised Learning, Loss Functions, Gradient Descent and Model Evaluation Metrics.",
    "Machine Learning",
    "Notes",
    "sample-ml-handwritten-notes.pdf",
    "ML_Unit1_2_Notes.pdf",
    studentRahulId,
    0, // Pending
    0,
    0,
    0
  );

  // Seed sample likes if resource IDs exist
  if (r1) {
    try {
      db.prepare("INSERT OR IGNORE INTO resource_likes (user_id, resource_id) VALUES (?, ?)").run(studentAmanId, r1);
      db.prepare("INSERT OR IGNORE INTO resource_likes (user_id, resource_id) VALUES (?, ?)").run(studentPriyaId, r1);
    } catch (_) {}
  }

  // Seed Announcements
  const checkAnnouncement = db.prepare("SELECT id FROM announcements WHERE title = ?");
  function seedAnnouncement(title, message, tId) {
    if (!checkAnnouncement.get(title)) {
      db.prepare(`
        INSERT INTO announcements (title, message, teacher_id)
        VALUES (?, ?, ?)
      `).run(title, message, tId);
    }
  }

  seedAnnouncement(
    "Mid-Term Examination Schedule & Syllabus Notification",
    "The Mid-Term theory examinations for 3rd and 5th semester CSE/IT will commence from next Monday. Please review the updated syllabus and PYQs in the Resource Library.",
    teacherId
  );

  seedAnnouncement(
    "Guest Lecture: Cloud Infrastructure & DevOps on Friday",
    "Department of CSE is organizing an industry expert session on AWS Cloud Architecture and CI/CD pipelines this Friday at 2:00 PM in Seminar Hall 1.",
    teacherId
  );

  // Seed Assignments (Upcoming, Due Soon, and Past)
  const checkAssignment = db.prepare("SELECT id FROM assignments WHERE title = ?");
  function seedAssignment(title, description, subject, dueDate, tId) {
    if (!checkAssignment.get(title)) {
      db.prepare(`
        INSERT INTO assignments (title, description, subject, due_date, teacher_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(title, description, subject, dueDate, tId);
    }
  }

  // Calculate dynamic dates relative to today
  const today = new Date();
  const dueSoonDate = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const upcomingDate = new Date(today.getTime() + 9 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const pastDate = new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  seedAssignment(
    "DBMS Assignment 2: SQL Joins, Aggregations & Subqueries",
    "Submit SQL queries and query execution explain plans for the provided University schema. Include normalization step proofs.",
    "DBMS",
    dueSoonDate,
    teacherId
  );

  seedAssignment(
    "Operating Systems Mini-Project: CPU Scheduling Simulator",
    "Develop a simulator in C/C++/Java implementing FCFS, Non-preemptive SJF and Round Robin scheduling algorithms with turnaround and waiting time tables.",
    "Operating System",
    upcomingDate,
    teacherId
  );

  seedAssignment(
    "Data Structures Lab Assignment 1: Self-Balancing AVL Trees",
    "Implement insertion and deletion operations with LL, RR, LR, and RL rotation routines.",
    "Data Structures",
    pastDate,
    teacherId
  );

  // Seed initial notification for demo student
  const checkNotif = db.prepare("SELECT id FROM notifications WHERE user_id = ?");
  if (!checkNotif.get(studentRahulId)) {
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, ?)
    `).run(
      studentRahulId,
      "Resource Approved! 🎉",
      "Your uploaded resource 'DBMS Unit 3: Normalization & Indexing Notes' has been approved by Dr. Arvind Mehta. You earned +10 points!",
      "approval"
    );
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, ?)
    `).run(
      studentRahulId,
      "New Assignment Posted",
      "Dr. Arvind Mehta posted 'DBMS Assignment 2: SQL Joins, Aggregations & Subqueries'. Due date: " + dueSoonDate,
      "assignment"
    );
  }

  console.log("✓ Database schema verified and seed data initialized.");
}

module.exports = { initializeDatabase };
