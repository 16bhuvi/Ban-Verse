import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import axios from "axios";
import logo from "./banasthali-logo.jpg";
import {
  Users, Calendar, PlusCircle, BarChart3, Trophy,
  LogOut, ShieldAlert, TrendingUp, ClipboardList,
  Settings,
  Trash2, Edit3, X, RefreshCw, Award, ShieldCheck,
  LayoutDashboard, Layers, Megaphone,
  UserPlus, ChevronRight, Search, Filter, ArrowUpRight,
  Clock, CheckCircle2, Zap, XCircle, Image as ImageIcon
} from "lucide-react";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import "./ClubDashboard.css";

import config from "./config";
const API = config.API_BASE_URL;

const ClubDashboard = () => {
  const { clubId } = useParams();
  const [data, setData] = useState(null);
  const [userRole, setUserRole] = useState("member");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [eventCategory, setEventCategory] = useState("All Categories");
  const [applications, setApplications] = useState([]);
  const [appLoading, setAppLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [rolesData, setRolesData] = useState([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [membersSubTab, setMembersSubTab] = useState('applicants');
  const [modalData, setModalData] = useState(null); // Used for dynamic modal forms
  const [editingRole, setEditingRole] = useState(null);
  const [advancedStats, setAdvancedStats] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [memberToEdit, setMemberToEdit] = useState(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  
  const [resultEvent, setResultEvent] = useState(null);
  const [winners, setWinners] = useState([{ userId: "", position: "1st", certificateFile: null }]);
  const [certMode] = useState('manual');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const openModal = (type) => {
    setModalType(type);
    setShowModal(true);
    setModalData(null); // Reset data when opening new modal
  };

  const fetchClubData = useCallback(async (showLoader = false) => {
    try {
      // Only show full-page loader if explicitly asked or we have absolutely no data yet
      if (showLoader) {
        setLoading(true);
      }
      
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user"));

      // Fetch role and dashboard data in parallel to save time
      const rolePromise = clubId 
        ? axios.get(`${API}/api/club/${clubId}/my-role`, { headers: { Authorization: `Bearer ${token}` } })
        : Promise.resolve({ data: { role: user?.isClubLeader ? "leader" : (user?.membershipType === 'Core Member' ? "core" : "member") } });

      const dashboardPromise = axios.get(`${API}/api/club-leader/dashboard${clubId ? `?clubId=${clubId}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const [roleRes, dashRes] = await Promise.all([rolePromise, dashboardPromise]);
      
      setUserRole(roleRes.data.role);
      setData(dashRes.data);

    } catch (error) {
      console.error("Club fetch error:", error);
      if (error.response?.status === 403 || error.response?.status === 401) {
        localStorage.clear();
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [clubId, navigate]);

  const handleAuthError = useCallback((err) => {
    console.error("Auth Error:", err);
    if (err.response?.status === 403 || err.response?.status === 401) {
      localStorage.clear();
      navigate("/login");
    }
  }, [navigate]);

  const fetchMembers = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/api/club-leader/members${clubId ? `?clubId=${clubId}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMembers(res.data);
    } catch (err) { handleAuthError(err); }
  }, [clubId, handleAuthError]);

  const fetchAdvancedStats = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/api/analytics/advanced`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdvancedStats(res.data);
    } catch (err) { 
      handleAuthError(err); 
    } finally {
      setAnalyticsLoading(false);
    }
  }, [handleAuthError]);


  const fetchApplications = useCallback(async () => {
    setAppLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/api/club-leader/applications${clubId ? `?clubId=${clubId}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApplications(res.data);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setAppLoading(false);
    }
  }, [clubId, handleAuthError]);

  const handlePublishResults = async () => {
    if (!resultEvent || winners.some(w => !w.userId)) {
      showToast("Please select an event and all winners", "error");
      return;
    }
    
    // Check if certificates are uploaded for winners since we are in Manual Mode
    if (winners.some(w => !w.certificateFile)) {
      showToast("Please upload the custom certificates for all winners first.", "error");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      // Map winners and include the certificate data for storage
      const finalWinners = winners.map(w => ({
         userId: w.userId,
         position: w.position,
         certificateUrl: w.certificateFile
      }));

      await axios.post(`${API}/api/club-leader/events/${resultEvent._id}/results`, 
        { winners: finalWinners }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast("Results and certificates published successfully!");
      setActiveTab("overview");
      setResultEvent(null);
      setWinners([{ userId: "", position: "1st", certificateFile: null }]);
      fetchClubData();
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to publish results", "error");
    }
  };

  const addWinnerField = () => setWinners([...winners, { userId: "", position: "", certificateFile: null }]);
  const removeWinnerField = (index) => setWinners(winners.filter((_, i) => i !== index));
  const updateWinner = (index, field, value) => {
    const newWinners = [...winners];
    newWinners[index][field] = value;
    setWinners(newWinners);
  };
  
  const handleWinnerFileChange = (index, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const newWinners = [...winners];
      newWinners[index].certificateFile = reader.result;
      setWinners(newWinners);
    };
    reader.readAsDataURL(file);
  };

  const handleApprove = async (appId, membershipType, domain) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API}/api/club-leader/applications/${appId}/approve`,
        { membershipType, domain, clubId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast('Application approved!');
      fetchApplications();
      fetchClubData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Approval failed', 'error');
    }
  };

  const handleReject = async (appId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API}/api/club-leader/applications/${appId}/reject`, { clubId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast('Application rejected.');
      fetchApplications();
    } catch (err) {
      showToast('Rejection failed', 'error');
    }
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user?.globalRole === "admin") {
      navigate("/admindashboard");
      return;
    }
    fetchClubData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, fetchClubData]);

  const stats = data?.stats || {};
  const charts = data?.charts || {};
  const events = data?.events || [];
  const club = data?.club;
  const permissions = data?.permissions || {}; // From our new backend logic

  const user = JSON.parse(localStorage.getItem("user"));
  const isDirectLeader = userRole === 'leader' || club?.leaderId?.email === user?.email || club?.leader?.email === user?.email || club?.email === user?.email;

  const canManageMembers = isDirectLeader || permissions.canManageMembers;
  const canManageEvents = isDirectLeader || permissions.canCreateEvents;
  const canViewAnalytics = isDirectLeader || permissions.canViewAnalytics;
  const canSendNotifs = isDirectLeader || permissions.canSendNotifications;
  const canUploadPhotos = isDirectLeader || permissions.canUploadPhotos;
  const canManageResults = isDirectLeader || permissions.canManageResults;

  const fetchRolesData = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/api/club-leader/roles${clubId ? `?clubId=${clubId}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRolesData(res.data);
    } catch (err) {
      handleAuthError(err);
    }
  }, [clubId, handleAuthError]);

  useEffect(() => {
    if (activeTab === 'applications' && applications.length === 0) fetchApplications();
    if (activeTab === 'analytics' && !advancedStats) fetchAdvancedStats();
    if (['roles', 'roles-core', 'roles-subcore', 'members'].includes(activeTab) && (members.length === 0 || !members)) {
       fetchRolesData();
       fetchMembers();
    }
  }, [activeTab, fetchApplications, fetchRolesData, fetchMembers, fetchAdvancedStats, applications.length, members, advancedStats]);


  const [announcementText, setAnnouncementText] = useState("");
  const [announcements, setAnnouncements] = useState([]);

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/api/club-leader/delete-event/${eventId}${clubId ? `?clubId=${clubId}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Event deleted successfully');
      fetchClubData();
    } catch (err) {
      showToast('Deletion failed', 'error');
    }
  };

  const handlePostAnnouncement = async () => {
    if (!announcementText.trim()) return;
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/api/club-leader/notify`, {
        message: announcementText,
        target: "members",
        clubId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Announcement broadcasted to all members');
      setShowModal(false);
      setAnnouncementText("");
      // Add to local state for instant feedback
      setAnnouncements(prev => [{
        title: "New Announcement",
        sender: "You",
        date: "Just now",
        text: announcementText
      }, ...prev]);
    } catch (err) {
      showToast('Broadcast failed', 'error');
    }
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      if (editingRole?._id) {
        await axios.put(`${API}/api/club-leader/roles/${editingRole._id}`, { ...editingRole, clubId }, { headers: { Authorization: `Bearer ${token}` } });
        showToast('Role updated successfully');
      } else {
        await axios.post(`${API}/api/club-leader/roles`, { ...editingRole, clubId }, { headers: { Authorization: `Bearer ${token}` } });
        showToast('Role created successfully');
      }
      setShowRoleModal(false);
      fetchRolesData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save role', 'error');
    }
  };

  const handlePromoteMember = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API}/api/club-leader/members/${memberToEdit._id}/promote`, {
        roleId: memberToEdit.assignedRoleId || null,
        customTitle: memberToEdit.customTitle || "",
        clubId
      }, { headers: { Authorization: `Bearer ${token}` } });
      showToast('Member assigned to team successfully');
      setShowMemberModal(false);
      fetchClubData();
    } catch (err) {
      console.error("Promote error:", err.response?.data || err.message);
      showToast(err.response?.data?.error || 'Assign action failed', 'error');
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm("Remove this moment from the gallery?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/api/club-leader/gallery/photo/${photoId}${clubId ? `?clubId=${clubId}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Moment removed');
      fetchClubData();
    } catch (err) {
      showToast('Failed to delete photo', 'error');
    }
  };


  const mainLinks = [
    { id: "overview", label: "Overview", icon: LayoutDashboard, roles: ["leader", "core", "subcore", "member"] },
    { id: "events", label: "Events", icon: Calendar, roles: ["leader", "core", "subcore", "member"] },
    { id: "results", label: "Results", icon: Trophy, roles: ["leader", "core"] },
    { id: "analytics", label: "Analytics", icon: BarChart3, roles: ["leader", "core"] },
    { id: "announcements", label: "Broadcast", icon: Megaphone, roles: ["leader", "core", "subcore", "member"] },
    { id: "gallery", label: "Gallery", icon: ImageIcon, roles: ["leader", "core", "subcore", "member"] },
  ];

  const adminLinks = [
    { id: "members", label: "Members", icon: Users, reqPerm: "canManageMembers" },
    { id: "roles-core", label: "Add Core Team", icon: ShieldAlert, reqPerm: "isDirectLeader" },
    { id: "roles-subcore", label: "Add Subcore Team", icon: Layers, reqPerm: "isDirectLeader" },
    { id: "club-profile", label: "Club Profile", icon: Settings, reqPerm: "canEditClubProfile" },
  ];

  const isAnyStaff = ["leader", "core", "subcore"].includes(userRole) || isDirectLeader;
  const filteredMainLinks = mainLinks.filter(link => {
    if (link.id === "analytics") return canViewAnalytics;
    if (link.id === "results") return canManageResults;
    return isAnyStaff || link.roles.includes(userRole);
  });

  const filteredAdminLinks = adminLinks.filter(link => {
     if (link.reqPerm === "isDirectLeader") return isDirectLeader;
     if (link.reqPerm === "canManageMembers") return canManageMembers;
     if (link.reqPerm === "canEditClubProfile") return isDirectLeader || permissions.canEditClubProfile;
     return false;
  });

  // ── Application row component (inline) ──────────────────────
  const ApplicationRow = ({ app }) => {
    const [form, setForm] = useState({ membershipType: 'General Member', domain: '' });
    const [expanded, setExpanded] = useState(false);
    const club = data?.club;
    const domains = club?.domains || [];

    if (app.status !== 'pending') {
      return (
        <div className="app-row app-row-done">
          <div className="app-row-left">
            <img src={app.userId?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(app.userId?.fullName || 'U')}&background=6366f1&color=fff`} alt="" className="app-avatar" />
            <div>
              <div className="app-name">{app.userId?.fullName}</div>
              <div className="app-email">{app.userId?.email}</div>
              {app.message && <div className="app-message">&quot;{app.message}&quot;</div>}
            </div>
          </div>
          <span className={`app-status-badge ${app.status}`}>{app.status.toUpperCase()}</span>
        </div>
      );
    }

    return (
      <div className="app-row">
        <div className="app-row-left">
          <img src={app.userId?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(app.userId?.fullName || 'U')}&background=6366f1&color=fff`} alt="" className="app-avatar" />
          <div>
            <div className="app-name">{app.userId?.fullName}</div>
            <div className="app-email">{app.userId?.email} • {app.userId?.department}</div>
            {app.message && <div className="app-message">&quot;{app.message}&quot;</div>}
            {app.preferredDomain && <div className="app-preferred-domain">Prefers: {app.preferredDomain}</div>}
          </div>
        </div>
        <div className="app-row-actions">
          {!expanded ? (
            <button className="btn-approve-preview" onClick={() => setExpanded(true)}>
              <CheckCircle2 size={14} /> Review
            </button>
          ) : (
            <div className="app-review-form">
              <select value={form.membershipType}
                onChange={e => setForm(f => ({ ...f, membershipType: e.target.value }))}>
                <option value="General Member">General Member</option>
                <option value="Core Member">Core Member</option>
              </select>
              <select value={form.domain}
                onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}>
                <option value="">-- Assign Domain --</option>
                {domains.map(d => <option key={d._id || d.name} value={d.name}>{d.name}</option>)}
              </select>
              <button className="btn-approve"
                onClick={() => handleApprove(app._id, form.membershipType, form.domain)}>
                <CheckCircle2 size={14} /> Approve
              </button>
              <button className="btn-reject" onClick={() => { setExpanded(false); handleReject(app._id); }}>
                <XCircle size={14} /> Reject
              </button>
              <button className="btn-cancel-sm" onClick={() => setExpanded(false)}><X size={14} /></button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="club-layout">
      {/* Toast Notification */}
      {toast && (
        <div className={`toast-notification toast-${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)}><X size={14} /></button>
        </div>
      )}

      {/* Sidebar */}
      <aside className="club-sidebar">
        <div className="sidebar-brand">
          <img src={logo} alt="Banasthali Logo" className="sidebar-logo-img" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
          <span className="brand-text">Banverse</span>
        </div>

        <div className={`role-badge role-${userRole}`}>
          {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
        </div>

        <div className="nav-section">
          <h4 className="nav-label">Dashboard</h4>
          {filteredMainLinks.map(link => (
            <button
              key={link.id}
              onClick={() => setActiveTab(link.id)}
              className={`nav-item ${activeTab === link.id ? 'active' : ''}`}
            >
              <link.icon size={20} /> <span>{link.label}</span>
            </button>
          ))}
        </div>

        {filteredAdminLinks.length > 0 && (
          <div className="nav-section" style={{ marginTop: '2rem' }}>
            <h4 className="nav-label">Leader Settings</h4>
            {filteredAdminLinks.map(link => (
              <button
                key={link.id}
                onClick={() => {
                  if (link.id === 'club-profile') {
                    navigate("/clubprofile");
                  } else {
                    setActiveTab(link.id);
                  }
                }}
                className={`nav-item ${activeTab === link.id ? 'active' : ''}`}
              >
                <link.icon size={20} /> <span>{link.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className="logout-container">
          {JSON.parse(localStorage.getItem("user"))?.globalRole === "student" && (
            <button
              onClick={() => { localStorage.setItem("role", "student"); navigate("/studentdashboard"); }}
              className="nav-item"
              style={{ color: '#6366f1', marginBottom: '0.5rem', background: 'rgba(99, 102, 241, 0.1)' }}
            >
              <Users size={20} /> <span>Student Dashboard</span>
            </button>
          )}
          <button
            onClick={() => { localStorage.clear(); navigate("/login"); }}
            className="nav-item"
            style={{ color: '#ef4444' }}
          >
            <LogOut size={20} /> <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="club-main">
        {loading ? 
           <div className="loading-screen-inline" style={{ padding: '8rem 2rem', textAlign: 'center' }}>
              <div className="custom-spinner" style={{ margin: '0 auto' }}></div>
              <p style={{ marginTop: '1.5rem', color: '#64748b', fontWeight: 500 }}>Initializing Club Dashboard...</p>
           </div>
        : !club ? (
          <div className="empty-dashboard-container">
            <div className="empty-state-card">
              <div className="empty-state-icon"><ShieldAlert size={60} /></div>
              <h2>Club Profile Not Found</h2>
              <p>Your account is designated as a Club Leader, but you haven't set up your club's public profile yet. Setting up a profile allows students to discover and join your club.</p>
              <div className="empty-actions">
                <button onClick={() => navigate("/clubprofile")} className="btn-primary">
                  <Settings size={20} /> Create Club Profile
                </button>
                <button onClick={() => navigate("/home")} className="btn-secondary">
                  Return Home
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <header className="main-header">
              <div className="club-branding">
                <div className="club-logo-wrapper">
                  <img
                    src={club.logo || `https://ui-avatars.com/api/?name=${club.name}&background=6366f1&color=fff`}
                    className="club-logo-img"
                    alt="Logo"
                  />
                </div>
                <div className="club-info-text">
                  <h1>{club.name}</h1>
                  <div className="header-meta">
                    <span className="category-pill">{club.category}</span>
                    <span className="member-count"><Users size={14} /> {stats.totalMembers} Members</span>
                  </div>
                </div>
              </div>
              <div className="action-group">
                {canManageEvents && (
                  <button onClick={() => openModal('createEvent')} className="btn-primary">
                    <PlusCircle size={18} /> New Event
                  </button>
                )}
              </div>
            </header>

            <div className="tab-content" style={{ minHeight: '400px' }}>
              {(() => {
                try {
                  return (
                    <>
                      {activeTab === 'overview' && (
                <div className="overview-tab">
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-header">
                        <Users size={20} className="text-indigo" />
                      </div>
                      <div className="stat-value">{stats.totalMembers}</div>
                      <div className="stat-label">Verified Members</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-header">
                        <Calendar size={20} className="text-green" />
                      </div>
                      <div className="stat-value">{stats.totalEvents}</div>
                      <div className="stat-label">Total Events</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-header">
                        <TrendingUp size={20} className="text-purple" />
                      </div>
                      <div className="stat-value">{stats.engagementScore}</div>
                      <div className="stat-label">Community Pulse</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-header">
                        <ShieldAlert size={20} className="text-orange" />
                      </div>
                      <div className="stat-value">{applications.filter(a => a.status === 'pending').length}</div>
                      <div className="stat-label">Aspiring Members</div>
                    </div>
                  </div>

                  <div className="dashboard-grid">
                    <div className="grid-left">
                      <div className="dash-card">
                        <div className="card-header">
                          <h3>Club Insights</h3>
                        </div>
                        <div className="activity-list" style={{ padding: '1.5rem' }}>
                          <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.6' }}>
                            Welcome to your club management dashboard. From here, you can manage <strong>{stats.totalMembers} members</strong>, 
                            oversee <strong>{events.length} events</strong>, and track student engagement in real-time. 
                            Use the sidebar to post announcements or review new membership applications.
                          </p>
                        </div>
                      </div>

                      <div className="dash-card">
                        <div className="card-header">
                          <h3>Upcoming Events</h3>
                        </div>
                        <div className="event-mini-list">
                          {events.filter(e => !e.isPast && new Date(e.date).getTime() >= new Date().setHours(0,0,0,0)).slice(0, 3).map((event, i) => (
                            <div key={i} className="event-mini-card">
                              <div className="event-date">
                                <span className="day">{new Date(event.date).getDate()}</span>
                                <span className="month">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                              </div>
                              <div className="event-details">
                                <h4>{event.title}</h4>
                                <p><Clock size={12} /> {event.time || "10:00 AM"}</p>
                              </div>
                              <ChevronRight size={18} className="text-muted" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid-right">
                      <div className="dash-card">
                        <div className="card-header">
                          <div className="header-text-group">
                            <h3 className="chart-title">Member Domain Distribution</h3>
                            <p className="chart-subtitle" style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px' }}>Breakdown of members by their specialized fields</p>
                          </div>
                        </div>
                        <div className="chart-box">
                          {charts.categoryBreakdown && charts.categoryBreakdown.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                              <PieChart>
                                <Pie data={charts.categoryBreakdown} innerRadius={50} outerRadius={70} dataKey="value">
                                  {charts.categoryBreakdown.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="empty-chart-msg" style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                              No member distribution data available
                            </div>
                          )}
                        </div>
                        <div className="chart-legend">
                          {charts.categoryBreakdown?.map((entry, i) => (
                            <div key={i} className="legend-item">
                              <span className="dot" style={{ background: COLORS[i % COLORS.length] }}></span>
                              <span className="label">{entry.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="dash-card">
                        <div className="card-header">
                          <h3>Club Information</h3>
                          <button className="text-btn" onClick={() => navigate("/clubprofile")}>Edit Profile</button>
                        </div>
                        <div className="activity-list" style={{ padding: '1.5rem' }}>
                           <div style={{ marginBottom: '1rem' }}>
                              <strong style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Category</strong>
                              <span style={{ fontSize: '1rem', fontWeight: 600 }}>{club.category} Society</span>
                           </div>
                           <div>
                              <strong style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Status</strong>
                              <span style={{ color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                 <CheckCircle2 size={16} /> Verified Active Club
                              </span>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {['roles-core', 'roles-subcore'].includes(activeTab) && (
                <div className="roles-tab">
                  <div className="dash-card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div className="header-text" style={{ flex: '1 1 auto' }}>
                        <h3>{activeTab === 'roles-core' ? 'Core Team Governance' : 'Sub-Core Structure'}</h3>
                        <p className="chart-subtitle" style={{ margin: '4px 0 0 0' }}>Create and manage {activeTab === 'roles-core' ? 'Tier 2 Core members' : 'Tier 3 Sub-core operational roles'}</p>
                      </div>
                      <button className="btn-primary" style={{ width: 'auto', alignSelf: 'center', flexShrink: 0 }} onClick={() => { 
                        setEditingRole({ tierLevel: activeTab === 'roles-core' ? 2 : 3, permissions: { canCreateEvents: false, canSendNotifications: false, canManageMembers: false, canUploadPhotos: false } }); 
                        setShowRoleModal(true); 
                      }}>
                        <PlusCircle size={16} /> {activeTab === 'roles-core' ? 'Add Core Role' : 'Add Sub-core Role'}
                      </button>
                    </div>
                    <div className="table-container" style={{ padding: '1rem' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Role / Team Name</th>
                            <th>Tier</th>
                            <th>Permissions</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rolesData.filter(r => r.tierLevel === (activeTab === 'roles-core' ? 2 : 3)).length === 0 && (
                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No {activeTab === 'roles-core' ? 'Core' : 'Sub-core'} roles defined yet.</td></tr>
                          )}
                          {rolesData.filter(r => r.tierLevel === (activeTab === 'roles-core' ? 2 : 3)).map(role => (
                            <tr key={role._id}>
                              <td><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: activeTab === 'roles-core' ? '#6366f1' : '#f59e0b' }}></div>
                                <strong>{role.roleName}</strong>
                              </div></td>
                              <td>{role.tierLevel === 2 ? 'Core Team' : 'Sub-Core'}</td>
                              <td>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                  {role.permissions?.canCreateEvents && <span className="cat-badge" style={{ background: '#dcfce7', color: '#16a34a', fontSize: '10px' }}>Events</span>}
                                  {role.permissions?.canSendNotifications && <span className="cat-badge" style={{ background: '#e0e7ff', color: '#4f46e5', fontSize: '10px' }}>Notifs</span>}
                                  {role.permissions?.canManageMembers && <span className="cat-badge" style={{ background: '#fef3c7', color: '#d97706', fontSize: '10px' }}>Admin</span>}
                                  {role.permissions?.canUploadPhotos && <span className="cat-badge" style={{ background: '#fce7f3', color: '#db2777', fontSize: '10px' }}>Gallery</span>}
                                </div>
                              </td>
                              <td>
                                <button className="btn-icon-sm" onClick={() => { setEditingRole(role); setShowRoleModal(true); }}><Edit3 size={14} /></button>
                                <button className="btn-icon-sm danger" onClick={async () => {
                                  if(!window.confirm("Delete this role?")) return;
                                  try {
                                    const token = localStorage.getItem("token");
                                    await axios.delete(`${API}/api/club-leader/roles/${role._id}${clubId ? `?clubId=${clubId}` : ''}`, { headers: { Authorization: `Bearer ${token}` } });
                                    fetchRolesData();
                                    showToast("Role removed");
                                  } catch (e) { showToast("Failed to delete", "error"); }
                                }}><Trash2 size={14} /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'events' && (
                <div className="events-tab">
                  <div className="filter-bar-premium" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                    <div className="search-group-modern" style={{ flex: '1 1 300px' }}>
                      <div className="search-icon-wrapper">
                        <Search size={18} />
                      </div>
                      <input
                        type="text"
                        className="search-input-modern"
                        placeholder="Filter through club events..."
                        value={eventSearch}
                        onChange={(e) => setEventSearch(e.target.value)}
                      />
                      {eventSearch && <button onClick={() => setEventSearch('')} className="clear-search"><X size={14} /></button>}
                    </div>
                    <div className="filter-actions-group" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <div className="filter-chip-select" style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '0.5rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                         <Filter size={14} color="#64748b" /> 
                         <select 
                            value={eventCategory} 
                            onChange={(e) => setEventCategory(e.target.value)}
                            style={{ background: 'transparent', border: 'none', outline: 'none', color: '#1e293b', fontWeight: 500, cursor: 'pointer' }}
                         >
                            <option value="All Categories">All Categories</option>
                            <option value="Technical">Technical</option>
                            <option value="Workshop">Workshop</option>
                            <option value="Cultural">Cultural</option>
                            <option value="Sports">Sports</option>
                            <option value="Seminar">Seminar</option>
                            <option value="Hackathon">Hackathon</option>
                            <option value="Entrepreneurship">Entrepreneurship</option>
                         </select>
                      </div>
                      {canManageEvents && (
                        <button onClick={() => openModal('createEvent')} className="btn-create-modern pulse-on-hover" style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '0.5rem 1.2rem', borderRadius: '8px', background: '#6366f1', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                           <PlusCircle size={18} /> <span>New Event</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="events-stacked-layout" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                    <div className="events-section">
                      <h3 style={{ marginBottom: '1.25rem', borderBottom: '3px solid #6366f1', paddingBottom: '0.5rem', display: 'inline-block', fontSize: '1.1rem', color: '#1e293b' }}>Latest & Upcoming Events</h3>
                      <div className="events-grid-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        {events.filter(e => (!e.isPast && new Date(e.date).getTime() >= new Date().setHours(0,0,0,0))).filter(e => eventCategory === "All Categories" || e.category === eventCategory).filter(e => e.title.toLowerCase().includes(eventSearch.toLowerCase())).map((event, i) => (
                          <div key={i} className="event-card-premium" style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                            <div className="event-image" style={{ position: 'relative', height: '160px', overflow: 'hidden' }}>
                              <img src={event.poster || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800"} alt="Poster" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <div className="event-badge" style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(255,255,255,0.9)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, color: '#6366f1' }}>{event.category || "General"}</div>
                            </div>
                            <div className="event-body" style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: '#1e293b' }}>{event.title}</h3>
                              <div className="event-info" style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} /> {new Date(event.date).toLocaleDateString()}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={14} /> {event.participants?.length || 0} Joined</span>
                              </div>
                              <div className="event-footer" style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <button className="btn-secondary" style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate(`/viewpost/${event._id}`)}>View Details</button>
                                {canManageEvents && (
                                  <div className="admin-actions" style={{ display: 'flex', gap: '8px' }}>
                                    <button className="icon-btn" style={{ background: '#e0e7ff', color: '#4f46e5', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', display: 'flex' }} onClick={() => navigate("/createpost", { state: { editEvent: event } })} title="Edit Event"><Edit3 size={16} /></button>
                                    <button className="icon-btn danger" style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', display: 'flex' }} onClick={() => handleDeleteEvent(event._id)} title="Delete Event"><Trash2 size={16} /></button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {events.filter(e => (!e.isPast && new Date(e.date).getTime() >= new Date().setHours(0,0,0,0))).filter(e => eventCategory === "All Categories" || e.category === eventCategory).filter(e => e.title.toLowerCase().includes(eventSearch.toLowerCase())).length === 0 && (
                          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '12px', gridColumn: '1 / -1' }}>
                            <Calendar size={24} style={{ opacity: 0.5, marginBottom: '8px' }} />
                            <p>No upcoming events found.</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="events-section">
                      <h3 style={{ marginBottom: '1.25rem', borderBottom: '3px solid #94a3b8', paddingBottom: '0.5rem', display: 'inline-block', fontSize: '1.1rem', color: '#64748b' }}>Past Events</h3>
                      <div className="events-grid-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', opacity: 0.85 }}>
                        {events.filter(e => (e.isPast || new Date(e.date).getTime() < new Date().setHours(0,0,0,0))).filter(e => eventCategory === "All Categories" || e.category === eventCategory).filter(e => e.title.toLowerCase().includes(eventSearch.toLowerCase())).map((event, i) => (
                          <div key={i} className="event-card-premium" style={{ background: '#f8fafc', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                            <div className="event-image" style={{ position: 'relative', height: '140px', overflow: 'hidden', filter: 'grayscale(30%)' }}>
                              <img src={event.poster || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800"} alt="Poster" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <div className="event-badge" style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(255,255,255,0.9)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>{event.category || "General"}</div>
                            </div>
                            <div className="event-body" style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                              <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#475569' }}>{event.title}</h3>
                              <div className="event-info" style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} /> {new Date(event.date).toLocaleDateString()}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={14} /> {event.participants?.length || 0} Joined</span>
                              </div>
                              <div className="event-footer" style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <button className="btn-secondary" style={{ background: 'transparent', color: '#64748b', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate(`/viewpost/${event._id}`)}>View Log</button>
                                {canManageEvents && (
                                  <div className="admin-actions" style={{ display: 'flex', gap: '8px' }}>
                                    <button className="icon-btn" style={{ background: 'transparent', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px', cursor: 'pointer', display: 'flex' }} onClick={() => navigate("/createpost", { state: { editEvent: event } })} title="Edit Data"><Edit3 size={14} /></button>
                                    <button className="icon-btn danger" style={{ background: 'transparent', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '4px', padding: '4px', cursor: 'pointer', display: 'flex' }} onClick={() => handleDeleteEvent(event._id)} title="Delete Event"><Trash2 size={14} /></button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {events.filter(e => (e.isPast || new Date(e.date).getTime() < new Date().setHours(0,0,0,0))).filter(e => eventCategory === "All Categories" || e.category === eventCategory).filter(e => e.title.toLowerCase().includes(eventSearch.toLowerCase())).length === 0 && (
                          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '12px', gridColumn: '1 / -1' }}>
                            <p>No past events found.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'members' && (
                <div className="members-tab">
                  {/* Sub-tab switcher */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
                    <button
                      onClick={() => setMembersSubTab('applicants')}
                      className={membersSubTab === 'applicants' ? 'btn-primary' : 'btn-secondary'}
                      style={{ width: 'auto', borderRadius: '10px' }}
                    >
                      Club Applicants
                    </button>
                    <button
                      onClick={() => setMembersSubTab('official')}
                      className={membersSubTab === 'official' ? 'btn-primary' : 'btn-secondary'}
                      style={{ width: 'auto', borderRadius: '10px' }}
                    >
                      Official Members
                    </button>
                  </div>

                  {membersSubTab === 'applicants' && (
                    <div className="dash-card">
                      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                          <h3>Club Applicants</h3>
                          <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '4px' }}>Students who clicked "Join Club" — assign them to a team to make them official members.</p>
                        </div>
                        <div className="search-box-small">
                          <Search size={16} />
                          <input type="text" placeholder="Search..." value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} />
                        </div>
                      </div>
                      <div className="table-container">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Student</th>
                              <th>Status</th>
                              <th>Applied</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(members.length > 0 ? members : (club?.members || [])).filter(m => !m.roleId && !m.isLeader).filter(m => {
                              const name = (m.userId?.fullName || m.user?.fullName || '').toLowerCase();
                              const email = (m.userId?.email || m.user?.email || '').toLowerCase();
                              return name.includes(memberSearch.toLowerCase()) || email.includes(memberSearch.toLowerCase());
                            }).map((m, i) => {
                              const member = m.userId || m.user;
                              if (!member) return null;
                              return (
                                <tr key={i}>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <img src={member.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.fullName)}&background=6366f1&color=fff`} alt="Avatar" style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }} />
                                      <div>
                                        <div style={{ fontWeight: 700, color: '#1e293b' }}>{member.fullName}</div>
                                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{member.email}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td><span className="cat-badge" style={{ background: '#fff7ed', color: '#ea580c', fontSize: '11px' }}>Pending Assignment</span></td>
                                  <td style={{ color: '#64748b', fontSize: '0.82rem' }}>{m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : 'N/A'}</td>
                                  <td>
                                    <button className="btn-primary" style={{ width: 'auto', fontSize: '0.78rem', padding: '6px 12px' }} onClick={() => { setMemberToEdit({...m, assignedRoleId: ''}); setShowMemberModal(true); }}>
                                      Assign to Team
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                            {(members.length > 0 ? members : (club?.members || [])).filter(m => !m.roleId && !m.isLeader).length === 0 && (
                              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                                <UserPlus size={32} style={{ opacity: 0.2, marginBottom: '8px' }} />
                                <p style={{ margin: 0 }}>No pending applicants. Share your club to attract members!</p>
                              </td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {membersSubTab === 'official' && (
                    <div className="dash-card">
                      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                          <h3>Official Team Members</h3>
                          <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '4px' }}>Students assigned to a team with specific responsibilities.</p>
                        </div>
                        <div className="search-box-small">
                          <Search size={16} />
                          <input type="text" placeholder="Search..." value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} />
                        </div>
                      </div>
                      <div className="table-container">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Member</th>
                              <th>Team / Role</th>
                              <th>Responsibilities</th>
                              <th>Joined</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(members.length > 0 ? members : (club?.members || [])).filter(m => m.roleId || m.isLeader).filter(m => {
                              const name = (m.userId?.fullName || m.user?.fullName || '').toLowerCase();
                              return name.includes(memberSearch.toLowerCase());
                            }).map((m, i) => {
                              const member = m.userId || m.user;
                              if (!member) return null;
                              return (
                                <tr key={i}>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <img src={member.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.fullName)}&background=6366f1&color=fff`} alt="Avatar" style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }} />
                                      <div>
                                        <div style={{ fontWeight: 700 }}>{member.fullName}</div>
                                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{member.email}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td><span className={`badge-role ${m.isLeader ? 'leader' : 'core'}`}>{m.isLeader ? 'Club Leader' : (m.roleId?.roleName || m.membershipType || 'Team Member')}</span></td>
                                  <td style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: '200px' }}>{m.isLeader ? 'Administrator' : (m.customTitle || '—')}</td>
                                  <td style={{ fontSize: '0.82rem', color: '#64748b' }}>{m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : 'N/A'}</td>
                                  <td style={{ display: 'flex', gap: '6px' }}>
                                    {!m.isLeader && (
                                      <>
                                        <button className="btn-icon-sm" onClick={() => { setMemberToEdit({...m, assignedRoleId: m.roleId?._id || m.roleId || ''}); setShowMemberModal(true); }}><Edit3 size={14} /></button>
                                        <button className="btn-icon-sm danger" onClick={async () => {
                                          if(!window.confirm('Remove member from club?')) return;
                                          try {
                                            const token = localStorage.getItem('token');
                                            await axios.delete(`${API}/api/club-leader/members/${m._id}${clubId ? `?clubId=${clubId}` : ''}`, { headers: { Authorization: `Bearer ${token}` } });
                                            fetchClubData(); showToast('Member removed');
                                          } catch(e) { showToast('Failed','error'); }
                                        }}><Trash2 size={14} /></button>
                                      </>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                            {(members.length > 0 ? members : (club?.members || [])).filter(m => m.roleId || m.isLeader).length === 0 && (
                              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                                <ShieldAlert size={32} style={{ opacity: 0.2, marginBottom: '8px' }} />
                                <p style={{ margin: 0 }}>No official members yet. Assign applicants to teams first.</p>
                              </td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'results' && (
                <div className="results-tab">
                  <div className="welcome-card" style={{ background: '#1e293b', color: 'white', marginBottom: '1.5rem' }}>
                    <div className="welcome-text">
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Result Center 🏆</h2>
                      <p>Finalize event participants and reward the top performers with digital certificates.</p>
                    </div>
                  </div>

                  {!resultEvent ? (
                    <div className="dash-card">
                      <div className="card-header">
                        <h3>Select Event to Finalize</h3>
                      </div>
                      <div className="events-grid-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', padding: '1.5rem' }}>
                        {(data?.events || []).filter(e => e.isPast || new Date(e.date) < new Date()).map(event => (
                          <div key={event._id} className="event-card-compact" style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' }}>
                             <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px' }}>{event.title}</h4>
                             <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>{new Date(event.date).toLocaleDateString()} • {event.participants?.length || 0} Registered</p>
                             <button className="btn-primary" style={{ width: '100%', padding: '8px' }} onClick={() => setResultEvent(event)}>Select Event</button>
                          </div>
                        ))}
                        {(data?.events || []).filter(e => e.isPast || new Date(e.date) < new Date()).length === 0 && (
                          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No concluded events found to publish results.</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="dash-card result-editor" style={{ padding: '2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '1rem', marginBottom: '2rem' }}>
                        <div>
                          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Publishing: {resultEvent.title}</h2>
                          <p style={{ fontSize: '13px', color: '#64748b' }}>Select the winners from all registered participants.</p>
                        </div>
                        <button className="text-btn" onClick={() => setResultEvent(null)}><X size={18} /> Cancel</button>
                      </div>

                      <div className="winners-form" style={{ maxWidth: '600px' }}>
                        {winners.map((winner, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '12px', marginBottom: '1rem', alignItems: 'flex-end' }}>
                            <div style={{ flex: 2 }}>
                               <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Participant</label>
                               <select 
                                 value={winner.userId} 
                                 onChange={(e) => updateWinner(idx, 'userId', e.target.value)}
                                 style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                               >
                                 <option value="">-- Choose Participant --</option>
                                 {(resultEvent.participants || []).map(p => (
                                   <option key={p._id || p} value={p._id || p}>{p.fullName || p}</option>
                                 ))}
                               </select>
                            </div>
                            <div style={{ flex: 1 }}>
                               <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Rank / Position</label>
                               <input 
                                 type="text" 
                                 placeholder="e.g. 1st, 2nd, Winner" 
                                 value={winner.position} 
                                 onChange={(e) => updateWinner(idx, 'position', e.target.value)}
                                 style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                               />
                            </div>
                            {winners.length > 1 && (
                              <button onClick={() => removeWinnerField(idx)} style={{ padding: '10px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer' }}><Trash2 size={18} /></button>
                            )}
                          </div>
                        ))}
                        
                        <div className="certificate-config" style={{ margin: '2rem 0', padding: '1.5rem', background: 'rgba(99, 102, 241, 0.03)', borderRadius: '16px', border: '1px dashed #6366f1' }}>
                          <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Award size={18} color="#6366f1" /> Upload Official Certificates
                          </h4>
                          
                          <div className="upload-notice" style={{ padding: '1rem', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#475569' }}>Please upload the custom certificate files for each winner below:</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {winners.map((w, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 600 }}>{idx + 1}. {w.position || 'Winner'} Slot</span>
                                    <span style={{ fontSize: '10px', color: w.certificateFile ? '#10b981' : '#ef4444' }}>
                                      {w.certificateFile ? '✅ File Ready' : '⚠️ Upload Required'}
                                    </span>
                                  </div>
                                  <input 
                                    type="file" 
                                    accept="image/*,application/pdf" 
                                    onChange={(e) => handleWinnerFileChange(idx, e.target.files[0])}
                                    style={{ fontSize: '11px', color: '#64748b', maxWidth: '200px' }} 
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <button className="text-btn" onClick={addWinnerField} style={{ marginBottom: '2rem', fontSize: '13px', display: 'block' }}>
                          + Add Another Winner / Position
                        </button>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <button className="btn-primary" style={{ padding: '12px 30px', minWidth: '200px' }} onClick={handlePublishResults}>
                            Confirm & Publish To Platform
                          </button>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '13px' }}>
                            <ShieldCheck size={14} color="#10b981" /> 
                            {certMode === 'auto' ? "Official dynamic certificates will be issued." : "Your uploaded certificates will be stored."}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'analytics' && canViewAnalytics && (
                <div className="analytics-tab">
                  <div className="analytics-overview-grid">
                    <div className="dash-card">
                      <div className="card-header">
                        <div className="header-text-group">
                          <h3 className="chart-title">Member Growth Over Time</h3>
                          <p className="chart-subtitle" style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px' }}>Monthly new member registration trends</p>
                        </div>
                      </div>
                      <div className="chart-large">
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={charts.memberGrowth}>
                            <defs>
                              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip />
                            <Area type="monotone" dataKey="count" stroke="#6366f1" fillOpacity={1} fill="url(#colorCount)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="dash-card">
                      <div className="card-header">
                        <div className="header-text-group">
                          <h3 className="chart-title">Event Performance Analytics</h3>
                          <p className="chart-subtitle" style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px' }}>Comparison of student registrations vs actual attendees</p>
                        </div>
                      </div>
                      <div className="chart-large">
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={charts.participationData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip />
                            <Bar dataKey="registered" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="attended" fill="#10b981" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Advanced Insights Section */}
                  <div className="advanced-insights-section" style={{ marginTop: "2rem" }}>
                    <div className="dash-card">
                      <div className="card-header" style={{ padding: '1.5rem 1.5rem 0.5rem' }}>
                        <div className="header-text-group">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Zap size={20} color="#6366f1" fill="#6366f1" fillOpacity={0.15} />
                            <h3 className="chart-title" style={{ margin: 0 }}>Advanced Insights & Growth</h3>
                          </div>
                          <p className="chart-subtitle" style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px' }}>AI-driven analysis of your club's historical data</p>
                        </div>
                      </div>
                      
                      <div className="insights-cluster-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', padding: '1.5rem' }}>
                        <div className="cluster-item" style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', minHeight: '100px' }}>
                          <h4 className="cluster-label" style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Success Highlight</h4>
                          {analyticsLoading ? (
                             <div className="shimmer" style={{ height: '20px', width: '80%', background: '#eee', borderRadius: '4px' }}></div>
                          ) : advancedStats?.bestEvents?.[0] ? (
                            <div className="best-event-highlight">
                              <span className="event-name" style={{ fontWeight: '700', color: '#1e293b', fontSize: '1rem' }}>{advancedStats.bestEvents[0].title}</span>
                              <p className="event-reason" style={{ fontSize: '0.85rem', color: '#10b981', marginTop: '6px', fontWeight: '500' }}>{advancedStats.bestEvents[0].reason}</p>
                            </div>
                          ) : <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Complete more events to see success metrics.</p>}
                        </div>
                        
                        <div className="cluster-item" style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', minHeight: '100px' }}>
                          <h4 className="cluster-label" style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Peak Engagement Time</h4>
                          {analyticsLoading ? (
                              <div className="shimmer" style={{ height: '20px', width: '60%', background: '#eee', borderRadius: '4px' }}></div>
                          ) : (
                            <>
                              <div className="time-highlight" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1e293b', fontWeight: '700', fontSize: '1rem' }}>
                                <Clock size={18} color="#6366f1" />
                                <span>{advancedStats?.bestTime || "N/A"}</span>
                              </div>
                              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '8px' }}>Based on registration patterns across previous events.</p>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="recommendations-container" style={{ padding: '0 1.5rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                          <TrendingUp size={16} color="#6366f1" />
                          <h4 style={{ fontSize: '0.875rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>Actionable Recommendations</h4>
                        </div>
                        <div className="rec-stack" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {analyticsLoading ? (
                             [1,2,3].map(i => <div key={i} className="shimmer" style={{ height: '45px', width: '100%', background: '#f8fafc', borderRadius: '12px' }}></div>)
                          ) : (advancedStats?.recommendations || []).map((rec, i) => (
                            <div key={i} className="rec-tile" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 16px', background: 'white', borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                              <div style={{ marginTop: '2px', color: '#6366f1' }}>
                                <ArrowUpRight size={14} />
                              </div>
                              <span style={{ fontSize: '0.85rem', color: '#444', lineHeight: '1.4' }}>{rec}</span>
                            </div>
                          ))}
                          {!analyticsLoading && (advancedStats?.recommendations || []).length === 0 && (
                            <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', padding: '1rem', textAlign: 'center' }}>No recommendations yet. Keep hosting events to gather insights!</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'applications' && userRole === 'leader' && (
                <div className="applications-tab">
                  <div className="dash-card">
                    <div className="card-header">
                      <div>
                        <h3>Club Applications</h3>
                        <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '4px' }}>
                          Review and manage student applications to join your club.
                        </p>
                      </div>
                      <button className="btn-secondary" onClick={fetchApplications} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <RefreshCw size={14} /> Refresh
                      </button>
                    </div>

                    {appLoading ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                        <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                      </div>
                    ) : (
                      <div className="applications-list">
                        {applications.length === 0 ? (
                          <div className="empty-apps">
                            <ClipboardList size={40} style={{ opacity: 0.3 }} />
                            <p>No applications yet. When students apply to join your club, they will appear here.</p>
                          </div>
                        ) : (
                          <>
                            {applications.filter(a => a.status === 'pending').length > 0 && (
                              <div className="app-section">
                                <div className="app-section-header">
                                  <span className="pending-dot"></span>
                                  Pending Applications ({applications.filter(a => a.status === 'pending').length})
                                </div>
                                {applications.filter(a => a.status === 'pending').map(app => (
                                  <ApplicationRow key={app._id} app={app} />
                                ))}
                              </div>
                            )}
                            {applications.filter(a => a.status !== 'pending').length > 0 && (
                              <div className="app-section" style={{ marginTop: '1.5rem' }}>
                                <div className="app-section-header">
                                  Previously Reviewed ({applications.filter(a => a.status !== 'pending').length})
                                </div>
                                {applications.filter(a => a.status !== 'pending').map(app => (
                                  <ApplicationRow key={app._id} app={app} />
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'domains' && (
                <div className="domains-tab">
                  <div className="dash-card">
                    <div className="card-header">
                      <h3>Club Domains</h3>
                    </div>
                    <div className="domains-grid">
                      {(club?.domains || []).length > 0 ? (
                        (club.domains).map(domain => (
                          <div key={domain._id || domain.name} className="domain-card">
                            <div className="domain-icon"><Layers size={24} /></div>
                            <h4>{domain.name}</h4>
                            <p>{domain.description || `Members assigned to ${domain.name} focus.`}</p>
                            <button className="text-btn">View Domain Members</button>
                          </div>
                        ))
                      ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', gridColumn: '1/-1' }}>
                          <Layers size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                          <p>No domains configured. Ask your admin to add domains when creating the club.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'announcements' && (
                <div className="announcements-tab" style={{ maxWidth: '800px', margin: '0 auto' }}>
                  <div className="dash-card">
                    <div className="card-header" style={{ padding: '1.5rem', borderBottom: '2px solid #f1f5f9' }}>
                      <div>
                        <h3>Broadcast Center</h3>
                        <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '4px' }}>Maintain professional communication with your club members</p>
                      </div>
                    </div>
                    {canSendNotifs && (
                      <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
                         <textarea 
                            value={announcementText}
                            onChange={(e) => setAnnouncementText(e.target.value)}
                            placeholder="Draft a new announcement, milestone, or urgent update..."
                            style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #cad5e2', minHeight: '120px', resize: 'vertical', fontFamily: 'inherit', fontSize: '1rem', color: '#0f172a', fontWeight: 500, backgroundColor: '#ffffff', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)' }}
                         />
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                            <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>
                              Announcements will be visible to all members and push notifications will be sent (if enabled).
                            </span>
                            <button 
                                className="btn-primary" 
                                onClick={handlePostAnnouncement} 
                                disabled={!announcementText.trim()}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: !announcementText.trim() ? 0.6 : 1 }}
                            >
                               <Megaphone size={16} /> Broadcast
                            </button>
                         </div>
                      </div>
                    )}
                    <div className="announcement-list">
                      {announcements.length > 0 ? announcements.map((ann, i) => (
                        <div key={i} className="compact-announcement">
                          <div className="ann-meta">
                            <div className="ann-sender">
                              <div className="avatar-chip">Y</div>
                              <span>Posted by {ann.sender}</span>
                            </div>
                            <span className="ann-time">{ann.date}</span>
                          </div>
                          <div className="ann-content">
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#1e293b' }}>{ann.title}</h4>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#444', lineHeight: '1.5' }}>{ann.text}</p>
                          </div>
                        </div>
                      )) : (
                        <div className="empty-apps" style={{ padding: '4rem 2rem' }}>
                          <Megaphone size={48} style={{ opacity: 0.15, marginBottom: '1.5rem' }} />
                          <h4 style={{ color: '#64748b', margin: 0 }}>No Announcements Yet</h4>
                          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '8px' }}>Keep your members informed about upcoming activities</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'gallery' && (
                <div className="gallery-tab">
                  <div className="dash-card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ flex: '1 1 auto' }}>
                        <h3>Memories & Highlights</h3>
                        <p className="chart-subtitle" style={{ margin: '4px 0 0 0' }}>Capture your club's journey. Click 'Upload' to share new milestones.</p>
                      </div>
                      {canUploadPhotos && (
                        <button className="btn-primary" style={{ width: 'auto', alignSelf: 'center', flexShrink: 0 }} onClick={() => openModal('uploadPhoto')}>
                          <ImageIcon size={16} /> Add Moments
                        </button>
                      )}
                    </div>
                    <div className="gallery-flex-container" style={{ padding: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                      {(club?.gallery || []).length > 0 ? (
                        club.gallery.slice().reverse().map((photo, i) => (
                          <div key={i} className="gallery-item-flex" style={{ flex: '1 1 280px', maxWidth: '350px', background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', transition: 'all 0.3s ease' }}>
                            <div className="photo-wrapper" style={{ height: '180px', width: '100%', position: 'relative' }}>
                              <img src={photo.url} alt="Gallery" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <div className="team-category-badge" style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(255,255,255,0.95)', padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', color: '#6366f1', textTransform: 'uppercase', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                {photo.category || "General"}
                              </div>
                            </div>
                            <div className="photo-info" style={{ padding: '12px' }}>
                              <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e293b', fontWeight: '600' }}>{photo.caption || "Club Event Snapshot"}</p>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(photo.uploadedAt).toLocaleDateString()}</span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  {canUploadPhotos && (
                                    <button className="btn-icon-xs-danger" onClick={() => handleDeletePhoto(photo._id)}>
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                  <button className="btn-icon-xs"><PlusCircle size={13} /></button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '3rem', textAlign: 'center', width: '100%' }}>
                          <ImageIcon size={48} style={{ opacity: 0.15, marginBottom: '1.25rem', color: '#6366f1' }} />
                          <h4 style={{ color: '#64748b', margin: 0 }}>No Moments Captured Yet</h4>
                          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '8px' }}>Share the first highlights of your club community.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
                    </>
                  );
                } catch (err) {
                  console.error("Dashboard Render Error:", err);
                  return (
                    <div style={{ padding: '40px', textAlign: 'center', minHeight: '300px' }}>
                      <ShieldAlert size={48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
                      <h3>⚠️ Component Failure</h3>
                      <p>We encountered a rendering problematic in this section.</p>
                      <button onClick={() => window.location.reload()} className="btn-primary">Fix & Reload</button>
                    </div>
                  );
                }
              })()}
            </div>
          </>
        )}
      </main>

      {/* Modals */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content-premium" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modalType === 'createEvent' ? 'Create New Event' : modalType === 'notify' ? 'Post Announcement' : 'Manage'}</h3>
              <button onClick={() => setShowModal(false)} className="close-btn"><X size={20} /></button>
            </div>
            <div className="modal-body">
              {modalType === 'uploadPhoto' && (
                <div className="photo-upload-form">
                  <div className="upload-preview-area" style={{ height: '200px', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', overflow: 'hidden' }}>
                    {modalData?.image ? <img src={modalData.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={30} color="#cbd5e1" />}
                  </div>
                  <input type="file" id="gal-up" hidden accept="image/*" onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => setModalData(prev => ({...prev, image: reader.result}));
                      reader.readAsDataURL(file);
                    }
                  }} />
                  <label htmlFor="gal-up" className="btn-secondary-modern" style={{ width: '100%', justifyContent: 'center', cursor: 'pointer', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', fontWeight: '700' }}>
                    <ImageIcon size={18} /> Select Highlight Image
                  </label>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', marginBottom: '8px', color: '#e2e8f0' }}>Moment Caption</label>
                    <input type="text" placeholder="Describe the memory..." style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: '#0f172a', color: 'white' }} value={modalData?.caption || ''} onChange={e => setModalData(prev => ({...prev, caption: e.target.value}))} />
                  </div>
                  <div className="form-actions">
                    <button className="btn-secondary" onClick={() => setShowModal(false)}>Discard</button>
                    <button className="btn-primary" onClick={async () => {
                       if (!modalData?.image) return showToast('Please select a photo', 'error');
                       try {
                         const token = localStorage.getItem('token');
                         await axios.post(`${API}/api/club-leader/gallery/upload`, { ...modalData, clubId }, { headers: { Authorization: `Bearer ${token}` } });
                         showToast('Moment added to gallery!');
                         setShowModal(false);
                         fetchClubData();
                       } catch(e) { showToast('Upload failed', 'error'); }
                    }}>Publish to Gallery</button>
                  </div>
                </div>
              )}
              {modalType === 'createEvent' && (
                <div className="redirect-box">
                  <p>Redirecting to Event Studio for full controls.</p>
                  <button className="btn-primary" onClick={() => navigate("/createpost")}>Continue to Studio</button>
                </div>
              )}
              {modalType === 'notify' && (
                <div className="announcement-form">
                  <textarea
                    placeholder="Write your announcement here..."
                    rows={5}
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                  ></textarea>
                  <div className="form-actions">
                    <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                    <button className="btn-primary" onClick={handlePostAnnouncement}>Post to Club</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Role Management Dynamic Modal */}
      {showRoleModal && (
        <div className="modal-overlay" onClick={() => setShowRoleModal(false)}>
          <div className="modal-content-premium" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingRole?._id ? "Edit Dynamic Structure" : "Generate Custom Role"}</h3>
              <button onClick={() => setShowRoleModal(false)} className="close-btn"><X size={20} /></button>
            </div>
            <form className="modal-body" onSubmit={handleSaveRole}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold' }}>Team / Role Official Title</label>
                <input required type="text" placeholder="e.g. Design Sub-Core" value={editingRole?.roleName || ''} onChange={(e) => setEditingRole({...editingRole, roleName: e.target.value})} style={{ width: '100%', padding: '10px', marginTop: '6px', borderRadius: '8px', border: '1px solid #ccc' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold' }}>Hierarchy Tier Level</label>
                <select value={editingRole?.tierLevel || 3} onChange={(e) => setEditingRole({...editingRole, tierLevel: parseInt(e.target.value)})} style={{ width: '100%', padding: '10px', marginTop: '6px', borderRadius: '8px', border: '1px solid #ccc' }}>
                  <option value={2}>Tier 2: Core Team</option>
                  <option value={3}>Tier 3: Sub-Core & Functional Teams</option>
                </select>
              </div>
              <p style={{ fontWeight: 'bold', fontSize: '13px', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '8px' }}>Assign Operational Permissions:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={editingRole?.permissions?.canCreateEvents || false} onChange={e => setEditingRole({...editingRole, permissions: {...editingRole?.permissions, canCreateEvents: e.target.checked}})} /> Can Launch Official Events
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={editingRole?.permissions?.canSendNotifications || false} onChange={e => setEditingRole({...editingRole, permissions: {...editingRole?.permissions, canSendNotifications: e.target.checked}})} /> Can Push Club Notifications
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={editingRole?.permissions?.canManageMembers || false} onChange={e => setEditingRole({...editingRole, permissions: {...editingRole?.permissions, canManageMembers: e.target.checked}})} /> Can Promote/Evict Members
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={editingRole?.permissions?.canUploadPhotos || false} onChange={e => setEditingRole({...editingRole, permissions: {...editingRole?.permissions, canUploadPhotos: e.target.checked}})} /> Can Upload to Gallery
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={editingRole?.permissions?.canManageResults || false} onChange={e => setEditingRole({...editingRole, permissions: {...editingRole?.permissions, canManageResults: e.target.checked}})} /> Can Publish Event Results
                </label>
              </div>
              <div className="form-actions" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowRoleModal(false)}>Discard</button>
                <button type="submit" className="btn-primary">Provision Role</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Promotion Modal */}
      {showMemberModal && (
        <div className="modal-overlay" onClick={() => setShowMemberModal(false)}>
          <div className="modal-content-premium" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Assign to Team</h3>
              <button onClick={() => setShowMemberModal(false)} className="close-btn"><X size={20} /></button>
            </div>
            <form className="modal-body" onSubmit={handlePromoteMember}>
              <p style={{ marginBottom: '1.25rem', fontSize: '0.875rem' }}>Assigning a student to a team makes them an <strong>Official Club Member</strong> with the role's permissions.</p>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Assign to Team</label>
                <select value={memberToEdit?.assignedRoleId || ''} onChange={(e) => setMemberToEdit({...memberToEdit, assignedRoleId: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px' }}>
                  <option value="">-- No Team (Keep as Applicant) --</option>
                  {rolesData.map(r => (
                    <option key={r._id} value={r._id}>{r.roleName} (Tier {r.tierLevel === 2 ? 'Core' : 'Sub-core'})</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Responsibilities / Custom Title</label>
                <input
                  type="text"
                  value={memberToEdit?.customTitle || ''}
                  onChange={(e) => setMemberToEdit({...memberToEdit, customTitle: e.target.value})}
                  placeholder="e.g. Lead Designer, Social Media Manager"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px' }}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowMemberModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Confirm Assignment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      </div>
  );
};

export default ClubDashboard;
