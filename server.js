const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");

// Ensure data & uploads directories exist
const { initializeDatabase } = require("./src/database/seed");
const { ROOT, uploadsDir } = require("./src/database/db");

// Run schema migration & seed on startup
initializeDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "campusshare-pro-secure-secret-2026-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
  })
);

// Serve static frontend assets
app.use(express.static(path.join(ROOT, "public")));

// Mount API Routes
const authRoutes = require("./src/routes/auth");
const resourceRoutes = require("./src/routes/resources");
const teacherRoutes = require("./src/routes/teacher");
const studentRoutes = require("./src/routes/student");

app.use("/api/auth", authRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api", studentRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled Application Error:", err);
  if (res.headersSent) return next(err);
  return res.status(err.status || 500).json({
    error: err.message || "An internal server error occurred."
  });
});

// Single Page Application Fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(ROOT, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 CampusShare Pro is running successfully!`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`👨‍🎓 Student Demo: student@campusshare.com / student123`);
  console.log(`👨‍🏫 Teacher Demo: teacher@campusshare.com / teacher123 (FAC-1001)`);
  console.log(`=======================================================`);
});
