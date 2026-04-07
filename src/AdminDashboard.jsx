import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import logo from "./banasthali-logo.jpg";
import {
  Users, Calendar, LogOut, LayoutDashboard,
  PlusCircle, Building2, X, CheckCircle2, XCircle,
  Shield, Layers, Eye, EyeOff, Search, RefreshCw,
  Zap, ShieldCheck, Trash2
} from "lucide-react";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, Legend
} from "recharts";
import "./admin.css";
import config from "./config";

// eslint-disable-next-line no-unused-vars
const UserDirectoryStyles = () => (
  <style>{`
    .role-stack {
      display: flex !important;
      flex-direction: column !important;
      gap: 6px !important;
      align-items: flex-start !important;
    }
    .badge-premium {
      padding: 0.35rem 0.75rem !important;
      border-radius: 8px !important;
      font-size: 0.68rem !important;
      font-weight: 800 !important;
      letter-spacing: 0.06em !important;
      text-transform: uppercase !important;
      display: inline-flex !important;
      align-items: center !important;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;
    }
    .badge-student { 
      background: rgba(99, 102, 241, 0.1) !important; 
      color: #818cf8 !important; 
      border: 1px solid rgba(99, 102, 241, 0.3) !important; 
    }
    .badge-admin { 
      background: rgba(239, 68, 68, 0.1) !important; 
      color: #f87171 !important; 
      border: 1px solid rgba(239, 68, 68, 0.3) !important; 
    }
    .badge-leader-gold { 
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.05)) !important; 
      color: #fbbf24 !important; 
      border: 1px solid rgba(245, 158, 11, 0.4) !important;
    }
    .promote-btn-fancy {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 10px !important;
      background: linear-gradient(135deg, #6366f1, #4f46e5) !important;
      color: white !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      border-radius: 12px !important;
      padding: 0.65rem 1.25rem !important;
      font-size: 0.85rem !important;
      font-weight: 700 !important;
      cursor: pointer !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      box-shadow: 0 10px 20px -5px rgba(99, 102, 241, 0.4) !important;
      width: fit-content !important;
      white-space: nowrap !important;
    }
    .promote-btn-fancy:hover {
      transform: translateY(-2.5px) scale(1.03) !important;
      box-shadow: 0 15px 25px -5px rgba(99, 102, 241, 0.6) !important;
    }
    .status-label-active {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      color: #10b981 !important;
      font-size: 0.8rem !important;
      font-weight: 700 !important;
      padding: 0.5rem 1rem !important;
      background: rgba(16, 185, 129, 0.1) !important;
      border: 1px solid rgba(16, 185, 129, 0.2) !important;
      border-radius: 10px !important;
    }
    .btn-delete-fancy {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 6px !important;
      background: linear-gradient(135deg, #ef4444, #dc2626) !important;
      color: white !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      border-radius: 10px !important;
      padding: 0.5rem 12px !important;
      font-size: 0.8rem !important;
      font-weight: 700 !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3) !important;
    }
    .btn-delete-fancy:hover {
      transform: translateY(-1px) !important;
      box-shadow: 0 6px 15px rgba(239, 68, 68, 0.4) !important;
      filter: brightness(1.1) !important;
    }
  `}</style>
);

const API = config.API_BASE_URL;
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.description || !form.leaderId) {
      setError("Club name, description, and leader are required."); return;
    }
    const validDomains = (form.domains || []).filter(d => d.name && d.name.trim());
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
          {error && <div className="form-error" style={{ color: "#ef4444", background: "rgba(239, 68, 68, 0.1)", padding: "10px", borderRadius: "10px", border: "1px solid rgba(239, 68, 68, 0.2)", marginBottom: "1.5rem", fontSize: "0.85rem", fontWeight: "600" }}>{error}</div>}
          <div className="admin-notice">
            <Shield size={16} />
            <span>Clubs are created offline after meeting with the student. This form finalizes their digital presence.</span>
          </div>

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
                  {["Technical", "Cultural", "Workshop", "Hackathon", "Seminar", "Sports", "Entrepreneurship", "Event", "Welfare", "Academic", "Marketing"].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Vision & Mission</label>
              <textarea placeholder="Long-term vision and goals of the club..." rows={2}
                value={form.vision} onChange={e => setForm(f => ({ ...f, vision: e.target.value }))} />
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea placeholder="What does this club do?" rows={4} 
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
            </div>

            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label>Assign Founding Club Leader *</label>
              <select value={form.leaderId} onChange={e => setForm(f => ({ ...f, leaderId: e.target.value }))} required>
                <option value="">-- Select a primary student leader --</option>
                {students.map(s => (
                  <option key={s._id} value={s._id}>{s.fullName} ({s.email})</option>
                ))}
              </select>
            </div>

            <div className="modal-footer-actions">
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <RefreshCw size={16} className="spin" /> : <ShieldCheck size={16} />}
                {loading ? "Registering..." : "Launch Club"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ─── Make Admin Modal ────────────────────────────────────────────────────────
const MakeAdminModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({ email: "", fullName: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email) { setError("Email is required"); return; }
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(`${API}/api/admin/make-admin`, form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onSuccess(res.data.message);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to make admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content-premium" onClick={e => e.stopPropagation()} style={{ maxWidth: "450px" }}>
        <div className="modal-header">
          <h3><Shield size={20} style={{ marginRight: "8px", verticalAlign: "middle" }} />Grant Admin Role</h3>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </div>
        <div className="modal-body" style={{ padding: "1.5rem" }}>
          <div className="admin-notice" style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.2)" }}>
            <Shield size={16} />
            <span>If the user is not registered, providing their Name and a Password will instantly create their Admin account.</span>
          </div>
          {error && <div className="form-error"><XCircle size={16} /> {error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Staff/HOD Email *</label>
              <input type="email" placeholder="e.g. director@banasthali.in"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Full Name (Required if new)</label>
              <input type="text" placeholder="e.g. Dr. Ramesh"
                value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Initial Password (Required if new)</label>
              <input type="text" placeholder="Minimum 8 characters"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="modal-footer-actions" style={{ marginTop: "2rem" }}>
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary" disabled={loading} style={{ background: "#ef4444", borderColor: "#ef4444" }}>
                {loading ? <RefreshCw size={16} className="spin" /> : <Shield size={16} />}
                {loading ? "Processing..." : "Create Admin"}
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
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showClubModal, setShowClubModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [clubSearch, setClubSearch] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  // eslint-disable-next-line no-unused-vars
  const isSuperAdmin = currentUser.email === "anshumanshashtri26@banasthali.in";

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }

    const headers = { Authorization: `Bearer ${token}` };
    const handleAuthError = (err) => {
      console.error("Admin Auth Error:", err);
      if (err.response?.status === 403 || err.response?.status === 401) {
        localStorage.clear();
        navigate("/login");
      }
    };

    try {
      // Execute in parallel for better performance
      await Promise.all([
        axios.get(`${API}/api/admin/analytics`, { headers }).then(res => setData(res.data)).catch(handleAuthError),
        axios.get(`${API}/api/admin/users`, { headers }).then(res => setUsers(res.data)).catch(handleAuthError),
        axios.get(`${API}/api/admin/clubs`, { headers }).then(res => setClubs(res.data)).catch(handleAuthError),
        axios.get(`${API}/api/admin/events`, { headers }).then(res => setEvents(res.data)).catch(handleAuthError)
      ]);
    } catch (error) {
      console.error("Critical fetch error:", error);
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

  const handleDeleteClub = async (clubId) => {
    if (!window.confirm("CRITICAL ACTION: This will permanently delete the club, all its events, member records and applications. THIS CANNOT BE UNDONE. Proceed?")) return;
    
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/api/admin/clubs/${clubId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast("Club and all associated data deleted.");
      fetchData();
    } catch (error) {
      showToast("Failed to delete club.", "error");
    }
  };

  /* 
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
  */

  const handleClubEventsClick = (clubName) => {
    if (clubName && clubName !== "Unknown Club") {
      setActiveTab("events");
      setEventSearch(clubName);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("Are you sure you want to permanently delete this event? This action cannot be undone.")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/api/admin/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast("Event deleted successfully!");
      fetchData();
    } catch (error) {
      showToast("Failed to delete event.", "error");
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

  const filteredEvents = events
    .filter(e => {
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Start of today
      const eventDate = new Date(e.date);
      const isUpcoming = eventDate >= now;
      
      const searchTerm = eventSearch.toLowerCase();
      const dateString = eventDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toLowerCase();
      const searchMatch = e.title?.toLowerCase().includes(searchTerm) ||
                         e.club?.name?.toLowerCase().includes(searchTerm) ||
                         dateString.includes(searchTerm);
      
      return isUpcoming && searchMatch;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const sidebarLinks = [
    { id: "overview", label: "Dashboard Overview", icon: LayoutDashboard },
    { id: "clubs", label: "Club Management", icon: Building2 },
    { id: "users", label: "User Directory", icon: Users },
    { id: "events", label: "Events Control", icon: Calendar },
  ];

  const renderOverview = () => (
    <div className="dashboard-content">
      {/* Stats Grid */}
      <div className="stats-grid">
        {[
          { label: "Total Students", value: data?.stats?.totalStudents || 0, icon: Users, color: "rgba(99,102,241,0.15)", iconColor: "#6366f1" },
          { label: "Active Clubs", value: data?.stats?.totalClubs || 0, icon: Building2, color: "rgba(16,185,129,0.15)", iconColor: "#10b981" },
          { label: "Total Events", value: data?.stats?.totalEvents || 0, icon: Calendar, color: "rgba(245,158,11,0.15)", iconColor: "#f59e0b" },
          { label: "Club Members", value: data?.stats?.totalMembers || 0, icon: Zap, color: "rgba(139,92,246,0.15)", iconColor: "#8b5cf6" },
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
                className="btn-secondary-sm"
                onClick={() => handleClubEventsClick(club.name)}
                style={{ marginRight: "auto" }}
              >
                <Calendar size={14} /> View Events
              </button>
              <button
                className={club.isActive ? "btn-danger-sm" : "btn-success-sm"}
                onClick={() => handleDeactivateClub(club._id, club.isActive)}
                style={{ borderRadius: "10px", padding: "0.6rem 16px", minWidth: "120px", justifyContent: "center" }}
              >
                {club.isActive ? (<><EyeOff size={14} /> Deactivate</>) : (<><Eye size={14} /> Activate</>)}
              </button>
              <button
                className="btn-delete-fancy"
                onClick={() => handleDeleteClub(club._id)}
                title="Permanently Delete Club"
                style={{ minWidth: "100px" }}
              >
                <Trash2 size={14} /> Delete
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
          {isSuperAdmin && (
            <button onClick={() => setShowAdminModal(true)} className="btn-primary" style={{ background: "#ef4444", borderColor: "#ef4444", whiteSpace: "nowrap" }}>
              <Shield size={16} /> Add Admin
            </button>
          )}
          <button onClick={handleExport} className="btn-secondary" style={{ whiteSpace: "nowrap" }}>Export CSV</button>
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
                <td style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{user.department || "General"}</td>
                <td>
                  <div className="role-stack">
                    <span className={`badge-premium badge-${user.globalRole || 'student'}`}>
                      {user.globalRole || 'STUDENT'}
                    </span>
                    {user.isClubLeader && (
                      <span className="badge-premium badge-leader-gold">
                        <Zap size={10} style={{ marginRight: '4px' }} />CLUB LEADER
                      </span>
                    )}
                    {/* Render functional roles from joined clubs */}
                    {user.email === "btbti23099_anisha@banasthali.in" && (
                      <span className="badge-premium" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', fontSize: '0.6rem', marginTop: '4px' }}>
                        Build CV • Design & Experience Team
                      </span>
                    )}
                    {(user.joinedClubs || []).length > 0 && user.email !== "btbti23099_anisha@banasthali.in" && (
                      <span className="badge-premium" style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#94a3b8', fontSize: '0.6rem', marginTop: '4px' }}>
                        Part of {(user.joinedClubs || []).length} Clubs
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ fontWeight: "700", color: "#f8fafc" }}>{user.points || 0} <span style={{ fontSize: '0.7rem', color: '#64748b' }}>PTS</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="admin-container">
      {/* Dynamic Styles */}
      <UserDirectoryStyles />
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
                    activeTab === "events" ? "Events Control" :
                      "Dashboard"
              }
            </h1>
            <p>{activeTab === "overview" ? "Welcome back, Platform Administrator." : `Managing all ${activeTab} on the platform.`}</p>
          </div>
          <div className="header-actions">
            {activeTab === "clubs" && (
              <button className="btn-primary" onClick={() => setShowClubModal(true)}>
                <PlusCircle size={16} /> Create Club
              </button>
            )}
          </div>
        </header>

        {loading ? (
          <div className="centered-state" style={{ padding: "4rem" }}>
            <div className="spinner"></div>
            <p style={{ marginTop: "1rem", color: "#64748b" }}>Loading Dashboard Data...</p>
          </div>
        ) : (() => {
          try {
            return (
              <>
                {activeTab === "overview" && renderOverview()}
                {activeTab === "clubs" && renderClubs()}
                {activeTab === "users" && renderUsers()}
                {activeTab === "events" && (
                  <div className="data-table-container">
                    <div className="table-header">
                      <div>
                        <h2>{eventSearch ? `Clustered: ${eventSearch} Events` : "Global Event Control"}</h2>
                        <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: "4px" }}>
                          {eventSearch ? `Showing all events belonging to the "${eventSearch}" cluster.` : "Monitor and moderate all campus events created by Club Leaders."}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                        {eventSearch && (
                          <button
                            onClick={() => setEventSearch("")}
                            className="btn-secondary-sm"
                            style={{ background: "rgba(255,255,255,0.05)", padding: "8px 12px", borderRadius: "8px" }}
                          >
                            <RefreshCw size={14} style={{ marginRight: '6px' }} /> Show All
                          </button>
                        )}
                        <div className="admin-search-box">
                          <Search size={16} />
                          <input type="text" placeholder="Search events or clubs..." value={eventSearch}
                            onChange={e => setEventSearch(e.target.value)} />
                        </div>
                      </div>
                    </div>
                    <div className="table-wrapper" style={{ overflowX: "auto" }}>
                      <table className="responsive-table">
                        <thead>
                          <tr>
                            <th>Event Info</th>
                            <th>Club</th>
                            <th>Date</th>
                            <th>Created By</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredEvents.map(event => (
                            <tr key={event._id}>
                              <td>
                                <div className="user-cell" style={{ maxWidth: "250px" }}>
                                  {event.image ? (
                                    <img src={event.image} className="user-avatar" alt="" style={{ borderRadius: '8px', objectFit: 'cover' }} />
                                  ) : (
                                    <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 15, flexShrink: 0 }}>
                                      <Calendar size={20} color="#6366f1" />
                                    </div>
                                  )}
                                  <div style={{ overflow: "hidden" }}>
                                    <span className="user-name" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{event.title}</span>
                                    <span className="user-email" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{event.category || "General"}</span>
                                  </div>
                                </div>
                              </td>
                              <td style={{ fontWeight: "600" }}>
                                <span
                                  onClick={() => handleClubEventsClick(event.club?.name)}
                                  style={{ cursor: "pointer", color: "#6366f1" }} className="hover-underline"
                                >
                                  {event.club?.name || "Unknown Club"}
                                </span>
                              </td>
                              <td style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                                {new Date(event.date).toLocaleDateString()} at {event.time || "TBD"}
                              </td>
                              <td style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{event.createdBy?.fullName || "Leader"}</td>
                              <td>
                                <button onClick={() => handleDeleteEvent(event._id)} className="action-btn" style={{ color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.2)" }}>
                                  <XCircle size={14} /> Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                          {filteredEvents.length === 0 && (
                            <tr>
                              <td colSpan="5" style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>
                                <Calendar size={48} style={{ opacity: 0.2, marginBottom: "1rem", display: "inline-block" }} />
                                <h3 style={{ color: "#94a3b8" }}>No Events Found</h3>
                                <p style={{ fontSize: "0.9rem" }}>Clubs haven't posted any events matching your search.</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            );
          } catch (err) {
            console.error("Admin Render Error:", err);
            return (
              <div style={{ padding: '3rem', textAlign: 'center', background: 'white', borderRadius: '12px', margin: '2rem' }}>
                <Shield size={48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
                <h3>Component Rendering Problem</h3>
                <p>There was an issue displaying this data cluster. Try refreshing.</p>
                <button onClick={() => window.location.reload()} className="btn-primary">Reload Dashboard</button>
              </div>
            );
          }
        })()}
      </main>

      {/* Club Creation Modal */}
      {showClubModal && (
        <ClubFormModal
          students={users}
          onClose={() => setShowClubModal(false)}
          onSuccess={(msg) => { showToast(msg); fetchData(); }}
        />
      )}
      {/* Make Admin Modal */}
      {showAdminModal && (
        <MakeAdminModal
          onClose={() => setShowAdminModal(false)}
          onSuccess={(msg) => { showToast(msg); fetchData(); }}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
