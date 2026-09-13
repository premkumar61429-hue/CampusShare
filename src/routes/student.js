const express = require("express");
const { db } = require("../database/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Helper to calculate assignment due status
function getDueStatus(dueDateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);

  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: "overdue", label: "Overdue", days: diffDays, badgeClass: "badge-danger" };
  } else if (diffDays <= 3) {
    return {
      status: "due_soon",
      label: diffDays === 0 ? "Due Today" : diffDays === 1 ? "Due Tomorrow" : `Due in ${diffDays} days`,
      days: diffDays,
      badgeClass: "badge-warning"
    };
  } else {
    return { status: "upcoming", label: `Due in ${diffDays} days`, days: diffDays, badgeClass: "badge-info" };
  }
}

// GET /api/dashboard - Student Dashboard
router.get("/dashboard", requireAuth, (req, res) => {
  const userId = req.session.user.id;

  try {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    const totalResources = db.prepare("SELECT COUNT(*) AS c FROM resources WHERE approved = 1").get().c;
    const myUploadsCount = db.prepare("SELECT COUNT(*) AS c FROM resources WHERE uploader_id = ?").get(userId).c;
    const myApprovedCount = db.prepare("SELECT COUNT(*) AS c FROM resources WHERE uploader_id = ? AND approved = 1").get(userId).c;

    // Calculate Rank among students
    const rankedStudents = db.prepare(`
      SELECT id, points FROM users WHERE role = 'student' ORDER BY points DESC, id ASC
    `).all();
    const rankIndex = rankedStudents.findIndex((s) => s.id === userId);
    const myRank = rankIndex !== -1 ? rankIndex + 1 : "-";

    // Recent Approved Resources
    const recentResources = db.prepare(`
      SELECT 
        r.*, 
        u.name AS uploader_name, u.role AS uploader_role,
        (SELECT COUNT(*) FROM resource_likes rl WHERE rl.resource_id = r.id AND rl.user_id = ?) AS is_liked
      FROM resources r
      JOIN users u ON u.id = r.uploader_id
      WHERE r.approved = 1
      ORDER BY r.created_at DESC
      LIMIT 6
    `).all(userId);

    // Latest Announcements
    const announcements = db.prepare(`
      SELECT a.*, u.name AS teacher_name, u.faculty_id
      FROM announcements a
      JOIN users u ON u.id = a.teacher_id
      ORDER BY a.created_at DESC
      LIMIT 5
    `).all();

    // Upcoming Assignments
    const rawAssignments = db.prepare(`
      SELECT a.*, u.name AS teacher_name
      FROM assignments a
      JOIN users u ON u.id = a.teacher_id
      ORDER BY a.due_date ASC
      LIMIT 5
    `).all();

    const assignments = rawAssignments.map((assign) => ({
      ...assign,
      dueInfo: getDueStatus(assign.due_date)
    }));

    // Top Leaderboard preview
    const topLeaders = db.prepare(`
      SELECT id, name, course, semester, points
      FROM users
      WHERE role = 'student'
      ORDER BY points DESC, id ASC
      LIMIT 5
    `).all();

    // Contribution milestone goal calculation (e.g., target 100, 200, 500...)
    const currentPoints = user.points || 0;
    let nextMilestone = 100;
    if (currentPoints >= 500) nextMilestone = 1000;
    else if (currentPoints >= 200) nextMilestone = 500;
    else if (currentPoints >= 100) nextMilestone = 200;

    const progressPercent = Math.min(100, Math.round((currentPoints / nextMilestone) * 100));

    return res.json({
      stats: {
        points: currentPoints,
        rank: myRank,
        totalResources,
        myUploads: myUploadsCount,
        myApproved: myApprovedCount,
        nextMilestone,
        progressPercent
      },
      recentResources,
      announcements,
      assignments,
      topLeaders
    });
  } catch (err) {
    console.error("Dashboard data error:", err);
    return res.status(500).json({ error: "Failed to load dashboard data." });
  }
});

// GET /api/leaderboard - Real campus leaderboard
router.get("/leaderboard", requireAuth, (req, res) => {
  const currentUserId = req.session.user.id;

  try {
    const students = db.prepare(`
      SELECT 
        u.id, u.name, u.email, u.course, u.semester, u.points, u.created_at,
        (SELECT COUNT(*) FROM resources r WHERE r.uploader_id = u.id AND r.approved = 1) AS approved_contributions,
        (SELECT COUNT(*) FROM resources r WHERE r.uploader_id = u.id) AS total_uploads,
        (SELECT COALESCE(SUM(r.likes), 0) FROM resources r WHERE r.uploader_id = u.id AND r.approved = 1) AS total_likes_received
      FROM users u
      WHERE u.role = 'student'
      ORDER BY u.points DESC, approved_contributions DESC, u.id ASC
    `).all();

    const leaderboard = students.map((s, idx) => ({
      ...s,
      rank: idx + 1,
      isCurrentUser: s.id === currentUserId
    }));

    const currentUserEntry = leaderboard.find((s) => s.id === currentUserId) || null;

    return res.json({
      leaderboard,
      currentUser: currentUserEntry
    });
  } catch (err) {
    console.error("Leaderboard error:", err);
    return res.status(500).json({ error: "Failed to load leaderboard." });
  }
});

// GET /api/achievements - Dynamic calculations based on live DB data
router.get("/achievements", requireAuth, (req, res) => {
  const userId = req.session.user.id;

  try {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    const stats = db.prepare(`
      SELECT 
        COUNT(*) AS total_uploads,
        SUM(CASE WHEN approved = 1 THEN 1 ELSE 0 END) AS approved_uploads,
        COALESCE(SUM(CASE WHEN approved = 1 THEN views ELSE 0 END), 0) AS total_views,
        COALESCE(SUM(CASE WHEN approved = 1 THEN likes ELSE 0 END), 0) AS total_likes
      FROM resources
      WHERE uploader_id = ?
    `).get(userId);

    const approvedCount = stats.approved_uploads || 0;
    const totalViews = stats.total_views || 0;
    const totalLikes = stats.total_likes || 0;
    const points = user.points || 0;

    const achievements = [
      {
        id: "first_share",
        title: "First Share",
        tier: "Bronze",
        icon: "🥉",
        description: "Upload your first academic resource that gets approved by faculty.",
        target: 1,
        current: approvedCount,
        unit: "approved upload",
        unlocked: approvedCount >= 1,
        progressPercent: Math.min(100, Math.round((approvedCount / 1) * 100))
      },
      {
        id: "helpful_contributor",
        title: "Helpful Contributor",
        tier: "Silver",
        icon: "🥈",
        description: "Earn 100 contribution points by sharing quality resources.",
        target: 100,
        current: points,
        unit: "points",
        unlocked: points >= 100,
        progressPercent: Math.min(100, Math.round((points / 100) * 100))
      },
      {
        id: "on_fire",
        title: "On Fire",
        tier: "Gold",
        icon: "🔥",
        description: "Publish 5 approved academic resources to support campus learning.",
        target: 5,
        current: approvedCount,
        unit: "approved resources",
        unlocked: approvedCount >= 5,
        progressPercent: Math.min(100, Math.round((approvedCount / 5) * 100))
      },
      {
        id: "campus_hero",
        title: "Campus Hero",
        tier: "Platinum",
        icon: "🥇",
        description: "Reach 500 total contribution points and become an academic champion.",
        target: 500,
        current: points,
        unit: "points",
        unlocked: points >= 500,
        progressPercent: Math.min(100, Math.round((points / 500) * 100))
      },
      {
        id: "knowledge_master",
        title: "Knowledge Master",
        tier: "Diamond",
        icon: "📚",
        description: "Publish 10 approved resources across different academic subjects.",
        target: 10,
        current: approvedCount,
        unit: "approved resources",
        unlocked: approvedCount >= 10,
        progressPercent: Math.min(100, Math.round((approvedCount / 10) * 100))
      },
      {
        id: "star_author",
        title: "Star Author",
        tier: "Gold",
        icon: "⭐",
        description: "Reach 50 or more views across your shared study materials.",
        target: 50,
        current: totalViews,
        unit: "views",
        unlocked: totalViews >= 50,
        progressPercent: Math.min(100, Math.round((totalViews / 50) * 100))
      },
      {
        id: "crowd_favorite",
        title: "Crowd Favorite",
        tier: "Silver",
        icon: "💖",
        description: "Receive 25 or more likes from grateful classmates and students.",
        target: 25,
        current: totalLikes,
        unit: "likes",
        unlocked: totalLikes >= 25,
        progressPercent: Math.min(100, Math.round((totalLikes / 25) * 100))
      }
    ];

    const unlockedCount = achievements.filter((a) => a.unlocked).length;

    return res.json({
      summary: {
        points,
        approvedUploads: approvedCount,
        totalViews,
        totalLikes,
        totalAchievements: achievements.length,
        unlockedCount
      },
      achievements
    });
  } catch (err) {
    console.error("Achievements error:", err);
    return res.status(500).json({ error: "Failed to calculate achievements." });
  }
});

// GET /api/assignments - Student view of assignments
router.get("/assignments", requireAuth, (req, res) => {
  try {
    const rawAssignments = db.prepare(`
      SELECT 
        a.*, 
        u.name AS teacher_name, u.faculty_id
      FROM assignments a
      JOIN users u ON u.id = a.teacher_id
      ORDER BY a.due_date ASC
    `).all();

    const assignments = rawAssignments.map((item) => ({
      ...item,
      dueInfo: getDueStatus(item.due_date)
    }));

    return res.json({ assignments });
  } catch (err) {
    console.error("Assignments list error:", err);
    return res.status(500).json({ error: "Failed to load assignments." });
  }
});

// GET /api/announcements - Student view of announcements
router.get("/announcements", requireAuth, (req, res) => {
  try {
    const announcements = db.prepare(`
      SELECT 
        a.*, 
        u.name AS teacher_name, u.faculty_id
      FROM announcements a
      JOIN users u ON u.id = a.teacher_id
      ORDER BY a.created_at DESC
    `).all();

    return res.json({ announcements });
  } catch (err) {
    console.error("Announcements list error:", err);
    return res.status(500).json({ error: "Failed to load announcements." });
  }
});

// GET /api/notifications - User's notifications
router.get("/notifications", requireAuth, (req, res) => {
  const userId = req.session.user.id;
  try {
    const notifications = db.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 25
    `).all(userId);

    const unreadCount = db.prepare(`
      SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0
    `).get(userId).c;

    return res.json({ notifications, unreadCount });
  } catch (err) {
    console.error("Notifications error:", err);
    return res.status(500).json({ error: "Failed to load notifications." });
  }
});

// POST /api/notifications/read-all - Mark all as read
router.post("/notifications/read-all", requireAuth, (req, res) => {
  const userId = req.session.user.id;
  try {
    db.prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?").run(userId);
    return res.json({ ok: true });
  } catch (err) {
    console.error("Mark notifications read error:", err);
    return res.status(500).json({ error: "Failed to update notifications." });
  }
});

// GET /api/profile - Detailed profile info
router.get("/profile", requireAuth, (req, res) => {
  const userId = req.session.user.id;
  try {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    if (!user) return res.status(404).json({ error: "User not found." });

    const isStudent = user.role === "student";
    let stats = {};

    if (isStudent) {
      const uploadStats = db.prepare(`
        SELECT 
          COUNT(*) AS total_uploads,
          SUM(CASE WHEN approved = 1 THEN 1 ELSE 0 END) AS approved_uploads,
          SUM(CASE WHEN approved = 0 THEN 1 ELSE 0 END) AS pending_uploads,
          SUM(CASE WHEN approved = -1 THEN 1 ELSE 0 END) AS rejected_uploads,
          COALESCE(SUM(CASE WHEN approved = 1 THEN views ELSE 0 END), 0) AS total_views,
          COALESCE(SUM(CASE WHEN approved = 1 THEN likes ELSE 0 END), 0) AS total_likes
        FROM resources
        WHERE uploader_id = ?
      `).get(userId);

      const ranked = db.prepare("SELECT id FROM users WHERE role = 'student' ORDER BY points DESC, id ASC").all();
      const rankIdx = ranked.findIndex((r) => r.id === userId);

      stats = {
        rank: rankIdx !== -1 ? rankIdx + 1 : "-",
        totalUploads: uploadStats.total_uploads || 0,
        approvedUploads: uploadStats.approved_uploads || 0,
        pendingUploads: uploadStats.pending_uploads || 0,
        rejectedUploads: uploadStats.rejected_uploads || 0,
        totalViews: uploadStats.total_views || 0,
        totalLikes: uploadStats.total_likes || 0
      };
    } else {
      const teacherStats = db.prepare(`
        SELECT 
          (SELECT COUNT(*) FROM assignments WHERE teacher_id = ?) AS total_assignments,
          (SELECT COUNT(*) FROM announcements WHERE teacher_id = ?) AS total_announcements,
          (SELECT COUNT(*) FROM resources WHERE approved = 1) AS total_approved_resources,
          (SELECT COUNT(*) FROM users WHERE role = 'student') AS total_students
      `).get(userId, userId);

      stats = {
        totalAssignments: teacherStats.total_assignments || 0,
        totalAnnouncements: teacherStats.total_announcements || 0,
        totalApprovedResources: teacherStats.total_approved_resources || 0,
        totalStudents: teacherStats.total_students || 0
      };
    }

    const { password, ...safeUser } = user;
    return res.json({ user: safeUser, stats });
  } catch (err) {
    console.error("Profile error:", err);
    return res.status(500).json({ error: "Failed to load profile." });
  }
});

module.exports = router;
