import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import logo from "./banasthali-logo.jpg";
import {
  Users, Calendar, UserPlus, TrendingUp, LogOut, LayoutDashboard,
  PlusCircle, Building2, X, ChevronDown, CheckCircle2, XCircle,
  BarChart2, Shield, Layers, Eye, EyeOff, Search, RefreshCw
} from "lucide-react";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, Legend
} from "recharts";
import "./admin.css";

const API = "http://localhost:5001";
const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

// ─── Toast Component ───────────────────────────────────────────────────────────
const Toast = ({ message, type, onClose }) => (
  <div className={`toast-notification toast-${type}`}>
    {type === "success" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
    <span>{message}</span>
    <button onClick={onClose}><X size={14} /></button>
  </div>
);

// ─── Club Creation Modal ────────────────────────────────────────────────────────
const ClubFormModal = ({ students, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    name: "", description: "", vision: "", category: "Technical",
    leaderId: "", membershipTypes: ["Core Member", "General Member"],
    domains: [{ name: "", description: "" }]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addDomain = () => {
    setForm(f => ({ ...f, domains: [...f.domains, { name: "", description: "" }] }));
  };

  const removeDomain = (i) => {
    setForm(f => ({ ...f, domains: f.domains.filter((_, idx) => idx !== i) }));
  };

  const updateDomain = (i, field, value) => {
    const d = [...form.domains];
    d[i][field] = value;
    setForm(f => ({ ...f, domains: d }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.description || !form.leaderId) {
      setError("Club name, description, and leader are required."); return;
    }
    const validDomains = form.domains.filter(d => d.name.trim());
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/api/admin/clubs`, {
        ...form,
        domains: validDomains
      }, { headers: { Authorization: `Bearer ${token}` } });
      onSuccess("Club created successfully!");
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create club");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content-premium" onClick={e => e.stopPropagation()} style={{ maxWidth: "680px", maxHeight: "90vh", overflowY: "auto" }}>
        <div className="modal-header">
          <h3><Building2 size={20} style={{ marginRight: "8px", verticalAlign: "middle" }} />Create New Club</h3>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </div>
        <div className="modal-body" style={{ padding: "1.5rem" }}>
          <div className="admin-notice">
            <Shield size={16} />
            <span>Clubs are created offline after meeting with the student. This form finalizes the process.</span>
          </div>

          {error && <div className="form-error"><XCircle size={16} /> {error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Club Name *</label>
                <input type="text" placeholder="e.g. TechVerse Club"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {["Technical", "Cultural", "Workshop", "Hackathon", "Seminar", "Sports", "Entrepreneurship"].map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea placeholder="What does this club do?" rows={3}
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
            </div>

            <div className="form-group">
              <label>Vision</label>
              <textarea placeholder="Long-term vision and goals of the club..." rows={2}
                value={form.vision} onChange={e => setForm(f => ({ ...f, vision: e.target.value }))} />
            </div>

            <div className="form-group">
              <label>Assign Club Leader *</label>
              <select value={form.leaderId} onChange={e => setForm(f => ({ ...f, leaderId: e.target.value }))} required>
                <option value="">-- Select a student --</option>
                {students.map(s => (
                  <option key={s._id} value={s._id}>{s.fullName} ({s.email})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Domains <span style={{ color: "#64748b", fontSize: "0.8rem" }}>(dynamic - add/remove)</span></label>
              {form.domains.map((d, i) => (
                <div key={i} className="domain-input-row">
                  <input type="text" placeholder="Domain name (e.g., Technical)"
                    value={d.name} onChange={e => updateDomain(i, "name", e.target.value)} />
                  <input type="text" placeholder="Description (optional)"
                    value={d.description} onChange={e => updateDomain(i, "description", e.target.value)} />
                  {form.domains.length > 1 && (
                    <button type="button" onClick={() => removeDomain(i)} className="remove-domain-btn"><X size={16} /></button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addDomain} className="add-domain-btn">
                <PlusCircle size={16} /> Add Domain
              </button>
            </div>

            <div className="modal-footer-actions">
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <RefreshCw size={16} className="spin" /> : <Building2 size={16} />}
                {loading ? "Creating..." : "Create Club"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ─── Main Dashboard ─────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showClubModal, setShowClubModal] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [clubSearch, setClubSearch] = useState("");
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, usersRes, clubsRes] = await Promise.all([
        axios.get(`${API}/api/admin/analytics`, { headers }),
        axios.get(`${API}/api/admin/users`, { headers }),
        axios.get(`${API}/api/admin/clubs`, { headers })
      ]);

      setData(statsRes.data);
      setUsers(usersRes.data);
      setClubs(clubsRes.data);
    } catch (error) {
      console.error("Admin fetch error:", error);
      if (error.response?.status === 403 || error.response?.status === 401) {
        navigate("/login");
      } else {
        setData({
          stats: { totalStudents: 0, totalClubs: 0, totalEvents: 0, totalMembers: 0 },
          userGrowth: [], eventsPerClub: [], memberDistribution: [], eventsByCategory: []
        });
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDeactivateClub = async (clubId, isActive) => {
    try {
      const token = localStorage.getItem("token");
      const endpoint = isActive ? "deactivate" : "activate";
      await axios.put(`${API}/api/admin/clubs/${clubId}/${endpoint}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast(`Club ${isActive ? "deactivated" : "activated"} successfully!`);
      fetchData();
    } catch (error) {
      showToast("Action failed.", "error");
    }
  };

  const handlePromote = async (userId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API}/api/admin/promote/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, isClubLeader: true } : u));
      showToast("User promoted to Club Leader!");
    } catch (error) {
      showToast("Promotion failed.", "error");
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/api/admin/export`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "users_report.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      showToast("Export failed.", "error");
    }
  };

  const filteredUsers = users.filter(u =>
    u.fullName?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredClubs = clubs.filter(c =>
    c.name?.toLowerCase().includes(clubSearch.toLowerCase())
  );

  const sidebarLinks = [
    { id: "overview", label: "Dashboard Overview", icon: LayoutDashboard },
    { id: "clubs", label: "Club Management", icon: Building2 },
    { id: "users", label: "User Directory", icon: Users },
    { id: "events", label: "Events Control", icon: Calendar },
    { id: "analytics", label: "Analytics", icon: BarChart2 },
  ];

  const renderOverview = () => (
    <div className="dashboard-content">
      {/* Stats Grid */}
      <div className="stats-grid">
        {[
          { label: "Total Students", value: data?.stats?.totalStudents || 0, icon: Users, color: "rgba(99,102,241,0.15)", iconColor: "#6366f1" },
          { label: "Active Clubs", value: data?.stats?.totalClubs || 0, icon: Building2, color: "rgba(16,185,129,0.15)", iconColor: "#10b981" },
          { label: "Total Events", value: data?.stats?.totalEvents || 0, icon: Calendar, color: "rgba(245,158,11,0.15)", iconColor: "#f59e0b" },
          { label: "Club Members", value: data?.stats?.totalMembers || 0, icon: TrendingUp, color: "rgba(139,92,246,0.15)", iconColor: "#8b5cf6" },
        ].map((stat, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon-wrapper" style={{ backgroundColor: stat.color }}>
              <stat.icon size={24} color={stat.iconColor} />
            </div>
            <h3 className="stat-label">{stat.label}</h3>
            <p className="stat-value">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        <div className="chart-container">
          <h3 className="chart-title">Monthly Student Registrations</h3>
          <p className="chart-subtitle" style={{ color: "#94a3b8", fontSize: "0.82rem", marginBottom: "1rem" }}>
            New sign-ups over the last 6 months
          </p>
          <div style={{ height: "280px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.userGrowth?.length > 0 ? data.userGrowth : [{ _id: "1", count: 0 }]}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="_id" stroke="#94a3b8" tick={{ fontSize: 12 }} tickFormatter={v => `Month ${v}`} axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }} />
                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-container">
          <h3 className="chart-title">Member Distribution by Club</h3>
          <p className="chart-subtitle" style={{ color: "#94a3b8", fontSize: "0.82rem", marginBottom: "1rem" }}>
            How members are spread across clubs
          </p>
          <div style={{ height: "280px" }}>
            <ResponsiveContainer width="100%" height="100%">
              {data?.memberDistribution?.length > 0 ? (
                <PieChart>
                  <Pie data={data.memberDistribution} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90}>
                    {data.memberDistribution.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }} />
                </PieChart>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#64748b" }}>
                  No data available
                </div>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-container" style={{ gridColumn: "1 / -1" }}>
          <h3 className="chart-title">Events per Club</h3>
          <p className="chart-subtitle" style={{ color: "#94a3b8", fontSize: "0.82rem", marginBottom: "1rem" }}>
            Event activity across all clubs
          </p>
          <div style={{ height: "250px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.eventsPerClub?.length > 0 ? data.eventsPerClub : [{ name: "None", count: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }} />
                <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  const renderClubs = () => (
    <div className="data-table-container">
      <div className="table-header">
        <div>
          <h2>Club Management</h2>
          <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: "4px" }}>
            Clubs are created only after offline approval with the student.
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div className="admin-search-box">
            <Search size={16} />
            <input type="text" placeholder="Search clubs..." value={clubSearch}
              onChange={e => setClubSearch(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={() => setShowClubModal(true)}>
            <PlusCircle size={16} /> New Club
          </button>
        </div>
      </div>

      <div className="clubs-grid-admin">
        {filteredClubs.map(club => (
          <div key={club._id} className="club-admin-card">
            <div className="club-card-header">
              <div className="club-logo-admin">
                <img src={club.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(club.name)}&background=6366f1&color=fff&bold=true`} alt={club.name} />
              </div>
              <div className="club-card-info">
                <h3>{club.name}</h3>
                <span className="category-pill-sm">{club.category}</span>
                <span className={`status-pill ${club.isActive ? "active" : "inactive"}`}>
                  {club.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
            <p className="club-desc-admin">{club.description?.substring(0, 100)}...</p>
            <div className="club-meta-admin">
              <div className="club-meta-item">
                <Users size={14} />
                <span>Leader: {club.leaderId?.fullName || club.leader?.fullName || "Unassigned"}</span>
              </div>
              <div className="club-meta-item">
                <Layers size={14} />
                <span>{(club.domains || []).length} Domains</span>
              </div>
            </div>
            <div className="club-domains-preview">
              {(club.domains || []).slice(0, 3).map(d => (
                <span key={d._id || d.name} className="domain-badge">{d.name}</span>
              ))}
              {(club.domains || []).length > 3 && (
                <span className="domain-badge">+{club.domains.length - 3} more</span>
              )}
            </div>
            <div className="club-card-actions">
              <button
                className={club.isActive ? "btn-danger-sm" : "btn-success-sm"}
                onClick={() => handleDeactivateClub(club._id, club.isActive)}
              >
                {club.isActive ? (<><EyeOff size={14} /> Deactivate</>) : (<><Eye size={14} /> Activate</>)}
              </button>
            </div>
          </div>
        ))}

        {filteredClubs.length === 0 && (
          <div className="empty-state-admin">
            <Building2 size={48} style={{ opacity: 0.3 }} />
            <h3>No clubs yet</h3>
            <p>Create the first club using the "New Club" button above.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="data-table-container">
      <div className="table-header">
        <h2>User Directory</h2>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div className="admin-search-box">
            <Search size={16} />
            <input type="text" placeholder="Search users..." value={userSearch}
              onChange={e => setUserSearch(e.target.value)} />
          </div>
          <button onClick={handleExport} className="btn-secondary">Export CSV</button>
        </div>
      </div>
      <div className="table-wrapper" style={{ overflowX: "auto" }}>
        <table className="responsive-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Department</th>
              <th>Role</th>
              <th>Points</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user._id}>
                <td>
                  <div className="user-cell">
                    <img src={user.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=6366f1&color=fff`}
                      className="user-avatar" alt="" />
                    <div>
                      <span className="user-name">{user.fullName}</span>
                      <span className="user-email">{user.email}</span>
                    </div>
                  </div>
                </td>
                <td style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{user.department || "—"}</td>
                <td>
                  <span className={`badge badge-${user.globalRole}`}>{user.globalRole}</span>
                  {user.isClubLeader && <span className="badge badge-leader" style={{ marginLeft: "4px" }}>Leader</span>}
                </td>
                <td style={{ fontWeight: "700", color: "#f8fafc" }}>{user.points || 0} pts</td>
                <td>
                  {user.globalRole === "student" && !user.isClubLeader && (
                    <button onClick={() => handlePromote(user._id)} className="action-btn">
                      <UserPlus size={14} /> Promote
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) return (
    <div className="centered-state">
      <div className="spinner"></div>
    </div>
  );

  return (
    <div className="admin-container">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <img src={logo} alt="Banasthali Logo" className="sidebar-logo-img"
            style={{ width: "40px", height: "40px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)" }} />
          <div className="brand-name-group">
            <span className="brand-admin-text">Admin</span>
            <span className="brand-panel-text">Panel</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {sidebarLinks.map(link => (
            <button key={link.id}
              onClick={() => setActiveTab(link.id)}
              className={`nav-link ${activeTab === link.id ? "active" : ""}`}>
              <link.icon size={20} /><span>{link.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button onClick={() => { localStorage.clear(); navigate("/login"); }} className="logout-btn">
            <LogOut size={20} /><span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-header">
          <div className="header-title">
            <h1>
              {activeTab === "overview" ? "Dashboard Overview" :
                activeTab === "clubs" ? "Club Management" :
                  activeTab === "users" ? "User Directory" :
                    activeTab === "events" ? "Events Control" : "Analytics"}
            </h1>
            <p>Welcome back, Platform Administrator.</p>
          </div>
          <div className="header-actions">
            {activeTab === "clubs" && (
              <button className="btn-primary" onClick={() => setShowClubModal(true)}>
                <PlusCircle size={16} /> Create Club
              </button>
            )}
          </div>
        </header>

        {activeTab === "overview" && renderOverview()}
        {activeTab === "clubs" && renderClubs()}
        {activeTab === "users" && renderUsers()}
        {activeTab === "events" && (
          <div className="data-table-container">
            <div className="table-header"><h2>Events Control</h2></div>
            <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
              <Calendar size={48} style={{ marginBottom: "1rem", opacity: 0.4 }} />
              <h3>Global Event Moderation</h3>
              <p>Platform-wide event oversight coming soon. Club leaders manage their own events.</p>
            </div>
          </div>
        )}
        {activeTab === "analytics" && (
          <div className="data-table-container">
            <div className="table-header"><h2>Advanced Analytics</h2></div>
            {renderOverview()}
          </div>
        )}
      </main>

      {/* Club Creation Modal */}
      {showClubModal && (
        <ClubFormModal
          students={users}
          onClose={() => setShowClubModal(false)}
          onSuccess={(msg) => { showToast(msg); fetchData(); }}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
