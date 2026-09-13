/**
 * CampusShare Pro — Client Application Logic
 * Single Page Architecture, Real REST APIs, Dynamic Modals, and Lucide Icons
 */

// Global State
let me = null;
let currentPage = "dashboard";
let searchQuery = "";
let filterSubject = "All";
let filterType = "All";
let sortBy = "newest";
let notificationsList = [];
let unreadNotifCount = 0;
let isMobileSidebarOpen = false;

// DOM Elements
const app = document.getElementById("app");
const modalContainer = document.getElementById("modalContainer");
const toastContainer = document.getElementById("toastContainer");

// Utility: HTML Escaping for XSS prevention
function esc(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Utility: Format File Size
function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return "0 KB";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

// Utility: Relative Date Formatting
function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch (_) {
    return dateStr;
  }
}

// Utility: API Fetch Wrapper
async function api(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (err) {
    throw err;
  }
}

// Utility: Toast Notifications
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  const iconName = type === "success" ? "check-circle" : type === "error" ? "alert-triangle" : type === "warning" ? "alert-circle" : "info";
  toast.innerHTML = `
    <i data-lucide="${iconName}" style="width: 20px; height: 20px; flex-shrink: 0;"></i>
    <span>${esc(message)}</span>
  `;
  
  toastContainer.appendChild(toast);
  refreshIcons();

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(40px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// Utility: Modal Controls
function openModal(contentHtml) {
  modalContainer.innerHTML = `
    <div class="modal-backdrop" onclick="closeModal()"></div>
    <div class="modal-dialog">
      ${contentHtml}
    </div>
  `;
  modalContainer.classList.remove("hidden");
  refreshIcons();
}

function closeModal() {
  modalContainer.classList.add("hidden");
  modalContainer.innerHTML = "";
}

// Re-render Lucide Icons
function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

// Close mobile sidebar if clicked outside
function toggleMobileSidebar(forceState) {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return;
  isMobileSidebarOpen = forceState !== undefined ? forceState : !isMobileSidebarOpen;
  if (isMobileSidebarOpen) {
    sidebar.classList.add("mobile-open");
  } else {
    sidebar.classList.remove("mobile-open");
  }
}

// ==========================================================================
// Authentication Views & Submissions
// ==========================================================================

function renderAuth(view = "login") {
  const isTeacher = view === "teacher";
  const isSignup = view === "signup";

  return `
    <div class="auth-wrapper">
      <div class="auth-card ${isTeacher ? 'teacher-card' : ''}">
        <div class="auth-header">
          <div class="auth-icon">
            <i data-lucide="${isTeacher ? 'shield-check' : 'graduation-cap'}" style="width: 28px; height: 28px;"></i>
          </div>
          <h1 class="auth-title">
            ${isTeacher ? 'Faculty Portal Login' : isSignup ? 'Create Student Account' : 'Welcome to CampusShare'}
          </h1>
          <p class="auth-subtitle">
            ${isTeacher ? 'Secure faculty and administrative access' : isSignup ? 'Join your campus academic knowledge network' : 'Discover, share and collaborate on study materials'}
          </p>
        </div>

        ${isSignup ? `
          <form id="signupForm" class="auth-form" onsubmit="handleSignupSubmit(event)">
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <input type="text" name="name" class="form-input" placeholder="e.g. Rahul Sharma" required>
            </div>
            <div class="form-group">
              <label class="form-label">College Email Address</label>
              <input type="email" name="email" class="form-input" placeholder="e.g. rahul@campus.edu" required>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label class="form-label">Course / Degree</label>
                <select name="course" class="form-select">
                  <option value="B.Tech CSE">B.Tech CSE</option>
                  <option value="B.Tech IT">B.Tech IT</option>
                  <option value="B.Tech ECE">B.Tech ECE</option>
                  <option value="BCA">BCA</option>
                  <option value="MCA">MCA</option>
                  <option value="B.Sc CS">B.Sc CS</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Semester</label>
                <select name="semester" class="form-select">
                  <option value="Semester 1">Semester 1</option>
                  <option value="Semester 2">Semester 2</option>
                  <option value="Semester 3">Semester 3</option>
                  <option value="Semester 4">Semester 4</option>
                  <option value="Semester 5" selected>Semester 5</option>
                  <option value="Semester 6">Semester 6</option>
                  <option value="Semester 7">Semester 7</option>
                  <option value="Semester 8">Semester 8</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Password (Min. 6 chars)</label>
              <input type="password" name="password" minlength="6" class="form-input" placeholder="Create a secure password" required>
            </div>
            <div class="form-group">
              <label class="form-label">Confirm Password</label>
              <input type="password" name="confirmPassword" minlength="6" class="form-input" placeholder="Confirm your password" required>
            </div>
            <button type="submit" class="btn btn-primary btn-block">
              <i data-lucide="user-plus" style="width: 18px; height: 18px;"></i>
              Create Account
            </button>
          </form>
          <p style="text-align: center; font-size: 0.8125rem; color: var(--text-secondary);">
            Already have an account? <a href="#" onclick="event.preventDefault(); navigateTo('login')">Login here</a>
          </p>
        ` : `
          <form id="loginForm" class="auth-form" onsubmit="handleLoginSubmit(event, '${isTeacher ? 'teacher' : 'student'}')">
            <div class="form-group">
              <label class="form-label">${isTeacher ? 'Official Faculty Email' : 'Student Email Address'}</label>
              <input type="email" name="email" id="loginEmail" class="form-input" placeholder="${isTeacher ? 'e.g. teacher@campusshare.com' : 'e.g. student@campusshare.com'}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Password</label>
              <input type="password" name="password" id="loginPassword" class="form-input" placeholder="Enter your password" required>
            </div>
            ${isTeacher ? `
              <div class="form-group">
                <label class="form-label">Faculty Verification ID</label>
                <input type="text" name="facultyId" id="loginFacultyId" class="form-input" placeholder="e.g. FAC-1001" required>
                <span class="form-hint">Server-validated faculty identification code</span>
              </div>
            ` : ''}
            <button type="submit" class="btn btn-primary btn-block">
              <i data-lucide="log-in" style="width: 18px; height: 18px;"></i>
              Login as ${isTeacher ? 'Faculty' : 'Student'}
            </button>
          </form>

          <div class="demo-credentials-box">
            <strong>Demo Credentials (1-Click Fill):</strong><br>
            ${isTeacher ? `
              Teacher: <code>teacher@campusshare.com</code> | <code>teacher123</code> | <code>FAC-1001</code>
              <div style="margin-top: 6px;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="fillDemoCredentials('teacher')">
                  Fill Demo Faculty
                </button>
              </div>
            ` : `
              Student: <code>student@campusshare.com</code> | <code>student123</code>
              <div style="margin-top: 6px;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="fillDemoCredentials('student')">
                  Fill Demo Student
                </button>
              </div>
            `}
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 0.8125rem; margin-top: 4px;">
            ${isTeacher ? `
              <a href="#" onclick="event.preventDefault(); navigateTo('login')">← Student Portal</a>
            ` : `
              <a href="#" onclick="event.preventDefault(); navigateTo('signup')">Create Student Account</a>
              <a href="#" onclick="event.preventDefault(); navigateTo('teacher')" style="color: #d97706; font-weight: 600;">Faculty Portal →</a>
            `}
          </div>
        `}
      </div>
    </div>
  `;
}

function fillDemoCredentials(role) {
  if (role === "teacher") {
    document.getElementById("loginEmail").value = "teacher@campusshare.com";
    document.getElementById("loginPassword").value = "teacher123";
    const facInput = document.getElementById("loginFacultyId");
    if (facInput) facInput.value = "FAC-1001";
  } else {
    document.getElementById("loginEmail").value = "student@campusshare.com";
    document.getElementById("loginPassword").value = "student123";
  }
}

async function handleLoginSubmit(e, role) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const email = formData.get("email");
  const password = formData.get("password");
  const facultyId = formData.get("facultyId") || "";

  try {
    const res = await api("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role, facultyId })
    });
    me = res.user;
    showToast(`Welcome back, ${me.name}!`);
    navigateTo(me.role === "teacher" ? "teacherDash" : "dashboard");
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function handleSignupSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const body = Object.fromEntries(formData);

  if (body.password !== body.confirmPassword) {
    showToast("Passwords do not match.", "error");
    return;
  }

  try {
    const res = await api("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    me = res.user;
    showToast("Account created successfully!");
    navigateTo("dashboard");
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function handleLogout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch (_) {}
  me = null;
  showToast("Logged out successfully.");
  navigateTo("login");
}

// ==========================================================================
// Shell Layout Wrapper
// ==========================================================================

function renderShell(contentHtml) {
  const isTeacher = me?.role === "teacher";
  const initials = (me?.name || "User")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const studentLinks = [
    { id: "dashboard", icon: "layout-dashboard", label: "Dashboard" },
    { id: "resources", icon: "book-open", label: "Resource Library" },
    { id: "upload", icon: "upload-cloud", label: "Upload Resource" },
    { id: "myUploads", icon: "folder-archive", label: "My Uploads" },
    { id: "assignments", icon: "file-text", label: "Assignments" },
    { id: "announcements", icon: "bell", label: "Announcements" },
    { id: "leaderboard", icon: "trophy", label: "Leaderboard" },
    { id: "achievements", icon: "award", label: "Achievements" },
    { id: "profile", icon: "user", label: "My Profile" }
  ];

  const teacherLinks = [
    { id: "teacherDash", icon: "layout-dashboard", label: "Faculty Dashboard" },
    { id: "teacherPending", icon: "check-circle", label: "Pending Approvals" },
    { id: "teacherResources", icon: "book-open", label: "Manage Resources" },
    { id: "teacherStudents", icon: "users", label: "Student Directory" },
    { id: "teacherAssignments", icon: "file-plus", label: "Create Assignment" },
    { id: "teacherAnnouncements", icon: "megaphone", label: "Post Announcement" },
    { id: "profile", icon: "user", label: "Faculty Profile" }
  ];

  const links = isTeacher ? teacherLinks : studentLinks;

  return `
    <div class="app-shell">
      <!-- Sidebar Navigation -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="brand-logo">
            <i data-lucide="graduation-cap" style="width: 22px; height: 22px;"></i>
          </div>
          <div class="brand-info">
            <span class="brand-name">CampusShare<span style="color: var(--primary);">Pro</span></span>
            <span class="brand-tagline">Academic Platform</span>
          </div>
        </div>

        <nav class="sidebar-nav">
          <div class="nav-section-label">Main Menu</div>
          ${links
            .map(
              (item) => `
            <a href="#" class="nav-link ${currentPage === item.id ? 'active' : ''}" onclick="event.preventDefault(); navigateTo('${item.id}')">
              <i data-lucide="${item.icon}" class="icon"></i>
              <span>${esc(item.label)}</span>
            </a>
          `
            )
            .join("")}
          
          <div class="nav-section-label" style="margin-top: 12px;">Account</div>
          <a href="#" class="nav-link" onclick="event.preventDefault(); handleLogout()">
            <i data-lucide="log-out" class="icon" style="color: var(--danger);"></i>
            <span style="color: var(--danger);">Log Out</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="sidebar-role-card">
            <div class="role-badge-row">
              <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-primary);">
                ${isTeacher ? '👨‍🏫 Faculty Portal' : '🎓 Student Portal'}
              </span>
              <span class="type-pill ${isTeacher ? 'PYQ' : 'Notes'}">
                ${isTeacher ? 'Faculty' : 'Active'}
              </span>
            </div>
            <p style="font-size: 0.75rem; color: var(--text-secondary); line-height: 1.4;">
              ${isTeacher ? 'Review pending uploads & post assignments.' : 'Upload notes to earn points & rise on leaderboard.'}
            </p>
            <button class="portal-switch-btn" onclick="navigateTo('${isTeacher ? 'teacherPending' : 'upload'}')">
              <i data-lucide="${isTeacher ? 'check-circle' : 'upload-cloud'}" style="width: 14px; height: 14px;"></i>
              ${isTeacher ? 'Review Uploads' : 'Upload Resource'}
            </button>
          </div>
        </div>
      </aside>

      <!-- Main Layout -->
      <div class="main-content">
        <!-- Top Navbar -->
        <header class="topbar">
          <div class="topbar-left">
            <button class="mobile-menu-btn" onclick="toggleMobileSidebar()">
              <i data-lucide="menu" style="width: 22px; height: 22px;"></i>
            </button>
            <div class="global-search-wrapper">
              <i data-lucide="search" class="global-search-icon" style="width: 18px; height: 18px;"></i>
              <input 
                type="text" 
                id="globalSearchInput" 
                class="global-search-input" 
                placeholder="Search notes, PYQs, subjects, topics... (Press Enter)"
                value="${esc(searchQuery)}"
                onkeydown="handleGlobalSearch(event)"
              >
            </div>
          </div>

          <div class="topbar-right">
            <!-- Notifications Bell -->
            <button class="icon-button" onclick="openNotificationsDrawer()" title="Notifications">
              <i data-lucide="bell" style="width: 18px; height: 18px;"></i>
              ${unreadNotifCount > 0 ? `<span class="notification-dot">${unreadNotifCount}</span>` : ''}
            </button>

            <!-- User Profile Dropdown Pill -->
            <div class="user-profile-summary" onclick="navigateTo('profile')" title="View Profile">
              <div class="user-avatar">${esc(initials)}</div>
              <div class="user-meta">
                <span class="user-meta-name">${esc(me?.name || 'User')}</span>
                <span class="user-meta-role">${esc(isTeacher ? 'Faculty (' + (me?.faculty_id || 'FAC') + ')' : me?.course || 'Student')}</span>
              </div>
            </div>
          </div>
        </header>

        <!-- Dynamic Page Container -->
        <main class="page-container">
          ${contentHtml}
        </main>
      </div>
    </div>
  `;
}

function handleGlobalSearch(e) {
  if (e.key === "Enter") {
    searchQuery = e.target.value.trim();
    navigateTo("resources");
  }
}

// ==========================================================================
// Pages & Views Implementation
// ==========================================================================

// 1. Student Dashboard
async function viewDashboard() {
  const d = await api("/api/dashboard");
  const stats = d.stats;

  return `
    <!-- Hero Greeting & Progress Banner -->
    <section class="hero-banner">
      <div class="hero-content">
        <div class="hero-badge">
          <i data-lucide="sparkles" style="width: 14px; height: 14px;"></i>
          Academic Knowledge Hub
        </div>
        <h1 class="hero-title">Welcome back, <span>${esc(me?.name)}</span>! 👋</h1>
        <p class="hero-subtitle">
          Share your study notes, explore previous year question papers, and earn academic contribution points.
        </p>
        <div class="hero-actions">
          <button class="btn btn-primary" onclick="navigateTo('upload')">
            <i data-lucide="upload-cloud" style="width: 18px; height: 18px;"></i>
            Upload Study Material
          </button>
          <button class="btn btn-secondary" onclick="navigateTo('resources')">
            <i data-lucide="compass" style="width: 18px; height: 18px;"></i>
            Explore Library
          </button>
        </div>
      </div>

      <div class="hero-stats-panel">
        <div class="hero-stats-row">
          <div class="hero-stat-item">
            <div class="hero-stat-label">Campus Rank</div>
            <div class="hero-stat-value">#${stats.rank}</div>
          </div>
          <div class="hero-stat-item">
            <div class="hero-stat-label">Total Points</div>
            <div class="hero-stat-value">${stats.points}</div>
          </div>
        </div>

        <div class="progress-card">
          <div class="progress-header">
            <span>Contribution Goal</span>
            <strong>${stats.points} / ${stats.nextMilestone} pts (${stats.progressPercent}%)</strong>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${stats.progressPercent}%;"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Key Metrics Grid -->
    <section class="stat-grid">
      <div class="stat-card">
        <div class="stat-icon indigo">
          <i data-lucide="book-open" style="width: 24px; height: 24px;"></i>
        </div>
        <div class="stat-info">
          <span class="stat-count">${stats.totalResources}</span>
          <span class="stat-title">Verified Resources</span>
          <span class="stat-meta">Published study materials</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon purple">
          <i data-lucide="folder-up" style="width: 24px; height: 24px;"></i>
        </div>
        <div class="stat-info">
          <span class="stat-count">${stats.myUploads}</span>
          <span class="stat-title">My Contributions</span>
          <span class="stat-meta">${stats.myApproved} approved by faculty</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon amber">
          <i data-lucide="award" style="width: 24px; height: 24px;"></i>
        </div>
        <div class="stat-info">
          <span class="stat-count">${stats.points}</span>
          <span class="stat-title">Academic Points</span>
          <span class="stat-meta">+10 pts per approved upload</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon emerald">
          <i data-lucide="users" style="width: 24px; height: 24px;"></i>
        </div>
        <div class="stat-info">
          <span class="stat-count">#${stats.rank}</span>
          <span class="stat-title">Leaderboard Standing</span>
          <span class="stat-meta">Top student contributors</span>
        </div>
      </div>
    </section>

    <!-- Split Panels: Resources & Updates -->
    <div class="layout-split">
      <!-- Left Panel: Recent Resources -->
      <div class="panel-card">
        <div class="panel-card-header">
          <div class="panel-title-wrapper">
            <i data-lucide="clock" style="color: var(--primary);"></i>
            <h2 class="panel-title">Recently Published Resources</h2>
          </div>
          <a href="#" onclick="event.preventDefault(); navigateTo('resources')" style="font-size: 0.8125rem; font-weight: 600;">
            View All →
          </a>
        </div>

        <div class="resource-grid" style="grid-template-columns: 1fr;">
          ${d.recentResources.length ? d.recentResources.map(renderResourceListItem).join("") : renderEmptyState("No resources published yet", "Be the first to share notes with your campus!")}
        </div>
      </div>

      <!-- Right Panel: Announcements & Assignments -->
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <!-- Announcements -->
        <div class="panel-card">
          <div class="panel-card-header">
            <div class="panel-title-wrapper">
              <i data-lucide="megaphone" style="color: var(--secondary);"></i>
              <h2 class="panel-title">Faculty Announcements</h2>
            </div>
            <a href="#" onclick="event.preventDefault(); navigateTo('announcements')" style="font-size: 0.8125rem; font-weight: 600;">
              View All
            </a>
          </div>

          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${d.announcements.slice(0, 3).map((a) => `
              <div class="announcement-item" style="padding: 14px; margin-bottom: 0;">
                <div style="font-size: 0.875rem; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">
                  ${esc(a.title)}
                </div>
                <div style="font-size: 0.8125rem; color: var(--text-secondary); margin-bottom: 8px; line-height: 1.4;">
                  ${esc(a.message)}
                </div>
                <div style="font-size: 0.6875rem; color: var(--text-muted); display: flex; justify-content: space-between;">
                  <span>By ${esc(a.teacher_name)}</span>
                  <span>${formatDate(a.created_at)}</span>
                </div>
              </div>
            `).join("") || renderEmptyState("No announcements", "All quiet on the faculty board.")}
          </div>
        </div>

        <!-- Upcoming Assignments -->
        <div class="panel-card">
          <div class="panel-card-header">
            <div class="panel-title-wrapper">
              <i data-lucide="clipboard-list" style="color: var(--warning);"></i>
              <h2 class="panel-title">Assignments</h2>
            </div>
            <a href="#" onclick="event.preventDefault(); navigateTo('assignments')" style="font-size: 0.8125rem; font-weight: 600;">
              View All
            </a>
          </div>

          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${d.assignments.slice(0, 3).map((assign) => `
              <div class="assignment-card" style="padding: 14px;">
                <div class="assignment-top">
                  <span class="subject-badge">${esc(assign.subject)}</span>
                  <span class="due-badge ${assign.dueInfo.badgeClass}">${esc(assign.dueInfo.label)}</span>
                </div>
                <div style="font-size: 0.875rem; font-weight: 700; color: var(--text-primary);">
                  ${esc(assign.title)}
                </div>
                <div style="font-size: 0.6875rem; color: var(--text-muted);">
                  Due Date: ${formatDate(assign.due_date)}
                </div>
              </div>
            `).join("") || renderEmptyState("No assignments pending", "You're all caught up!")}
          </div>
        </div>
      </div>
    </div>
  `;
}

// 2. Resource Card List / Grid Item Component
function renderResourceCard(r) {
  const isLiked = Boolean(r.is_liked);
  const typeClass = (r.type || "Notes").replace(/\s+/g, "");

  return `
    <div class="resource-card" id="resource-card-${r.id}">
      <div class="resource-card-top">
        <span class="type-pill ${typeClass}">${esc(r.type)}</span>
        <span class="subject-badge">${esc(r.subject)}</span>
      </div>

      <h3 class="resource-card-title">${esc(r.title)}</h3>
      <p class="resource-card-desc">${esc(r.description || "Academic study material and reference document.")}</p>

      <div class="resource-card-meta">
        <div class="uploader-info">
          <div class="user-avatar" style="width: 24px; height: 24px; font-size: 0.625rem;">
            ${esc((r.uploader_name || "U")[0])}
          </div>
          <span>${esc(r.uploader_name)}</span>
        </div>
        <div class="resource-stats-row">
          <span class="stat-pill" title="Views">
            <i data-lucide="eye" style="width: 14px; height: 14px;"></i>
            <span id="view-count-${r.id}">${r.views || 0}</span>
          </span>
          <button class="like-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike(${r.id})">
            <i data-lucide="heart" class="icon-heart" style="width: 14px; height: 14px;"></i>
            <span id="like-count-${r.id}">${r.likes || 0}</span>
          </button>
        </div>
      </div>

      <div class="resource-card-actions">
        <button class="btn btn-secondary btn-sm" style="flex: 1;" onclick="previewResource(${r.id})">
          <i data-lucide="info" style="width: 14px; height: 14px;"></i>
          Details
        </button>
        <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="downloadResource(${r.id})">
          <i data-lucide="download" style="width: 14px; height: 14px;"></i>
          Download
        </button>
      </div>
    </div>
  `;
}

function renderResourceListItem(r) {
  return `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); gap: 14px; background: var(--bg-card);">
      <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
        <div style="width: 38px; height: 38px; border-radius: var(--radius-sm); background: var(--primary-light); color: var(--primary); display: grid; place-items: center; flex-shrink: 0;">
          <i data-lucide="file-text" style="width: 20px; height: 20px;"></i>
        </div>
        <div style="min-width: 0;">
          <div style="font-weight: 700; font-size: 0.875rem; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
            ${esc(r.title)}
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">
            ${esc(r.subject)} • By ${esc(r.uploader_name)} • ${r.likes || 0} likes
          </div>
        </div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-secondary btn-sm" onclick="previewResource(${r.id})">View</button>
        <button class="btn btn-primary btn-sm" onclick="downloadResource(${r.id})">Download</button>
      </div>
    </div>
  `;
}

// 3. Resource Library Page (with search & filters)
async function viewResources() {
  const url = `/api/resources?q=${encodeURIComponent(searchQuery)}&subject=${encodeURIComponent(filterSubject)}&type=${encodeURIComponent(filterType)}&sort=${encodeURIComponent(sortBy)}`;
  const data = await api(url);

  return `
    <section>
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <h1 style="font-size: 1.75rem; font-weight: 800; margin-bottom: 4px;">Academic Resource Library</h1>
          <p style="color: var(--text-secondary); font-size: 0.875rem;">
            Verified notes, PYQs, lab manuals, and assignments shared across departments.
          </p>
        </div>
        <button class="btn btn-primary" onclick="navigateTo('upload')">
          <i data-lucide="upload-cloud" style="width: 18px; height: 18px;"></i>
          Upload Resource
        </button>
      </div>

      ${searchQuery ? `
        <div class="search-banner">
          <span>Search results for: "<strong>${esc(searchQuery)}</strong>" (${data.count} found)</span>
          <button class="btn btn-secondary btn-sm" onclick="clearSearch()">Clear Search</button>
        </div>
      ` : ''}

      <!-- Filter Controls Toolbar -->
      <div class="filter-toolbar">
        <div class="search-field">
          <i data-lucide="search" class="icon" style="width: 16px; height: 16px;"></i>
          <input 
            type="text" 
            placeholder="Search by title, topic, or uploader..." 
            value="${esc(searchQuery)}"
            oninput="handleLibrarySearch(event)"
          >
        </div>

        <select class="filter-select" onchange="handleSubjectFilter(event.target.value)">
          <option value="All" ${filterSubject === 'All' ? 'selected' : ''}>All Subjects</option>
          <option value="DBMS" ${filterSubject === 'DBMS' ? 'selected' : ''}>DBMS</option>
          <option value="Data Structures" ${filterSubject === 'Data Structures' ? 'selected' : ''}>Data Structures</option>
          <option value="Operating System" ${filterSubject === 'Operating System' ? 'selected' : ''}>Operating System</option>
          <option value="Computer Networks" ${filterSubject === 'Computer Networks' ? 'selected' : ''}>Computer Networks</option>
          <option value="Machine Learning" ${filterSubject === 'Machine Learning' ? 'selected' : ''}>Machine Learning</option>
          <option value="Software Engineering" ${filterSubject === 'Software Engineering' ? 'selected' : ''}>Software Engineering</option>
          <option value="Cyber Security" ${filterSubject === 'Cyber Security' ? 'selected' : ''}>Cyber Security</option>
        </select>

        <select class="filter-select" onchange="handleTypeFilter(event.target.value)">
          <option value="All" ${filterType === 'All' ? 'selected' : ''}>All Types</option>
          <option value="Notes" ${filterType === 'Notes' ? 'selected' : ''}>Notes</option>
          <option value="PYQ" ${filterType === 'PYQ' ? 'selected' : ''}>PYQs</option>
          <option value="Lab Manual" ${filterType === 'Lab Manual' ? 'selected' : ''}>Lab Manuals</option>
          <option value="Assignment" ${filterType === 'Assignment' ? 'selected' : ''}>Assignments</option>
          <option value="Book" ${filterType === 'Book' ? 'selected' : ''}>Books</option>
          <option value="PPT" ${filterType === 'PPT' ? 'selected' : ''}>Presentations (PPT)</option>
        </select>

        <select class="filter-select" onchange="handleSortFilter(event.target.value)">
          <option value="newest" ${sortBy === 'newest' ? 'selected' : ''}>Sort: Newest First</option>
          <option value="likes" ${sortBy === 'likes' ? 'selected' : ''}>Sort: Most Liked</option>
          <option value="views" ${sortBy === 'views' ? 'selected' : ''}>Sort: Most Viewed</option>
          <option value="title" ${sortBy === 'title' ? 'selected' : ''}>Sort: Alphabetical (A-Z)</option>
        </select>
      </div>

      <!-- Resource Grid Container -->
      <div class="resource-grid" id="resourceLibraryGrid">
        ${data.resources.length ? data.resources.map(renderResourceCard).join("") : renderEmptyState("No resources found", "Try adjusting your search or filters to find what you need.", `<button class="btn btn-secondary" onclick="clearSearch()">Clear Filters</button>`)}
      </div>
    </section>
  `;
}

function handleLibrarySearch(e) {
  searchQuery = e.target.value.trim();
  reloadResourcesGrid();
}

function handleSubjectFilter(val) {
  filterSubject = val;
  reloadResourcesGrid();
}

function handleTypeFilter(val) {
  filterType = val;
  reloadResourcesGrid();
}

function handleSortFilter(val) {
  sortBy = val;
  reloadResourcesGrid();
}

function clearSearch() {
  searchQuery = "";
  filterSubject = "All";
  filterType = "All";
  sortBy = "newest";
  const globalInput = document.getElementById("globalSearchInput");
  if (globalInput) globalInput.value = "";
  navigateTo("resources");
}

async function reloadResourcesGrid() {
  const container = document.getElementById("resourceLibraryGrid");
  if (!container) return;
  const url = `/api/resources?q=${encodeURIComponent(searchQuery)}&subject=${encodeURIComponent(filterSubject)}&type=${encodeURIComponent(filterType)}&sort=${encodeURIComponent(sortBy)}`;
  const data = await api(url);
  container.innerHTML = data.resources.length ? data.resources.map(renderResourceCard).join("") : renderEmptyState("No resources found", "Try adjusting your search or filters.");
  refreshIcons();
}

// 4. Resource Preview & Detail Modal
async function previewResource(id) {
  try {
    const data = await api(`/api/resources/${id}`);
    const r = data.resource;
    const isLiked = Boolean(r.is_liked);

    const modalHtml = `
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="type-pill ${(r.type || 'Notes').replace(/\s+/g, '')}">${esc(r.type)}</span>
          <span class="subject-badge">${esc(r.subject)}</span>
        </div>
        <button class="icon-button" onclick="closeModal()">
          <i data-lucide="x" style="width: 18px; height: 18px;"></i>
        </button>
      </div>

      <div class="modal-body">
        <h2 style="font-size: 1.25rem; font-weight: 800; margin-bottom: 12px; line-height: 1.35;">
          ${esc(r.title)}
        </h2>
        <p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 20px;">
          ${esc(r.description || "No additional description provided.")}
        </p>

        <div style="background: var(--bg-card-muted); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 16px; margin-bottom: 20px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 0.8125rem;">
            <div>
              <span style="color: var(--text-muted); display: block;">Uploaded By:</span>
              <strong>${esc(r.uploader_name)}</strong> (${esc(r.uploader_course || r.uploader_role)})
            </div>
            <div>
              <span style="color: var(--text-muted); display: block;">Upload Date:</span>
              <strong>${formatDate(r.created_at)}</strong>
            </div>
            <div>
              <span style="color: var(--text-muted); display: block;">File Format & Size:</span>
              <strong>${esc(r.original_name || r.file_name)}</strong> (${formatBytes(r.file_size)})
            </div>
            <div>
              <span style="color: var(--text-muted); display: block;">Engagement:</span>
              <strong>${r.views} views • ${r.likes} likes</strong>
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 12px;">
          <button class="like-btn ${isLiked ? 'liked' : ''}" style="padding: 10px 18px; font-size: 0.875rem;" onclick="toggleLike(${r.id}, true)">
            <i data-lucide="heart" class="icon-heart" style="width: 18px; height: 18px;"></i>
            <span>${r.likes} Likes</span>
          </button>
          <button class="btn btn-primary" style="flex: 1;" onclick="downloadResource(${r.id})">
            <i data-lucide="download" style="width: 18px; height: 18px;"></i>
            Download File
          </button>
        </div>
      </div>
    `;

    openModal(modalHtml);
  } catch (err) {
    showToast(err.message, "error");
  }
}

// Like toggle handler
async function toggleLike(resourceId, insideModal = false) {
  try {
    const res = await api(`/api/resources/${resourceId}/like`, { method: "POST" });
    const likeBtn = document.querySelector(`#resource-card-${resourceId} .like-btn`);
    const likeCountSpan = document.getElementById(`like-count-${resourceId}`);

    if (likeBtn) {
      if (res.liked) likeBtn.classList.add("liked");
      else likeBtn.classList.remove("liked");
    }
    if (likeCountSpan) {
      likeCountSpan.textContent = res.likes;
    }

    if (insideModal) {
      previewResource(resourceId);
    }
  } catch (err) {
    showToast(err.message, "error");
  }
}

// Download Handler
function downloadResource(id) {
  window.location.href = `/api/resources/${id}/download`;
}

// 5. Upload Resource Page
function viewUpload() {
  const isTeacher = me?.role === "teacher";

  return `
    <section>
      <div style="margin-bottom: 24px;">
        <h1 style="font-size: 1.75rem; font-weight: 800; margin-bottom: 4px;">Upload Academic Material</h1>
        <p style="color: var(--text-secondary); font-size: 0.875rem;">
          ${isTeacher ? 'Publish learning resources directly to the campus library.' : 'Submit study notes, PYQs, or manuals for faculty review. Points are awarded upon approval!'}
        </p>
      </div>

      <div class="form-panel">
        <form id="uploadResourceForm" onsubmit="handleResourceUpload(event)">
          <div class="form-group">
            <label class="form-label">Resource Title *</label>
            <input type="text" name="title" class="form-input" placeholder="e.g. DBMS Unit 3 - Relational Normalization & BCNF Notes" required>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">Academic Subject *</label>
              <select name="subject" class="form-select" required>
                <option value="DBMS">DBMS</option>
                <option value="Data Structures">Data Structures</option>
                <option value="Operating System">Operating System</option>
                <option value="Computer Networks">Computer Networks</option>
                <option value="Machine Learning">Machine Learning</option>
                <option value="Software Engineering">Software Engineering</option>
                <option value="Cyber Security">Cyber Security</option>
                <option value="Other">Other Subject</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Resource Type *</label>
              <select name="type" class="form-select" required>
                <option value="Notes">Notes</option>
                <option value="PYQ">Previous Year Questions (PYQ)</option>
                <option value="Lab Manual">Lab Manual</option>
                <option value="Assignment">Assignment</option>
                <option value="Book">Reference Book</option>
                <option value="PPT">Presentation (PPT)</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Description & Key Topics Covered</label>
            <textarea name="description" rows="4" class="form-textarea" placeholder="Briefly describe what this resource covers, unit numbers, solved problems, etc."></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Attach Document File * (.pdf, .doc, .docx, .ppt, .pptx — Max 10 MB)</label>
            <div class="file-dropzone" id="fileDropzone" onclick="document.getElementById('fileInput').click()">
              <i data-lucide="file-up" class="dropzone-icon"></i>
              <div style="font-weight: 700; font-size: 0.9375rem; color: var(--text-primary);">
                Click to browse or drag and drop your document here
              </div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">
                Supported formats: PDF, Word DOC/DOCX, PowerPoint PPT/PPTX (Up to 10 MB)
              </div>
              <input type="file" name="file" id="fileInput" style="display: none;" accept=".pdf,.doc,.docx,.ppt,.pptx" onchange="handleFileSelected(event)" required>
            </div>
            <div id="fileSelectedInfo" style="display: none;"></div>
          </div>

          <button type="submit" id="uploadSubmitBtn" class="btn btn-primary btn-block" style="padding: 12px; margin-top: 10px;">
            <i data-lucide="upload-cloud" style="width: 18px; height: 18px;"></i>
            Submit Academic Resource
          </button>
        </form>
      </div>
    </section>
  `;
}

function handleFileSelected(e) {
  const file = e.target.files[0];
  const infoContainer = document.getElementById("fileSelectedInfo");
  if (!file || !infoContainer) return;

  if (file.size > 10 * 1024 * 1024) {
    showToast("File exceeds 10 MB maximum size limit.", "error");
    e.target.value = "";
    infoContainer.style.display = "none";
    return;
  }

  infoContainer.style.display = "block";
  infoContainer.innerHTML = `
    <div class="file-selected-card">
      <div style="display: flex; align-items: center; gap: 10px;">
        <i data-lucide="check-circle" style="color: var(--primary);"></i>
        <div>
          <strong style="font-size: 0.875rem; color: var(--primary);">${esc(file.name)}</strong>
          <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">${formatBytes(file.size)}</span>
        </div>
      </div>
      <button type="button" class="btn btn-secondary btn-sm" onclick="clearSelectedFile()">Change</button>
    </div>
  `;
  refreshIcons();
}

function clearSelectedFile() {
  const input = document.getElementById("fileInput");
  const info = document.getElementById("fileSelectedInfo");
  if (input) input.value = "";
  if (info) info.style.display = "none";
}

async function handleResourceUpload(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = document.getElementById("uploadSubmitBtn");
  const formData = new FormData(form);

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `Uploading and processing...`;
  }

  try {
    const res = await fetch("/api/resources", {
      method: "POST",
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");

    showToast(data.message);
    navigateTo(me?.role === "teacher" ? "teacherResources" : "myUploads");
  } catch (err) {
    showToast(err.message, "error");
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i data-lucide="upload-cloud" style="width: 18px; height: 18px;"></i> Submit Academic Resource`;
      refreshIcons();
    }
  }
}

// 6. Student's Uploaded Resources (My Uploads)
async function viewMyUploads() {
  const data = await api("/api/resources/user/my-uploads");

  return `
    <section>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h1 style="font-size: 1.75rem; font-weight: 800; margin-bottom: 4px;">My Uploaded Materials</h1>
          <p style="color: var(--text-secondary); font-size: 0.875rem;">
            Track the status of your shared resources and points earned.
          </p>
        </div>
        <button class="btn btn-primary" onclick="navigateTo('upload')">
          <i data-lucide="plus" style="width: 18px; height: 18px;"></i>
          Upload New Resource
        </button>
      </div>

      <div class="data-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Resource Title</th>
              <th>Subject</th>
              <th>Type</th>
              <th>Status</th>
              <th>Uploaded Date</th>
              <th>Engagement</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.uploads.length ? data.uploads.map((r) => {
              const statusBadge =
                r.approved === 1
                  ? `<span class="due-badge badge-success"><i data-lucide="check-circle" style="width: 12px; height: 12px;"></i> Approved (+10 pts)</span>`
                  : r.approved === 0
                  ? `<span class="due-badge badge-warning"><i data-lucide="clock" style="width: 12px; height: 12px;"></i> Pending Review</span>`
                  : `<span class="due-badge badge-danger"><i data-lucide="x-circle" style="width: 12px; height: 12px;"></i> Rejected</span>`;

              return `
                <tr>
                  <td>
                    <strong>${esc(r.title)}</strong>
                    ${r.approved === -1 && r.rejection_reason ? `
                      <div style="margin-top: 6px; padding: 6px 10px; background: var(--danger-light); border: 1px solid var(--danger-border); border-radius: var(--radius-sm); font-size: 0.75rem; color: var(--danger-text);">
                        <strong>Faculty Note:</strong> ${esc(r.rejection_reason)}
                      </div>
                    ` : ''}
                  </td>
                  <td><span class="subject-badge">${esc(r.subject)}</span></td>
                  <td><span class="type-pill ${(r.type || 'Notes').replace(/\s+/g, '')}">${esc(r.type)}</span></td>
                  <td>${statusBadge}</td>
                  <td>${formatDate(r.created_at)}</td>
                  <td>${r.views} views • ${r.real_likes || r.likes} likes</td>
                  <td>
                    <div style="display: flex; gap: 6px;">
                      ${r.approved === 1 ? `
                        <button class="btn btn-secondary btn-sm" onclick="downloadResource(${r.id})">Download</button>
                      ` : ''}
                      <button class="btn btn-danger btn-sm" onclick="deleteMyResource(${r.id})" title="Delete Upload">
                        <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join("") : `<tr><td colspan="7">${renderEmptyState("You haven't uploaded any resources yet", "Share your notes with classmates and earn achievement points!")}</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

async function deleteMyResource(id) {
  if (!confirm("Are you sure you want to delete this resource?")) return;
  try {
    await api(`/api/resources/${id}`, { method: "DELETE" });
    showToast("Resource deleted successfully.");
    navigateTo("myUploads");
  } catch (err) {
    showToast(err.message, "error");
  }
}

// 7. Leaderboard Page
async function viewLeaderboard() {
  const data = await api("/api/leaderboard");
  const leaders = data.leaderboard;
  const current = data.currentUser;

  const top1 = leaders[0] || null;
  const top2 = leaders[1] || null;
  const top3 = leaders[2] || null;

  return `
    <section>
      <div style="margin-bottom: 24px;">
        <h1 style="font-size: 1.75rem; font-weight: 800; margin-bottom: 4px;">🏆 Campus Leaderboard</h1>
        <p style="color: var(--text-secondary); font-size: 0.875rem;">
          Recognizing the top student contributors supporting campus academic excellence.
        </p>
      </div>

      <!-- Podium Top 3 -->
      <div class="podium-container">
        <!-- 2nd Place -->
        ${top2 ? `
          <div class="podium-card second">
            <div class="podium-badge silver">2</div>
            <div class="podium-avatar">${esc(top2.name[0])}</div>
            <div class="podium-name">${esc(top2.name)}</div>
            <div class="podium-course">${esc(top2.course || 'Student')}</div>
            <div class="podium-points">${top2.points} pts</div>
            <span style="font-size: 0.6875rem; color: var(--text-muted); margin-top: 4px;">${top2.approved_contributions} verified shares</span>
          </div>
        ` : '<div></div>'}

        <!-- 1st Place (Gold) -->
        ${top1 ? `
          <div class="podium-card first">
            <div class="podium-badge gold">👑 1</div>
            <div class="podium-avatar" style="background: var(--gold-gradient);">${esc(top1.name[0])}</div>
            <div class="podium-name">${esc(top1.name)}</div>
            <div class="podium-course">${esc(top1.course || 'Student')}</div>
            <div class="podium-points" style="font-size: 1.5rem; color: #d97706;">${top1.points} pts</div>
            <span style="font-size: 0.6875rem; color: var(--text-muted); margin-top: 4px;">${top1.approved_contributions} verified shares</span>
          </div>
        ` : '<div></div>'}

        <!-- 3rd Place -->
        ${top3 ? `
          <div class="podium-card third">
            <div class="podium-badge bronze">3</div>
            <div class="podium-avatar">${esc(top3.name[0])}</div>
            <div class="podium-name">${esc(top3.name)}</div>
            <div class="podium-course">${esc(top3.course || 'Student')}</div>
            <div class="podium-points">${top3.points} pts</div>
            <span style="font-size: 0.6875rem; color: var(--text-muted); margin-top: 4px;">${top3.approved_contributions} verified shares</span>
          </div>
        ` : '<div></div>'}
      </div>

      <!-- Current User Rank Standing Card -->
      ${current ? `
        <div class="current-user-rank-banner">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div class="user-avatar" style="width: 44px; height: 44px; font-size: 1rem;">
              ${esc(current.name[0])}
            </div>
            <div>
              <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--primary);">Your Current Rank</span>
              <h3 style="font-size: 1.125rem; font-weight: 800; color: var(--text-primary);">
                #${current.rank} — ${esc(current.name)}
              </h3>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-family: var(--font-heading); font-size: 1.375rem; font-weight: 800; color: var(--primary);">
              ${current.points} Points
            </div>
            <span style="font-size: 0.75rem; color: var(--text-secondary);">${current.approved_contributions} Approved Contributions</span>
          </div>
        </div>
      ` : ''}

      <!-- Full Ranked Table -->
      <div class="data-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Student Name</th>
              <th>Course / Department</th>
              <th>Approved Shares</th>
              <th>Likes Earned</th>
              <th>Total Points</th>
            </tr>
          </thead>
          <tbody>
            ${leaders.map((s) => `
              <tr class="${s.isCurrentUser ? 'highlight-row' : ''}">
                <td>
                  <strong>${s.rank === 1 ? '🥇 #1' : s.rank === 2 ? '🥈 #2' : s.rank === 3 ? '🥉 #3' : `#${s.rank}`}</strong>
                </td>
                <td>
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="user-avatar" style="width: 30px; height: 30px; font-size: 0.75rem;">
                      ${esc(s.name[0])}
                    </div>
                    <div>
                      <strong>${esc(s.name)}</strong>
                      ${s.isCurrentUser ? `<span style="font-size: 0.6875rem; background: var(--primary); color: #fff; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">You</span>` : ''}
                    </div>
                  </div>
                </td>
                <td>${esc(s.course || 'Student')}</td>
                <td>${s.approved_contributions}</td>
                <td>${s.total_likes_received} ❤️</td>
                <td><strong style="color: var(--primary); font-size: 1rem;">${s.points} pts</strong></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

// 8. Achievements Page
async function viewAchievements() {
  const data = await api("/api/achievements");
  const summary = data.summary;
  const list = data.achievements;

  return `
    <section>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
        <div>
          <h1 style="font-size: 1.75rem; font-weight: 800; margin-bottom: 4px;">⭐ Dynamic Achievements</h1>
          <p style="color: var(--text-secondary); font-size: 0.875rem;">
            Unlock badges and milestones based on real academic sharing and community impact.
          </p>
        </div>
        <div style="padding: 8px 16px; background: var(--primary-light); border: 1px solid var(--primary-border); border-radius: var(--radius-md); font-weight: 700; color: var(--primary);">
          ${summary.unlockedCount} of ${summary.totalAchievements} Badges Unlocked
        </div>
      </div>

      <div class="achievements-grid">
        ${list.map((a) => `
          <div class="achievement-card ${a.unlocked ? 'unlocked' : 'locked'}">
            <div class="achievement-top">
              <div class="achievement-icon-wrapper">
                ${a.icon}
              </div>
              <div style="display: flex; gap: 6px; align-items: center;">
                <span class="tier-badge ${a.tier}">${a.tier}</span>
                ${a.unlocked ? `
                  <span style="font-size: 0.6875rem; font-weight: 700; color: var(--success); background: var(--success-light); padding: 3px 8px; border-radius: 9999px;">
                    ✓ Unlocked
                  </span>
                ` : `
                  <span style="font-size: 0.6875rem; font-weight: 700; color: var(--text-muted); background: var(--bg-card-muted); padding: 3px 8px; border-radius: 9999px;">
                    🔒 Locked
                  </span>
                `}
              </div>
            </div>

            <h3 class="achievement-title">${esc(a.title)}</h3>
            <p class="achievement-desc">${esc(a.description)}</p>

            <div class="achievement-progress-wrapper">
              <div class="achievement-progress-label">
                <span>Progress:</span>
                <strong>${a.current} / ${a.target} ${esc(a.unit)}</strong>
              </div>
              <div class="progress-track" style="background: var(--border);">
                <div class="progress-fill" style="width: ${a.progressPercent}%; background: ${a.unlocked ? 'var(--gold-gradient)' : 'var(--primary)'};"></div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

// 9. Assignments Page (Student View)
async function viewAssignments() {
  const data = await api("/api/assignments");

  return `
    <section>
      <div style="margin-bottom: 24px;">
        <h1 style="font-size: 1.75rem; font-weight: 800; margin-bottom: 4px;">📝 Campus Assignments</h1>
        <p style="color: var(--text-secondary); font-size: 0.875rem;">
          View upcoming assignments, problem sheets, and submission deadlines published by faculty.
        </p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px;">
        ${data.assignments.length ? data.assignments.map((a) => `
          <div class="assignment-card">
            <div class="assignment-top">
              <span class="subject-badge">${esc(a.subject)}</span>
              <span class="due-badge ${a.dueInfo.badgeClass}">
                <i data-lucide="${a.dueInfo.status === 'overdue' ? 'alert-triangle' : 'clock'}" style="width: 12px; height: 12px;"></i>
                ${esc(a.dueInfo.label)}
              </span>
            </div>

            <h3 style="font-size: 1.125rem; font-weight: 700; color: var(--text-primary);">${esc(a.title)}</h3>
            <p style="font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.5; flex: 1;">
              ${esc(a.description || "Refer to class notes and syllabus guidelines for assignment instructions.")}
            </p>

            <div style="padding-top: 12px; border-top: 1px solid var(--border-subtle); display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted);">
              <span>Faculty: <strong>${esc(a.teacher_name)}</strong></span>
              <span>Due Date: <strong>${formatDate(a.due_date)}</strong></span>
            </div>
          </div>
        `).join("") : renderEmptyState("No active assignments", "All assignment submissions are up to date.")}
      </div>
    </section>
  `;
}

// 10. Announcements Page (Student View)
async function viewAnnouncements() {
  const data = await api("/api/announcements");

  return `
    <section>
      <div style="margin-bottom: 24px;">
        <h1 style="font-size: 1.75rem; font-weight: 800; margin-bottom: 4px;">📢 Faculty Announcements</h1>
        <p style="color: var(--text-secondary); font-size: 0.875rem;">
          Official department updates, examination schedules, guest lectures, and notices.
        </p>
      </div>

      <div style="max-width: 800px;">
        ${data.announcements.length ? data.announcements.map((a) => `
          <div class="announcement-item">
            <div class="announcement-header">
              <span class="faculty-tag">
                <i data-lucide="shield-check" style="width: 14px; height: 14px;"></i>
                ${esc(a.teacher_name)} ${a.faculty_id ? `(${esc(a.faculty_id)})` : ''}
              </span>
              <span style="font-size: 0.75rem; color: var(--text-muted);">${formatDate(a.created_at)}</span>
            </div>
            <h3 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 8px; color: var(--text-primary);">
              ${esc(a.title)}
            </h3>
            <p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6;">
              ${esc(a.message)}
            </p>
          </div>
        `).join("") : renderEmptyState("No announcements published", "No campus notices have been posted yet.")}
      </div>
    </section>
  `;
}

// 11. Profile Page (Student & Teacher)
async function viewProfile() {
  const data = await api("/api/profile");
  const u = data.user;
  const s = data.stats;
  const isTeacher = u.role === "teacher";
  const initials = u.name.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase();

  return `
    <section>
      <div style="margin-bottom: 24px;">
        <h1 style="font-size: 1.75rem; font-weight: 800; margin-bottom: 4px;">User Profile</h1>
        <p style="color: var(--text-secondary); font-size: 0.875rem;">
          Manage your account information and view platform participation statistics.
        </p>
      </div>

      <div class="form-panel" style="max-width: 720px;">
        <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid var(--border);">
          <div class="user-avatar avatar-lg">${esc(initials)}</div>
          <div>
            <h2 style="font-size: 1.375rem; font-weight: 800; margin-bottom: 4px;">${esc(u.name)}</h2>
            <span style="font-size: 0.8125rem; color: var(--text-muted); display: block; margin-bottom: 6px;">
              ${esc(u.email)}
            </span>
            <span class="type-pill ${isTeacher ? 'PYQ' : 'Notes'}">
              ${isTeacher ? `Faculty • ${esc(u.faculty_id || 'FAC')}` : `${esc(u.course)} • ${esc(u.semester)}`}
            </span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px;">
          ${!isTeacher ? `
            <div style="padding: 16px; background: var(--bg-card-muted); border-radius: var(--radius-md); text-align: center;">
              <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Academic Points</span>
              <div style="font-family: var(--font-heading); font-size: 1.75rem; font-weight: 800; color: var(--primary);">
                ${u.points} pts
              </div>
            </div>

            <div style="padding: 16px; background: var(--bg-card-muted); border-radius: var(--radius-md); text-align: center;">
              <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Campus Rank</span>
              <div style="font-family: var(--font-heading); font-size: 1.75rem; font-weight: 800; color: #d97706;">
                #${s.rank}
              </div>
            </div>

            <div style="padding: 16px; background: var(--bg-card-muted); border-radius: var(--radius-md); text-align: center;">
              <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Approved Uploads</span>
              <div style="font-family: var(--font-heading); font-size: 1.75rem; font-weight: 800; color: var(--success);">
                ${s.approvedUploads}
              </div>
            </div>

            <div style="padding: 16px; background: var(--bg-card-muted); border-radius: var(--radius-md); text-align: center;">
              <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Total Likes Received</span>
              <div style="font-family: var(--font-heading); font-size: 1.75rem; font-weight: 800; color: var(--danger);">
                ${s.totalLikes} ❤️
              </div>
            </div>
          ` : `
            <div style="padding: 16px; background: var(--bg-card-muted); border-radius: var(--radius-md); text-align: center;">
              <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Assignments Created</span>
              <div style="font-family: var(--font-heading); font-size: 1.75rem; font-weight: 800; color: var(--primary);">
                ${s.totalAssignments}
              </div>
            </div>

            <div style="padding: 16px; background: var(--bg-card-muted); border-radius: var(--radius-md); text-align: center;">
              <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Announcements</span>
              <div style="font-family: var(--font-heading); font-size: 1.75rem; font-weight: 800; color: var(--secondary);">
                ${s.totalAnnouncements}
              </div>
            </div>

            <div style="padding: 16px; background: var(--bg-card-muted); border-radius: var(--radius-md); text-align: center;">
              <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Active Students</span>
              <div style="font-family: var(--font-heading); font-size: 1.75rem; font-weight: 800; color: var(--success);">
                ${s.totalStudents}
              </div>
            </div>

            <div style="padding: 16px; background: var(--bg-card-muted); border-radius: var(--radius-md); text-align: center;">
              <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Verified Library Resources</span>
              <div style="font-family: var(--font-heading); font-size: 1.75rem; font-weight: 800; color: var(--info);">
                ${s.totalApprovedResources}
              </div>
            </div>
          `}
        </div>

        <div style="display: flex; justify-content: flex-end;">
          <button class="btn btn-danger" onclick="handleLogout()">
            <i data-lucide="log-out" style="width: 16px; height: 16px;"></i>
            Log Out Account
          </button>
        </div>
      </div>
    </section>
  `;
}

// ==========================================================================
// Teacher Portal Views
// ==========================================================================

// 12. Teacher Dashboard Overview
async function viewTeacherDashboard() {
  const data = await api("/api/teacher/overview");
  const stats = data.stats;

  return `
    <section>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
        <div>
          <h1 style="font-size: 1.75rem; font-weight: 800; margin-bottom: 4px;">Faculty Management Portal</h1>
          <p style="color: var(--text-secondary); font-size: 0.875rem;">
            Review student uploads, create assignments, and broadcast notices.
          </p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-primary" onclick="navigateTo('teacherAssignments')">
            <i data-lucide="plus-circle" style="width: 16px; height: 16px;"></i>
            Create Assignment
          </button>
          <button class="btn btn-secondary" onclick="navigateTo('teacherAnnouncements')">
            <i data-lucide="megaphone" style="width: 16px; height: 16px;"></i>
            Post Notice
          </button>
        </div>
      </div>

      <!-- KPI Stat Cards -->
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-icon amber">
            <i data-lucide="clock" style="width: 24px; height: 24px;"></i>
          </div>
          <div class="stat-info">
            <span class="stat-count">${stats.pendingCount}</span>
            <span class="stat-title">Pending Approvals</span>
            <span class="stat-meta">Require faculty review</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon emerald">
            <i data-lucide="check-circle" style="width: 24px; height: 24px;"></i>
          </div>
          <div class="stat-info">
            <span class="stat-count">${stats.approvedCount}</span>
            <span class="stat-title">Approved Resources</span>
            <span class="stat-meta">Live in library</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon indigo">
            <i data-lucide="users" style="width: 24px; height: 24px;"></i>
          </div>
          <div class="stat-info">
            <span class="stat-count">${stats.studentCount}</span>
            <span class="stat-title">Enrolled Students</span>
            <span class="stat-meta">Active learners</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon purple">
            <i data-lucide="file-text" style="width: 24px; height: 24px;"></i>
          </div>
          <div class="stat-info">
            <span class="stat-count">${stats.totalAssignments}</span>
            <span class="stat-title">Assignments</span>
            <span class="stat-meta">${stats.totalAnnouncements} notices broadcasted</span>
          </div>
        </div>
      </div>

      <!-- Split Layout: Pending Review Queue & Recent Students -->
      <div class="layout-split">
        <!-- Pending Review Queue -->
        <div class="panel-card">
          <div class="panel-card-header">
            <div class="panel-title-wrapper">
              <i data-lucide="alert-circle" style="color: var(--warning);"></i>
              <h2 class="panel-title">Pending Uploads for Review (${stats.pendingCount})</h2>
            </div>
            <a href="#" onclick="event.preventDefault(); navigateTo('teacherPending')" style="font-size: 0.8125rem; font-weight: 600;">
              View Full Queue →
            </a>
          </div>

          <div style="display: flex; flex-direction: column; gap: 14px;">
            ${data.pendingList.length ? data.pendingList.map((r) => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: var(--bg-card);">
                <div style="min-width: 0; flex: 1;">
                  <div style="display: flex; gap: 6px; margin-bottom: 4px;">
                    <span class="type-pill ${(r.type || 'Notes').replace(/\s+/g, '')}">${esc(r.type)}</span>
                    <span class="subject-badge">${esc(r.subject)}</span>
                  </div>
                  <strong style="font-size: 0.9375rem; color: var(--text-primary); display: block;">${esc(r.title)}</strong>
                  <span style="font-size: 0.75rem; color: var(--text-muted);">
                    Uploaded by <strong>${esc(r.uploader_name)}</strong> (${esc(r.uploader_course)}) on ${formatDate(r.created_at)}
                  </span>
                </div>
                <div style="display: flex; gap: 8px;">
                  <button class="btn btn-secondary btn-sm" onclick="previewResource(${r.id})">Inspect</button>
                  <button class="btn btn-success btn-sm" onclick="approveResource(${r.id})">Approve (+10)</button>
                  <button class="btn btn-danger btn-sm" onclick="openRejectModal(${r.id}, '${esc(r.title).replace(/'/g, "\\'")}')">Reject</button>
                </div>
              </div>
            `).join("") : renderEmptyState("🎉 All caught up!", "There are no pending resources awaiting approval.")}
          </div>
        </div>

        <!-- Recent Students -->
        <div class="panel-card">
          <div class="panel-card-header">
            <div class="panel-title-wrapper">
              <i data-lucide="user-check" style="color: var(--primary);"></i>
              <h2 class="panel-title">Active Students</h2>
            </div>
            <a href="#" onclick="event.preventDefault(); navigateTo('teacherStudents')" style="font-size: 0.8125rem; font-weight: 600;">
              Student Directory
            </a>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${data.recentStudents.map((s) => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border-radius: var(--radius-sm); background: var(--bg-card-muted);">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div class="user-avatar" style="width: 32px; height: 32px; font-size: 0.75rem;">
                    ${esc(s.name[0])}
                  </div>
                  <div>
                    <strong style="font-size: 0.8125rem; color: var(--text-primary); display: block;">${esc(s.name)}</strong>
                    <span style="font-size: 0.6875rem; color: var(--text-muted);">${esc(s.course)}</span>
                  </div>
                </div>
                <span style="font-weight: 700; color: var(--primary); font-size: 0.8125rem;">${s.points} pts</span>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    </section>
  `;
}

// 13. Pending Approvals Queue
async function viewTeacherPending() {
  const data = await api("/api/teacher/resources/pending");

  return `
    <section>
      <div style="margin-bottom: 24px;">
        <h1 style="font-size: 1.75rem; font-weight: 800; margin-bottom: 4px;">Pending Resource Approvals</h1>
        <p style="color: var(--text-secondary); font-size: 0.875rem;">
          Verify uploaded academic documents before publishing them publicly to the campus library.
        </p>
      </div>

      <div class="data-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Document Title</th>
              <th>Subject</th>
              <th>Type</th>
              <th>Student Details</th>
              <th>Upload Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.pending.length ? data.pending.map((r) => `
              <tr>
                <td>
                  <strong>${esc(r.title)}</strong>
                  <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">${formatBytes(r.file_size)}</span>
                </td>
                <td><span class="subject-badge">${esc(r.subject)}</span></td>
                <td><span class="type-pill ${(r.type || 'Notes').replace(/\s+/g, '')}">${esc(r.type)}</span></td>
                <td>
                  <strong>${esc(r.uploader_name)}</strong>
                  <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">${esc(r.uploader_course)}</span>
                </td>
                <td>${formatDate(r.created_at)}</td>
                <td>
                  <div style="display: flex; gap: 6px;">
                    <button class="btn btn-secondary btn-sm" onclick="previewResource(${r.id})">Preview</button>
                    <button class="btn btn-success btn-sm" onclick="approveResource(${r.id})">Approve (+10 pts)</button>
                    <button class="btn btn-danger btn-sm" onclick="openRejectModal(${r.id}, '${esc(r.title).replace(/'/g, "\\'")}')">Reject</button>
                  </div>
                </td>
              </tr>
            `).join("") : `<tr><td colspan="6">${renderEmptyState("🎉 Everything is approved!", "No pending student resources are currently in the queue.")}</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

// Teacher Approve Action
async function approveResource(id) {
  try {
    const res = await api(`/api/teacher/resources/${id}/approve`, { method: "POST" });
    showToast(res.message);
    navigateTo(currentPage);
  } catch (err) {
    showToast(err.message, "error");
  }
}

// Teacher Reject Modal
function openRejectModal(id, title) {
  const modalHtml = `
    <div class="modal-header">
      <h3 style="font-size: 1.125rem; font-weight: 700; color: var(--danger);">Reject Academic Resource</h3>
      <button class="icon-button" onclick="closeModal()">
        <i data-lucide="x" style="width: 18px; height: 18px;"></i>
      </button>
    </div>

    <form onsubmit="handleRejectSubmit(event, ${id})">
      <div class="modal-body">
        <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 16px;">
          Please state the reason for rejecting <strong>"${esc(title)}"</strong>. This feedback will be sent directly to the student so they can correct it.
        </p>

        <div class="form-group">
          <label class="form-label">Rejection Reason *</label>
          <textarea name="reason" id="rejectReasonInput" rows="4" class="form-textarea" placeholder="e.g. Incomplete notes, blurred scans, or missing required Unit 3 proofs..." required></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-danger">Confirm Rejection</button>
      </div>
    </form>
  `;
  openModal(modalHtml);
}

async function handleRejectSubmit(e, id) {
  e.preventDefault();
  const reason = document.getElementById("rejectReasonInput").value;
  try {
    const res = await api(`/api/teacher/resources/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason })
    });
    closeModal();
    showToast(res.message);
    navigateTo(currentPage);
  } catch (err) {
    showToast(err.message, "error");
  }
}

// 14. Teacher Manage All Resources Page
async function viewTeacherResources() {
  const data = await api("/api/teacher/resources/all");

  return `
    <section>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h1 style="font-size: 1.75rem; font-weight: 800; margin-bottom: 4px;">Manage Campus Resources</h1>
          <p style="color: var(--text-secondary); font-size: 0.875rem;">
            Inspect all uploaded documents, monitor compliance, and remove inappropriate files.
          </p>
        </div>
        <button class="btn btn-primary" onclick="navigateTo('upload')">
          <i data-lucide="plus" style="width: 16px; height: 16px;"></i>
          Upload Faculty Resource
        </button>
      </div>

      <div class="data-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Subject</th>
              <th>Type</th>
              <th>Uploaded By</th>
              <th>Status</th>
              <th>Views / Likes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.resources.length ? data.resources.map((r) => {
              const statusBadge =
                r.approved === 1
                  ? `<span class="due-badge badge-success">Live</span>`
                  : r.approved === 0
                  ? `<span class="due-badge badge-warning">Pending</span>`
                  : `<span class="due-badge badge-danger">Rejected</span>`;

              return `
                <tr>
                  <td><strong>${esc(r.title)}</strong></td>
                  <td><span class="subject-badge">${esc(r.subject)}</span></td>
                  <td><span class="type-pill ${(r.type || 'Notes').replace(/\s+/g, '')}">${esc(r.type)}</span></td>
                  <td>${esc(r.uploader_name)}</td>
                  <td>${statusBadge}</td>
                  <td>${r.views} / ${r.likes}</td>
                  <td>
                    <div style="display: flex; gap: 6px;">
                      <button class="btn btn-secondary btn-sm" onclick="previewResource(${r.id})">Preview</button>
                      <button class="btn btn-danger btn-sm" onclick="deleteResourceAsTeacher(${r.id})" title="Delete from Platform">
                        <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join("") : `<tr><td colspan="7">${renderEmptyState("No resources found", "The library is currently empty.")}</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

async function deleteResourceAsTeacher(id) {
  if (!confirm("Are you sure you want to remove this resource and delete the stored file?")) return;
  try {
    await api(`/api/resources/${id}`, { method: "DELETE" });
    showToast("Resource removed from campus library.");
    navigateTo("teacherResources");
  } catch (err) {
    showToast(err.message, "error");
  }
}

// 15. Teacher Student Management Directory
async function viewTeacherStudents() {
  const data = await api("/api/teacher/students");

  return `
    <section>
      <div style="margin-bottom: 24px;">
        <h1 style="font-size: 1.75rem; font-weight: 800; margin-bottom: 4px;">Student Directory & Performance</h1>
        <p style="color: var(--text-secondary); font-size: 0.875rem;">
          View student participation, academic contributions, and points earned.
        </p>
      </div>

      <div class="data-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>College Email</th>
              <th>Degree & Semester</th>
              <th>Total Shares</th>
              <th>Approved Shares</th>
              <th>Academic Points</th>
              <th>Join Date</th>
            </tr>
          </thead>
          <tbody>
            ${data.students.length ? data.students.map((s) => `
              <tr>
                <td>
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="user-avatar" style="width: 32px; height: 32px; font-size: 0.75rem;">
                      ${esc(s.name[0])}
                    </div>
                    <strong>${esc(s.name)}</strong>
                  </div>
                </td>
                <td>${esc(s.email)}</td>
                <td>${esc(s.course)} • ${esc(s.semester || 'Sem 1')}</td>
                <td>${s.total_uploads}</td>
                <td>${s.approved_uploads}</td>
                <td><strong style="color: var(--primary); font-size: 1rem;">${s.points} pts</strong></td>
                <td>${formatDate(s.created_at)}</td>
              </tr>
            `).join("") : `<tr><td colspan="7">${renderEmptyState("No students registered", "Students will appear here once they sign up.")}</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

// 16. Teacher Create Assignment View
function viewTeacherAssignments() {
  const todayStr = new Date().toISOString().split("T")[0];

  return `
    <section>
      <div style="margin-bottom: 24px;">
        <h1 style="font-size: 1.75rem; font-weight: 800; margin-bottom: 4px;">Create Academic Assignment</h1>
        <p style="color: var(--text-secondary); font-size: 0.875rem;">
          Publish coursework and problem sheets with deadlines for your students.
        </p>
      </div>

      <div class="form-panel">
        <form onsubmit="handleCreateAssignment(event)">
          <div class="form-group">
            <label class="form-label">Assignment Title *</label>
            <input type="text" name="title" class="form-input" placeholder="e.g. DBMS Assignment 3: Relational Algebra & SQL Subqueries" required>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">Subject *</label>
              <select name="subject" class="form-select" required>
                <option value="DBMS">DBMS</option>
                <option value="Data Structures">Data Structures</option>
                <option value="Operating System">Operating System</option>
                <option value="Computer Networks">Computer Networks</option>
                <option value="Machine Learning">Machine Learning</option>
                <option value="Software Engineering">Software Engineering</option>
                <option value="Cyber Security">Cyber Security</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Submission Due Date *</label>
              <input type="date" name="dueDate" min="${todayStr}" class="form-input" required>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Assignment Instructions & Guidelines</label>
            <textarea name="description" rows="5" class="form-textarea" placeholder="Detail problem statement, formatting guidelines, submission rules, etc."></textarea>
          </div>

          <button type="submit" class="btn btn-primary btn-block" style="padding: 12px;">
            <i data-lucide="plus-circle" style="width: 18px; height: 18px;"></i>
            Publish Assignment to Students
          </button>
        </form>
      </div>
    </section>
  `;
}

async function handleCreateAssignment(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const body = Object.fromEntries(formData);

  try {
    const res = await api("/api/teacher/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    showToast(res.message);
    navigateTo("assignments");
  } catch (err) {
    showToast(err.message, "error");
  }
}

// 17. Teacher Post Announcement View
function viewTeacherAnnouncements() {
  return `
    <section>
      <div style="margin-bottom: 24px;">
        <h1 style="font-size: 1.75rem; font-weight: 800; margin-bottom: 4px;">Post Campus Announcement</h1>
        <p style="color: var(--text-secondary); font-size: 0.875rem;">
          Broadcast official department notices, schedules, and important information to all students.
        </p>
      </div>

      <div class="form-panel">
        <form onsubmit="handleCreateAnnouncement(event)">
          <div class="form-group">
            <label class="form-label">Announcement Title / Subject *</label>
            <input type="text" name="title" class="form-input" placeholder="e.g. End-Term Theory Exam Schedule Released" required>
          </div>

          <div class="form-group">
            <label class="form-label">Announcement Content / Message *</label>
            <textarea name="message" rows="6" class="form-textarea" placeholder="Write your announcement details here..." required></textarea>
          </div>

          <button type="submit" class="btn btn-primary btn-block" style="padding: 12px;">
            <i data-lucide="megaphone" style="width: 18px; height: 18px;"></i>
            Broadcast Announcement
          </button>
        </form>
      </div>
    </section>
  `;
}

async function handleCreateAnnouncement(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const body = Object.fromEntries(formData);

  try {
    const res = await api("/api/teacher/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    showToast(res.message);
    navigateTo("announcements");
  } catch (err) {
    showToast(err.message, "error");
  }
}

// 18. Notifications Drawer
async function openNotificationsDrawer() {
  try {
    const data = await api("/api/notifications");
    notificationsList = data.notifications;
    unreadNotifCount = data.unreadCount;

    const modalHtml = `
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <i data-lucide="bell" style="color: var(--primary);"></i>
          <h3 style="font-size: 1.125rem; font-weight: 700;">Notifications (${data.notifications.length})</h3>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          ${unreadNotifCount > 0 ? `
            <button class="btn btn-secondary btn-sm" onclick="markAllNotificationsRead()">Mark all as read</button>
          ` : ''}
          <button class="icon-button" onclick="closeModal()">
            <i data-lucide="x" style="width: 18px; height: 18px;"></i>
          </button>
        </div>
      </div>

      <div class="modal-body" style="max-height: 480px; overflow-y: auto;">
        ${notificationsList.length ? notificationsList.map((n) => `
          <div style="padding: 12px; border-radius: var(--radius-md); background: ${n.is_read ? 'var(--bg-main)' : 'var(--primary-light)'}; border: 1px solid ${n.is_read ? 'var(--border-subtle)' : 'var(--primary-border)'}; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <strong style="font-size: 0.875rem; color: var(--text-primary);">${esc(n.title)}</strong>
              <span style="font-size: 0.6875rem; color: var(--text-muted);">${formatDate(n.created_at)}</span>
            </div>
            <p style="font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.4;">
              ${esc(n.message)}
            </p>
          </div>
        `).join("") : renderEmptyState("No notifications", "You have no new alerts right now.")}
      </div>
    `;

    openModal(modalHtml);
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function markAllNotificationsRead() {
  try {
    await api("/api/notifications/read-all", { method: "POST" });
    unreadNotifCount = 0;
    closeModal();
    showToast("All notifications marked as read.");
    navigateTo(currentPage);
  } catch (err) {
    showToast(err.message, "error");
  }
}

// Utility: Empty State Generator
function renderEmptyState(title, desc, actionBtnHtml = "") {
  return `
    <div class="empty-state">
      <div class="empty-icon">
        <i data-lucide="inbox" style="width: 32px; height: 32px;"></i>
      </div>
      <h4 class="empty-title">${esc(title)}</h4>
      <p class="empty-desc">${esc(desc)}</p>
      ${actionBtnHtml}
    </div>
  `;
}

// ==========================================================================
// Router & Page Navigation Controller
// ==========================================================================

async function navigateTo(targetPage = "dashboard") {
  currentPage = targetPage;
  window.scrollTo({ top: 0, behavior: "smooth" });
  toggleMobileSidebar(false);

  // If not logged in and not an auth page, redirect to login
  if (!me && !["login", "teacher", "signup"].includes(targetPage)) {
    targetPage = "login";
    currentPage = "login";
  }

  // Handle Auth screens
  if (["login", "teacher", "signup"].includes(targetPage)) {
    app.innerHTML = renderAuth(targetPage);
    refreshIcons();
    return;
  }

  // Handle Logged In Views
  try {
    let contentHtml = "";

    switch (targetPage) {
      case "dashboard":
        contentHtml = await viewDashboard();
        break;
      case "resources":
        contentHtml = await viewResources();
        break;
      case "upload":
        contentHtml = viewUpload();
        break;
      case "myUploads":
        contentHtml = await viewMyUploads();
        break;
      case "leaderboard":
        contentHtml = await viewLeaderboard();
        break;
      case "achievements":
        contentHtml = await viewAchievements();
        break;
      case "assignments":
        contentHtml = await viewAssignments();
        break;
      case "announcements":
        contentHtml = await viewAnnouncements();
        break;
      case "profile":
        contentHtml = await viewProfile();
        break;
      case "teacherDash":
        contentHtml = await viewTeacherDashboard();
        break;
      case "teacherPending":
        contentHtml = await viewTeacherPending();
        break;
      case "teacherResources":
        contentHtml = await viewTeacherResources();
        break;
      case "teacherStudents":
        contentHtml = await viewTeacherStudents();
        break;
      case "teacherAssignments":
        contentHtml = viewTeacherAssignments();
        break;
      case "teacherAnnouncements":
        contentHtml = viewTeacherAnnouncements();
        break;
      default:
        contentHtml = await viewDashboard();
        break;
    }

    app.innerHTML = renderShell(contentHtml);
    refreshIcons();
  } catch (err) {
    console.error("Navigation error:", err);
    if (err.message.includes("401") || err.message.includes("Authentication")) {
      me = null;
      navigateTo("login");
    } else {
      showToast(err.message, "error");
    }
  }
}

// Initial Bootstrapping
async function initApp() {
  try {
    const res = await api("/api/auth/me");
    me = res.user;
    if (me) {
      navigateTo(me.role === "teacher" ? "teacherDash" : "dashboard");
      // Fetch initial notifications count
      api("/api/notifications").then((d) => {
        unreadNotifCount = d.unreadCount || 0;
        const dot = document.querySelector(".notification-dot");
        if (dot && unreadNotifCount > 0) dot.textContent = unreadNotifCount;
      }).catch(() => {});
    } else {
      navigateTo("login");
    }
  } catch (_) {
    navigateTo("login");
  }
}

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", initApp);
