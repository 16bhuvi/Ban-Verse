import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import logo from "./banasthali-logo.jpg";
import {
  Users, Calendar, PlusCircle, BarChart3,
  LogOut, ShieldAlert, TrendingUp, ClipboardList,
  Mail, Settings,
  Trash2, Edit3, X, RefreshCw,
  LayoutDashboard, Layers, CheckSquare, Megaphone,
  UserPlus, ChevronRight, Search, Filter, ArrowUpRight,
  Clock, CheckCircle2, Zap, XCircle
} from "lucide-react";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import "./ClubDashboard.css";

const API = "http://localhost:5001";

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
  const [applications, setApplications] = useState([]);
  const [appLoading, setAppLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [advancedStats, setAdvancedStats] = useState(null);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchClubData = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user"));

      if (clubId) {
        const roleRes = await axios.get(`${API}/api/club/${clubId}/my-role`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUserRole(roleRes.data.role);
      } else if (user?.isClubLeader) {
        setUserRole("leader");
      } else if (user?.membershipType === 'Core Member') {
        setUserRole("core");
      }

      const res = await axios.get(`${API}/api/club-leader/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);

      const memberRes = await axios.get(`${API}/api/club-leader/members`, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => ({ data: [] }));
      setMembers(memberRes.data);

      const advRes = await axios.get(`${API}/api/analytics/advanced`, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => ({ data: null }));
      setAdvancedStats(advRes.data);
    } catch (error) {
      console.error("Club fetch error:", error);
      if (error.response?.status === 403 || error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("role");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [clubId, navigate]);

  const fetchApplications = useCallback(async () => {
    setAppLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/api/club-leader/applications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApplications(res.data);
    } catch (err) {
      console.error('Applications fetch error:', err);
    } finally {
      setAppLoading(false);
    }
  }, []);

  const handleApprove = async (appId, membershipType, domain) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API}/api/club-leader/applications/${appId}/approve`,
        { membershipType, domain },
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
      await axios.put(`${API}/api/club-leader/applications/${appId}/reject`, {},
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
    fetchClubData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  // Auto-fetch applications when tab changes
  useEffect(() => {
    if (activeTab === 'applications') {
      fetchApplications();
    }
  }, [activeTab, fetchApplications]);


  const [announcementText, setAnnouncementText] = useState("");
  const [announcements, setAnnouncements] = useState([]);

  const openModal = (type) => {
    setModalType(type);
    setShowModal(true);
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/api/club-leader/delete-event/${eventId}`, {
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
        target: "members"
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

  if (loading) return (
    <div className="loading-screen">
      <div className="custom-spinner"></div>
    </div>
  );

  const stats = data?.stats || {};
  const charts = data?.charts || {};
  const events = data?.events || [];
  const club = data?.club;

  // Role permissions
  const canManageMembers = ["leader"].includes(userRole);
  const canManageEvents = ["leader", "core"].includes(userRole);
  const canViewAnalytics = ["leader", "core"].includes(userRole);

  const sidebarLinks = [
    { id: "overview", label: "Overview", icon: LayoutDashboard, roles: ["leader", "core", "subcore", "member"] },
    { id: "applications", label: "Applications", icon: ClipboardList, roles: ["leader"] },
    { id: "members", label: "Members", icon: Users, roles: ["leader", "core", "subcore"] },
    { id: "domains", label: "Domains", icon: Layers, roles: ["leader", "core"] },
    { id: "events", label: "Events", icon: Calendar, roles: ["leader", "core", "subcore", "member"] },
    { id: "tasks", label: "Tasks", icon: CheckSquare, roles: ["leader", "core", "subcore"] },
    { id: "analytics", label: "Analytics", icon: BarChart3, roles: ["leader", "core"] },
    { id: "announcements", label: "Announcements", icon: Megaphone, roles: ["leader", "core", "subcore", "member"] },
    { id: "settings", label: "Settings", icon: Settings, roles: ["leader"] },
  ];

  const filteredLinks = sidebarLinks.filter(link => link.roles.includes(userRole));

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
          {filteredLinks.map(link => (
            <button
              key={link.id}
              onClick={() => setActiveTab(link.id)}
              className={`nav-item ${activeTab === link.id ? 'active' : ''}`}
            >
              <link.icon size={20} /> <span>{link.label}</span>
            </button>
          ))}
        </div>

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
        {!club ? (
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
                <button className="btn-icon"><Mail size={18} /></button>
              </div>
            </header>

            <div className="tab-content">
              {activeTab === 'overview' && (
                <div className="overview-tab">
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-header">
                        <Users size={20} className="text-indigo" />
                        <span className="stat-trend positive">+12% <ArrowUpRight size={14} /></span>
                      </div>
                      <div className="stat-value">{stats.totalMembers}</div>
                      <div className="stat-label">Total Members</div>
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
                        <CheckSquare size={20} className="text-orange" />
                      </div>
                      <div className="stat-value">85%</div>
                      <div className="stat-label">Task Completion</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-header">
                        <TrendingUp size={20} className="text-purple" />
                        <span className="live-indicator"><Zap size={10} /> Live</span>
                      </div>
                      <div className="stat-value">{stats.engagementScore}</div>
                      <div className="stat-label">Real-time Engagement</div>
                    </div>
                  </div>

                  <div className="dashboard-grid">
                    <div className="grid-left">
                      <div className="dash-card">
                        <div className="card-header">
                          <h3>Recent Activity</h3>
                          <button className="text-btn">View All</button>
                        </div>
                        <div className="activity-list">
                          {[
                            { user: "Priya Sharma", action: "joined as Subcore", time: "2h ago", icon: UserPlus },
                            { user: "Tech Domain", action: "updated task status", time: "5h ago", icon: CheckCircle2 },
                            { user: "Admin", action: "posted new announcement", time: "1d ago", icon: Megaphone },
                          ].map((item, i) => (
                            <div key={i} className="activity-item">
                              <div className="activity-icon"><item.icon size={16} /></div>
                              <div className="activity-text">
                                <strong>{item.user}</strong> {item.action}
                                <span className="activity-time">{item.time}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="dash-card">
                        <div className="card-header">
                          <h3>Upcoming Events</h3>
                        </div>
                        <div className="event-mini-list">
                          {events.slice(0, 3).map((event, i) => (
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
                          <h3>My Tasks</h3>
                        </div>
                        <div className="task-mini-list">
                          {[
                            { title: "Review Event Poster", status: "In Progress" },
                            { title: "Email Participants", status: "Pending" },
                          ].map((task, i) => (
                            <div key={i} className="task-mini-item">
                              <div className={`status-dot ${task.status.toLowerCase().replace(' ', '-')}`}></div>
                              <span>{task.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'events' && (
                <div className="events-tab">
                  <div className="filter-bar">
                    <div className="search-box">
                      <Search size={18} />
                      <input
                        type="text"
                        placeholder="Search events..."
                        value={eventSearch}
                        onChange={(e) => setEventSearch(e.target.value)}
                      />
                    </div>
                    <div className="filter-actions">
                      <button className="btn-secondary"><Filter size={16} /> Filter</button>
                      {canManageEvents && <button onClick={() => openModal('createEvent')} className="btn-primary">Create Event</button>}
                    </div>
                  </div>

                  <div className="events-grid">
                    {events.filter(e => e.title.toLowerCase().includes(eventSearch.toLowerCase())).map((event, i) => (
                      <div key={i} className="event-card-premium">
                        <div className="event-image">
                          <img src={event.poster || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800"} alt="Poster" />
                          <div className="event-badge">{event.category}</div>
                        </div>
                        <div className="event-body">
                          <h3>{event.title}</h3>
                          <div className="event-info">
                            <span><Calendar size={14} /> {new Date(event.date).toLocaleDateString()}</span>
                            <span><Users size={14} /> {event.participants.length} Joined</span>
                          </div>
                          <div className="event-footer">
                            <button className="btn-view" onClick={() => navigate(`/viewpost/${event._id}`)}>Details</button>
                            {canManageEvents && (
                              <div className="admin-actions">
                                <button className="icon-btn" onClick={() => navigate("/createpost", { state: { editEvent: event } })}><Edit3 size={16} /></button>
                                <button className="icon-btn danger" onClick={() => handleDeleteEvent(event._id)}><Trash2 size={16} /></button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'members' && (
                <div className="members-tab">
                  <div className="dash-card">
                    <div className="card-header">
                      <h3>Club Members</h3>
                      <div className="header-actions">
                        <div className="search-box-small">
                          <Search size={16} />
                          <input
                            type="text"
                            placeholder="Search members..."
                            value={memberSearch}
                            onChange={(e) => setMemberSearch(e.target.value)}
                          />
                        </div>
                        {canManageMembers && <button className="btn-primary"><UserPlus size={16} /> Invite</button>}
                      </div>
                    </div>
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Member</th>
                            <th>Membership Type</th>
                            <th>Domain</th>
                            <th>Joined</th>
                            {canManageMembers && <th>Actions</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {(members.length > 0 ? members : (club?.members || [])).filter(m => {
                            const name = (m.userId?.fullName || m.user?.fullName || '').toLowerCase();
                            const email = (m.userId?.email || m.user?.email || '').toLowerCase();
                            return name.includes(memberSearch.toLowerCase()) || email.includes(memberSearch.toLowerCase());
                          }).map((m, i) => {
                            const member = m.userId || m.user;
                            if (!member) return null;
                            return (
                              <tr key={i}>
                                <td>
                                  <div className="user-profile-sm">
                                    <img src={member.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.fullName)}&background=6366f1&color=fff`} alt="Avatar" />
                                    <div className="user-info">
                                      <div className="name">{member.fullName}</div>
                                      <div className="email">{member.email}</div>
                                    </div>
                                  </div>
                                </td>
                                <td><span className={`badge-role ${m.membershipType === 'Core Member' ? 'core' : (m.role || 'member')}`}>{m.membershipType || m.role || 'General Member'}</span></td>
                                <td>{m.domain || 'None'}</td>
                                <td>{m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : 'N/A'}</td>
                                {canManageMembers && (
                                  <td>
                                    <button className="btn-icon-sm"><Edit3 size={14} /></button>
                                    <button className="btn-icon-sm danger"><Trash2 size={14} /></button>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
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
                        <div className="cluster-item" style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                          <h4 className="cluster-label" style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Success Highlight</h4>
                          {advancedStats?.bestEvents?.[0] ? (
                            <div className="best-event-highlight">
                              <span className="event-name" style={{ fontWeight: '700', color: '#1e293b', fontSize: '1rem' }}>{advancedStats.bestEvents[0].title}</span>
                              <p className="event-reason" style={{ fontSize: '0.85rem', color: '#10b981', marginTop: '6px', fontWeight: '500' }}>{advancedStats.bestEvents[0].reason}</p>
                            </div>
                          ) : <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Complete more events to see success metrics.</p>}
                        </div>
                        
                        <div className="cluster-item" style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                          <h4 className="cluster-label" style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Peak Engagement Time</h4>
                          <div className="time-highlight" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1e293b', fontWeight: '700', fontSize: '1rem' }}>
                            <Clock size={18} color="#6366f1" />
                            <span>{advancedStats?.bestTime || "Analyzing..."}</span>
                          </div>
                          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '8px' }}>Based on registration patterns across previous events.</p>
                        </div>
                      </div>

                      <div className="recommendations-container" style={{ padding: '0 1.5rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                          <TrendingUp size={16} color="#6366f1" />
                          <h4 style={{ fontSize: '0.875rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>Actionable Recommendations</h4>
                        </div>
                        <div className="rec-stack" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {(advancedStats?.recommendations || []).map((rec, i) => (
                            <div key={i} className="rec-tile" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 16px', background: 'white', borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                              <div style={{ marginTop: '2px', color: '#6366f1' }}>
                                <ArrowUpRight size={14} />
                              </div>
                              <span style={{ fontSize: '0.85rem', color: '#444', lineHeight: '1.4' }}>{rec}</span>
                            </div>
                          ))}
                          {(advancedStats?.recommendations || []).length === 0 && (
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

              {activeTab === 'tasks' && (
                <div className="tasks-tab">
                  <div className="dash-card">
                    <div className="card-header">
                      <h3>Task Management</h3>
                      <button className="btn-primary" onClick={() => openModal('notify')}>Assign New Task</button>
                    </div>
                    <div className="task-full-list">
                      {[
                        { title: "Review Event Poster", domain: "Media", status: "In Progress", due: "Tomorrow" },
                        { title: "Email Participants", domain: "Management", status: "Pending", due: "25 Oct" },
                        { title: "Technical Setup", domain: "Technical", status: "Completed", due: "20 Oct" },
                      ].map((task, i) => (
                        <div key={i} className="task-row">
                          <CheckCircle2 size={20} className={`status-icon ${task.status.toLowerCase()}`} />
                          <div className="task-info">
                            <div className="task-title">{task.title}</div>
                            <div className="task-meta">{task.domain} • Due {task.due}</div>
                          </div>
                          <div className={`status-badge ${task.status.toLowerCase().replace(' ', '-')}`}>{task.status}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'announcements' && (
                <div className="announcements-tab">
                  <div className="dash-card">
                    <div className="card-header">
                      <h3>Broadcast Center</h3>
                      <button className="btn-primary" onClick={() => openModal('notify')}>Post New Announcement</button>
                    </div>
                    <div className="announcement-list">
                      {announcements.length > 0 ? announcements.map((ann, i) => (
                        <div key={i} className="announcement-card-full">
                          <div className="ann-header">
                            <h4>{ann.title}</h4>
                            <span className="ann-date">{ann.date}</span>
                          </div>
                          <p>{ann.text}</p>
                          <div className="ann-footer">Posted by {ann.sender}</div>
                        </div>
                      )) : (
                        <div className="empty-apps" style={{ padding: '3rem' }}>
                          <Megaphone size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                          <p>No recent announcements. Broadcast updates to your members.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'settings' && userRole === 'leader' && (
                <div className="settings-tab">
                  <div className="dash-card">
                    <div className="card-header"><h3>Club Settings</h3></div>
                    <div className="settings-body">
                      <div className="setting-group">
                        <label>Club Name</label>
                        <input type="text" defaultValue={club.name} />
                      </div>
                      <div className="setting-group">
                        <label>Club Category</label>
                        <select defaultValue={club.category}>
                          <option>Technical</option>
                          <option>Cultural</option>
                          <option>Sports</option>
                        </select>
                      </div>
                      <button className="btn-primary">Save Changes</button>
                    </div>
                  </div>
                </div>
              )}
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
    </div>
  );
};

export default ClubDashboard;
