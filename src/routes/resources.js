const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { db, uploadsDir } = require("../database/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Allowed file extensions & MIME types
const ALLOWED_EXTENSIONS = new Set([".pdf", ".doc", ".docx", ".ppt", ".pptx"]);
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/octet-stream"
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);
    const uniqueName = `${Date.now()}-${cleanBase}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error("File type not allowed. Supported formats: .pdf, .doc, .docx, .ppt, .pptx"));
    }
    cb(null, true);
  }
});

// Middleware wrapper for multer error handling
function handleUpload(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File size exceeds the 10 MB limit." });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}

// GET /api/resources - Discover public approved resources
router.get("/", (req, res) => {
  const q = (req.query.q || "").trim();
  const subject = (req.query.subject || "").trim();
  const type = (req.query.type || "").trim();
  const sort = (req.query.sort || "newest").trim();
  const currentUserId = req.session?.user?.id || 0;

  let sql = `
    SELECT 
      r.id, r.title, r.description, r.subject, r.type, r.file_name, r.original_name, r.file_size,
      r.approved, r.views, r.likes, r.created_at,
      u.id AS uploader_id, u.name AS uploader_name, u.role AS uploader_role, u.course AS uploader_course,
      (SELECT COUNT(*) FROM resource_likes rl WHERE rl.resource_id = r.id AND rl.user_id = ?) AS is_liked
    FROM resources r
    JOIN users u ON u.id = r.uploader_id
    WHERE r.approved = 1
  `;
  const params = [currentUserId];

  if (q) {
    sql += ` AND (r.title LIKE ? OR r.description LIKE ? OR r.subject LIKE ? OR u.name LIKE ?)`;
    const searchPattern = `%${q}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  if (subject && subject !== "All" && subject !== "all") {
    sql += ` AND r.subject = ?`;
    params.push(subject);
  }

  if (type && type !== "All" && type !== "all") {
    sql += ` AND r.type = ?`;
    params.push(type);
  }

  // Sorting
  switch (sort) {
    case "likes":
      sql += ` ORDER BY r.likes DESC, r.created_at DESC`;
      break;
    case "views":
      sql += ` ORDER BY r.views DESC, r.created_at DESC`;
      break;
    case "title":
      sql += ` ORDER BY r.title ASC`;
      break;
    case "newest":
    default:
      sql += ` ORDER BY r.created_at DESC`;
      break;
  }

  try {
    const resources = db.prepare(sql).all(...params);
    return res.json({ resources, count: resources.length });
  } catch (err) {
    console.error("Fetch resources error:", err);
    return res.status(500).json({ error: "Failed to load resources." });
  }
});

// GET /api/resources/:id - Get resource details and track view
router.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid resource ID." });

  const currentUserId = req.session?.user?.id || 0;
  const currentUserRole = req.session?.user?.role || "";

  const resource = db.prepare(`
    SELECT 
      r.*, 
      u.name AS uploader_name, u.role AS uploader_role, u.course AS uploader_course,
      (SELECT COUNT(*) FROM resource_likes rl WHERE rl.resource_id = r.id AND rl.user_id = ?) AS is_liked
    FROM resources r
    JOIN users u ON u.id = r.uploader_id
    WHERE r.id = ?
  `).get(currentUserId, id);

  if (!resource) {
    return res.status(404).json({ error: "Resource not found." });
  }

  // Access check: only approved or teacher or owner can view
  if (resource.approved !== 1 && currentUserRole !== "teacher" && resource.uploader_id !== currentUserId) {
    return res.status(403).json({ error: "This resource is pending approval and is not publicly accessible." });
  }

  // Deduplicated view tracking
  try {
    const sessionId = req.sessionID || `user-${currentUserId}`;
    const alreadyViewed = db.prepare(`
      SELECT id FROM resource_views 
      WHERE resource_id = ? AND (session_id = ? OR (user_id IS NOT NULL AND user_id = ?))
    `).get(id, sessionId, currentUserId);

    if (!alreadyViewed) {
      db.prepare(`
        INSERT INTO resource_views (user_id, resource_id, session_id)
        VALUES (?, ?, ?)
      `).run(currentUserId || null, id, sessionId);
      db.prepare("UPDATE resources SET views = views + 1 WHERE id = ?").run(id);
      resource.views += 1;
    }
  } catch (err) {
    console.warn("View tracking error:", err);
  }

  return res.json({ resource });
});

// POST /api/resources - Upload new resource
router.post("/", requireAuth, handleUpload, (req, res) => {
  const { title, description = "", subject, type } = req.body;
  const user = req.session.user;

  if (!title || !title.trim()) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: "Resource title is required." });
  }
  if (!subject || !subject.trim()) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: "Academic subject is required." });
  }
  if (!type || !type.trim()) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: "Resource type is required." });
  }
  if (!req.file) {
    return res.status(400).json({ error: "Please attach a document file (.pdf, .doc, .docx, .ppt, .pptx)." });
  }

  const isTeacher = user.role === "teacher";
  const initialApproved = isTeacher ? 1 : 0; // Teachers auto-approved, students pending review
  const pointsAwarded = isTeacher ? 0 : 0; // Points awarded ONLY upon teacher approval!

  try {
    const result = db.prepare(`
      INSERT INTO resources (
        title, description, subject, type, file_name, original_name, file_size,
        uploader_id, approved, rejection_reason, views, likes, points_awarded
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', 0, 0, ?)
    `).run(
      title.trim(),
      (description || "").trim(),
      subject.trim(),
      type.trim(),
      req.file.filename,
      req.file.originalname,
      req.file.size,
      user.id,
      initialApproved,
      pointsAwarded
    );

    const message = isTeacher
      ? "Resource published successfully to the campus library."
      : "Resource uploaded successfully! It has been submitted for faculty review. Points will be awarded once approved.";

    return res.status(201).json({
      ok: true,
      id: result.lastInsertRowid,
      approved: initialApproved,
      message
    });
  } catch (err) {
    console.error("Resource insert error:", err);
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(500).json({ error: "Failed to upload resource. Please try again." });
  }
});

// GET /api/resources/:id/download - Protected file download
router.get("/:id/download", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid resource ID." });

  const user = req.session.user;
  const resource = db.prepare("SELECT * FROM resources WHERE id = ?").get(id);

  if (!resource) {
    return res.status(404).json({ error: "Resource not found." });
  }

  // Security check: Only approved resources can be downloaded by students
  if (resource.approved !== 1 && user.role !== "teacher" && resource.uploader_id !== user.id) {
    return res.status(403).json({ error: "Access denied. Resource has not been approved by faculty yet." });
  }

  const filePath = path.join(uploadsDir, resource.file_name);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "The file is missing or has been removed from storage." });
  }

  // Increment download / view count
  try {
    db.prepare("UPDATE resources SET views = views + 1 WHERE id = ?").run(id);
  } catch (_) {}

  return res.download(filePath, resource.original_name || resource.file_name);
});

// POST /api/resources/:id/like - Toggle Like
router.post("/:id/like", requireAuth, (req, res) => {
  const resourceId = Number(req.params.id);
  const userId = req.session.user.id;

  const resource = db.prepare("SELECT * FROM resources WHERE id = ?").get(resourceId);
  if (!resource) {
    return res.status(404).json({ error: "Resource not found." });
  }

  const existingLike = db.prepare(`
    SELECT id FROM resource_likes WHERE user_id = ? AND resource_id = ?
  `).get(userId, resourceId);

  try {
    if (existingLike) {
      // Unlike
      db.prepare("DELETE FROM resource_likes WHERE id = ?").run(existingLike.id);
      db.prepare("UPDATE resources SET likes = MAX(0, likes - 1) WHERE id = ?").run(resourceId);
      const updated = db.prepare("SELECT likes FROM resources WHERE id = ?").get(resourceId);
      return res.json({ ok: true, liked: false, likes: updated.likes });
    } else {
      // Like
      db.prepare("INSERT INTO resource_likes (user_id, resource_id) VALUES (?, ?)").run(userId, resourceId);
      db.prepare("UPDATE resources SET likes = likes + 1 WHERE id = ?").run(resourceId);
      const updated = db.prepare("SELECT likes FROM resources WHERE id = ?").get(resourceId);

      // Send notification to uploader (if not liking own resource)
      if (resource.uploader_id !== userId) {
        db.prepare(`
          INSERT INTO notifications (user_id, title, message, type)
          VALUES (?, ?, ?, 'like')
        `).run(
          resource.uploader_id,
          "New Like on your Resource! ❤️",
          `${req.session.user.name} liked your uploaded resource "${resource.title}".`
        );
      }

      return res.json({ ok: true, liked: true, likes: updated.likes });
    }
  } catch (err) {
    console.error("Like error:", err);
    return res.status(500).json({ error: "Failed to update like status." });
  }
});

// GET /api/my-uploads - List uploads of the logged in user
router.get("/user/my-uploads", requireAuth, (req, res) => {
  const userId = req.session.user.id;
  try {
    const uploads = db.prepare(`
      SELECT 
        r.*,
        (SELECT COUNT(*) FROM resource_likes rl WHERE rl.resource_id = r.id) AS real_likes
      FROM resources r
      WHERE r.uploader_id = ?
      ORDER BY r.created_at DESC
    `).all(userId);

    return res.json({ uploads });
  } catch (err) {
    console.error("My uploads error:", err);
    return res.status(500).json({ error: "Failed to load your uploads." });
  }
});

// DELETE /api/resources/:id - Delete a resource (uploader if pending/rejected, or teacher anytime)
router.delete("/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const user = req.session.user;

  const resource = db.prepare("SELECT * FROM resources WHERE id = ?").get(id);
  if (!resource) {
    return res.status(404).json({ error: "Resource not found." });
  }

  const isOwner = resource.uploader_id === user.id;
  const isTeacher = user.role === "teacher";

  if (!isOwner && !isTeacher) {
    return res.status(403).json({ error: "You are not authorized to delete this resource." });
  }

  try {
    // Delete file from filesystem
    const filePath = path.join(uploadsDir, resource.file_name);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (_) {}
    }

    // Delete from DB (CASCADE handles likes/views)
    db.prepare("DELETE FROM resources WHERE id = ?").run(id);

    return res.json({ ok: true, message: "Resource deleted successfully." });
  } catch (err) {
    console.error("Delete resource error:", err);
    return res.status(500).json({ error: "Failed to delete resource." });
  }
});

module.exports = router;
