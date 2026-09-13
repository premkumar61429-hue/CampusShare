const express = require("express");
const { db, uploadsDir } = require("../database/db");
const { requireRole } = require("../middleware/auth");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// Require teacher role for all routes in this file
router.use(requireRole("teacher"));

// GET /api/teacher/overview - Key metrics & overview
router.get("/overview", (req, res) => {
  try {
    const pendingCount = db.prepare("SELECT COUNT(*) AS c FROM resources WHERE approved = 0").get().c;
    const approvedCount = db.prepare("SELECT COUNT(*) AS c FROM resources WHERE approved = 1").get().c;
    const studentCount = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'student'").get().c;
    const totalContributions = db.prepare("SELECT COUNT(*) AS c FROM resources").get().c;
    const totalAssignments = db.prepare("SELECT COUNT(*) AS c FROM assignments").get().c;
    const totalAnnouncements = db.prepare("SELECT COUNT(*) AS c FROM announcements").get().c;

    const pendingList = db.prepare(`
      SELECT 
        r.*, 
        u.name AS uploader_name, u.email AS uploader_email, u.course AS uploader_course, u.semester AS uploader_semester
      FROM resources r
      JOIN users u ON u.id = r.uploader_id
      WHERE r.approved = 0
      ORDER BY r.created_at ASC
      LIMIT 10
    `).all();

    const recentStudents = db.prepare(`
      SELECT 
        u.id, u.name, u.email, u.course, u.semester, u.points, u.created_at,
        (SELECT COUNT(*) FROM resources r WHERE r.uploader_id = u.id) AS uploads_count
      FROM users u
      WHERE u.role = 'student'
      ORDER BY u.created_at DESC
      LIMIT 6
    `).all();

    return res.json({
      stats: {
        pendingCount,
        approvedCount,
        studentCount,
        totalContributions,
        totalAssignments,
        totalAnnouncements
      },
      pendingList,
      recentStudents
    });
  } catch (err) {
    console.error("Teacher overview error:", err);
    return res.status(500).json({ error: "Failed to load teacher dashboard overview." });
  }
});

// GET /api/teacher/resources/pending - List all pending resources
router.get("/resources/pending", (req, res) => {
  try {
    const pending = db.prepare(`
      SELECT 
        r.*, 
        u.name AS uploader_name, u.email AS uploader_email, u.course AS uploader_course, u.semester AS uploader_semester
      FROM resources r
      JOIN users u ON u.id = r.uploader_id
      WHERE r.approved = 0
      ORDER BY r.created_at ASC
    `).all();

    return res.json({ pending });
  } catch (err) {
    console.error("Teacher pending error:", err);
    return res.status(500).json({ error: "Failed to load pending resources." });
  }
});

// POST /api/teacher/resources/:id/approve - Approve resource & award points
router.post("/resources/:id/approve", (req, res) => {
  const resourceId = Number(req.params.id);
  const resource = db.prepare("SELECT * FROM resources WHERE id = ?").get(resourceId);

  if (!resource) {
    return res.status(404).json({ error: "Resource not found." });
  }

  try {
    const shouldAwardPoints = resource.points_awarded === 0;

    // Mark approved
    db.prepare(`
      UPDATE resources 
      SET approved = 1, rejection_reason = '', points_awarded = 1
      WHERE id = ?
    `).run(resourceId);

    // Award +10 points to student uploader ONCE
    if (shouldAwardPoints) {
      db.prepare("UPDATE users SET points = points + 10 WHERE id = ?").run(resource.uploader_id);
    }

    // Send notification to student
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, 'approval')
    `).run(
      resource.uploader_id,
      "Resource Approved! 🎉",
      `Your resource "${resource.title}" was approved by faculty and is now live in the library. ${shouldAwardPoints ? "+10 points awarded!" : ""}`
    );

    return res.json({
      ok: true,
      message: `Resource "${resource.title}" approved successfully. ${shouldAwardPoints ? "+10 points awarded to student." : ""}`
    });
  } catch (err) {
    console.error("Approve resource error:", err);
    return res.status(500).json({ error: "Failed to approve resource." });
  }
});

// POST /api/teacher/resources/:id/reject - Reject resource with mandatory reason
router.post("/resources/:id/reject", (req, res) => {
  const resourceId = Number(req.params.id);
  const { reason } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: "Please provide a reason for rejecting this resource." });
  }

  const resource = db.prepare("SELECT * FROM resources WHERE id = ?").get(resourceId);
  if (!resource) {
    return res.status(404).json({ error: "Resource not found." });
  }

  try {
    const cleanReason = reason.trim();

    db.prepare(`
      UPDATE resources 
      SET approved = -1, rejection_reason = ?
      WHERE id = ?
    `).run(cleanReason, resourceId);

    // Send notification to student
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, 'rejection')
    `).run(
      resource.uploader_id,
      "Resource Review Update ⚠️",
      `Your resource "${resource.title}" was rejected by faculty. Reason: "${cleanReason}"`
    );

    return res.json({
      ok: true,
      message: `Resource marked as rejected.`
    });
  } catch (err) {
    console.error("Reject resource error:", err);
    return res.status(500).json({ error: "Failed to reject resource." });
  }
});

// GET /api/teacher/all-resources - Manage all campus resources (including delete)
router.get("/resources/all", (req, res) => {
  const q = (req.query.q || "").trim();
  const status = req.query.status; // '0', '1', '-1', or undefined

  let sql = `
    SELECT 
      r.*, 
      u.name AS uploader_name, u.email AS uploader_email, u.course AS uploader_course
    FROM resources r
    JOIN users u ON u.id = r.uploader_id
    WHERE 1=1
  `;
  const params = [];

  if (q) {
    sql += ` AND (r.title LIKE ? OR r.subject LIKE ? OR u.name LIKE ?)`;
    const searchPattern = `%${q}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  if (status !== undefined && status !== "" && status !== "all") {
    sql += ` AND r.approved = ?`;
    params.push(Number(status));
  }

  sql += ` ORDER BY r.created_at DESC`;

  try {
    const resources = db.prepare(sql).all(...params);
    return res.json({ resources });
  } catch (err) {
    console.error("Teacher all resources error:", err);
    return res.status(500).json({ error: "Failed to load resources." });
  }
});

// GET /api/teacher/students - Search and filter students directory
router.get("/students", (req, res) => {
  const q = (req.query.q || "").trim();
  const course = (req.query.course || "").trim();

  let sql = `
    SELECT 
      u.id, u.name, u.email, u.course, u.semester, u.points, u.created_at,
      (SELECT COUNT(*) FROM resources r WHERE r.uploader_id = u.id) AS total_uploads,
      (SELECT COUNT(*) FROM resources r WHERE r.uploader_id = u.id AND r.approved = 1) AS approved_uploads
    FROM users u
    WHERE u.role = 'student'
  `;
  const params = [];

  if (q) {
    sql += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.course LIKE ?)`;
    const searchPattern = `%${q}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  if (course && course !== "All") {
    sql += ` AND u.course LIKE ?`;
    params.push(`%${course}%`);
  }

  sql += ` ORDER BY u.points DESC, u.name ASC`;

  try {
    const students = db.prepare(sql).all(...params);
    return res.json({ students });
  } catch (err) {
    console.error("Teacher students error:", err);
    return res.status(500).json({ error: "Failed to load students list." });
  }
});

// POST /api/teacher/assignments - Create and publish assignment
router.post("/assignments", (req, res) => {
  const { title, description = "", subject, dueDate } = req.body;
  const teacherId = req.session.user.id;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Assignment title is required." });
  }
  if (!subject || !subject.trim()) {
    return res.status(400).json({ error: "Subject is required." });
  }
  if (!dueDate || !dueDate.trim()) {
    return res.status(400).json({ error: "Due date is required." });
  }

  try {
    const result = db.prepare(`
      INSERT INTO assignments (title, description, subject, due_date, teacher_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(title.trim(), (description || "").trim(), subject.trim(), dueDate.trim(), teacherId);

    // Broadcast notification to all students
    const students = db.prepare("SELECT id FROM users WHERE role = 'student'").all();
    const insertNotif = db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, 'assignment')
    `);

    for (const student of students) {
      try {
        insertNotif.run(
          student.id,
          "New Assignment Posted 📝",
          `${req.session.user.name} published assignment "${title.trim()}" for ${subject.trim()}. Due: ${dueDate.trim()}`
        );
      } catch (_) {}
    }

    return res.status(201).json({
      ok: true,
      id: result.lastInsertRowid,
      message: "Assignment created and published to all students."
    });
  } catch (err) {
    console.error("Create assignment error:", err);
    return res.status(500).json({ error: "Failed to create assignment." });
  }
});

// POST /api/teacher/announcements - Create and publish announcement
router.post("/announcements", (req, res) => {
  const { title, message } = req.body;
  const teacherId = req.session.user.id;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Announcement title is required." });
  }
  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Announcement message content is required." });
  }

  try {
    const result = db.prepare(`
      INSERT INTO announcements (title, message, teacher_id)
      VALUES (?, ?, ?)
    `).run(title.trim(), message.trim(), teacherId);

    // Broadcast notification to all students
    const students = db.prepare("SELECT id FROM users WHERE role = 'student'").all();
    const insertNotif = db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, 'announcement')
    `);

    for (const student of students) {
      try {
        insertNotif.run(
          student.id,
          "Campus Announcement 📢",
          `${req.session.user.name}: "${title.trim()}"`
        );
      } catch (_) {}
    }

    return res.status(201).json({
      ok: true,
      id: result.lastInsertRowid,
      message: "Announcement broadcasted successfully to all students."
    });
  } catch (err) {
    console.error("Create announcement error:", err);
    return res.status(500).json({ error: "Failed to publish announcement." });
  }
});

module.exports = router;
