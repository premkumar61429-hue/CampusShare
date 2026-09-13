const express = require("express");
const bcrypt = require("bcryptjs");
const { db } = require("../database/db");
const { sanitizeUser } = require("../middleware/auth");

const router = express.Router();

// POST /api/auth/register
router.post("/register", (req, res) => {
  const { name, email, password, confirmPassword, course = "", semester = "" } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Full name is required." });
  }
  if (!email || !email.trim()) {
    return res.status(400).json({ error: "College email address is required." });
  }
  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long." });
  }

  if (confirmPassword && password !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match." });
  }

  // Check duplicate email
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(cleanEmail);
  if (existing) {
    return res.status(400).json({ error: "An account with this email already exists." });
  }

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const cleanCourse = (course || "").trim() || "B.Tech CSE";
    const cleanSem = (semester || "").trim() || "Semester 1";

    const result = db.prepare(`
      INSERT INTO users (name, email, password, role, course, semester, faculty_id, points)
      VALUES (?, ?, ?, 'student', ?, ?, '', 0)
    `).run(name.trim(), cleanEmail, hashedPassword, cleanCourse, cleanSem);

    const newUser = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
    const safeUser = sanitizeUser(newUser);

    req.session.user = safeUser;
    return res.status(201).json({
      ok: true,
      user: safeUser,
      message: "Student account created successfully."
    });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({ error: "Failed to create account. Please try again." });
  }
});

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { email, password, role = "student", facultyId = "" } = req.body;

  if (!email || !email.trim() || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(cleanEmail);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  if (user.role !== role) {
    return res.status(401).json({
      error: `This account is registered as a ${user.role}. Please use the ${user.role === 'teacher' ? 'Teacher Portal' : 'Student Login'}.`
    });
  }

  // Teacher portal server-side Faculty ID validation
  if (role === "teacher") {
    const cleanFacultyId = (facultyId || "").trim().toUpperCase();
    if (!cleanFacultyId) {
      return res.status(400).json({ error: "Faculty ID is required for teacher login." });
    }
    if ((user.faculty_id || "").trim().toUpperCase() !== cleanFacultyId) {
      return res.status(401).json({ error: "Invalid Faculty ID. Server verification failed." });
    }
  }

  const safeUser = sanitizeUser(user);
  req.session.user = safeUser;

  return res.json({
    ok: true,
    user: safeUser,
    message: `Welcome back, ${user.name}!`
  });
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Could not log out. Please try again." });
    }
    res.clearCookie("connect.sid");
    return res.json({ ok: true, message: "Logged out successfully." });
  });
});

// GET /api/auth/me
router.get("/me", (req, res) => {
  if (!req.session || !req.session.user) {
    return res.json({ user: null });
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.session.user.id);
  if (!user) {
    req.session.destroy(() => {});
    return res.json({ user: null });
  }

  const safeUser = sanitizeUser(user);
  req.session.user = safeUser;
  return res.json({ user: safeUser });
});

module.exports = router;
