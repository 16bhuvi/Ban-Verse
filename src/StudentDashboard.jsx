import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./StudentDashboard.css";
import logo from "./banasthali-logo.jpg";
import ChatBot from "./ChatBot";
import { RefreshCw } from "lucide-react";

const API = "http://localhost:5001";
const AI_API = "http://localhost:8000";
const CATEGORIES = ["Technical", "Cultural", "Workshop", "Hackathon", "Seminar", "Sports", "Entrepreneurship"];

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [eventTabSearch, setEventTabSearch] = useState("");
  const [searchResults, setSearchResults] = useState({ events: [], clubs: [] });
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [isRefreshingAI, setIsRefreshingAI] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState({
    fullName: "",
    department: "",
    year: "",
    bio: "",
    interests: [],
    profileImage: ""
  });

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditProfileData(prev => ({ ...prev, [field]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }

        const response = await axios.get(`${API}/api/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setData(response.data);

        // Fetch Notifications Count
        const notifRes = await axios.get(`${API}/api/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUnreadNotifications(notifRes.data.unreadCount);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setErrorMessage(`Connection failed: ${error.response?.status || error.message}`);
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("role");
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  useEffect(() => {
    const fetchAIRecommendations = async () => {
      const studentId = data?.user?._id || data?.user?.id;
      if (studentId) {
        try {
          const res = await axios.get(`${AI_API}/recommendations/${studentId}`);
          setAiRecommendations(res.data);
        } catch (err) {
          console.error("AI Recommendations error:", err);
        }
      }
    };
    fetchAIRecommendations();
  }, [data]);

  const handleRefreshAI = async () => {
    const studentId = data?.user?._id || data?.user?.id;
    if (studentId) {
      setIsRefreshingAI(true);
      try {
        const res = await axios.get(`${AI_API}/recommendations/${studentId}`);
        setAiRecommendations(res.data);
      } catch (err) {
        console.error("AI Recommendations refresh error:", err);
      } finally {
        setTimeout(() => setIsRefreshingAI(false), 1000);
      }
    }
  };

  const logActivity = async (actionType, itemId, itemType) => {
    if (data?.user?._id) {
      try {
        await axios.post(`${AI_API}/log-activity?studentId=${data.user._id}&action_type=${actionType}&item_id=${itemId}&item_type=${itemType}`);
      } catch (err) {
        console.error("Error logging activity:", err);
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length > 2) {
        try {
          const token = localStorage.getItem("token");
          const res = await axios.get(`${API}/api/search?q=${searchQuery}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setSearchResults(res.data);
        } catch (err) {
          console.error("Search error:", err);
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleClubClick = (e, clubName) => {
    e.stopPropagation();
    if (clubName && clubName !== "Independent Event") {
      setSelectedCategories([]); // Clear category filters to show the specific club cluster
      setActiveTab("events");
      setEventTabSearch(clubName);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const renderDashboard = () => {
    if (!data) return null;
    const { user, stats, upcomingEvents } = data;

    return (
      <>
        <section className="welcome-card">
          <div className="welcome-text">
            <h1>Welcome back, {user.fullName.split(" ")[0]}! 👋</h1>
            <p>You have {stats.upcomingEventsCount} upcoming events this week. Keep up the activity!</p>
          </div>
        </section>

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "#eef2ff" }}>🚀</div>
            <div className="stat-value">{stats.joinedClubsCount}</div>
            <div className="stat-label">Joined Clubs</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "#ecfdf5" }}>📅</div>
            <div className="stat-value">{stats.upcomingEventsCount}</div>
            <div className="stat-label">Upcoming Events</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "#fff7ed" }}>⭐</div>
            <div className="stat-value">{stats.points}</div>
            <div className="stat-label">Activity Points</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "#fdf2f8" }}>✅</div>
            <div className="stat-value">{stats.registeredEventsCount}</div>
            <div className="stat-label">Registered Events</div>
          </div>
        </section>

        <div className="dashboard-sections-grid">
          {/* AI Recommended Section */}
          <section className="section-card">
            <div className="section-header">
              <h3 className="section-title">✨ Recommended for You (AI) <RefreshCw size={14} className={isRefreshingAI ? "spin" : ""} style={{ marginLeft: '10px', cursor: 'pointer', color: '#6366f1' }} onClick={handleRefreshAI} /></h3>
              <button className="text-btn" onClick={() => setActiveTab("events")}>Full List</button>
            </div>
            <div className="event-list">
              {aiRecommendations?.recommended_events?.length > 0 ? (
                aiRecommendations.recommended_events.map(event => (
                  <div className="event-item-modern" key={event._id || event.name} onClick={() => { logActivity("click", event._id || event.name, "event"); navigate(`/viewpost/${event._id || event.name}`); }}>
                    <div className="event-info">
                      <h4>{event.name || event.title} <span className="match-badge">{(event.match_score * 100).toFixed(0)}% Match</span></h4>
                      <p>
                        <span onClick={(e) => handleClubClick(e, event.clubName)} style={{ cursor: "pointer", color: "#6366f1", fontWeight: "600" }} className="hover-underline">
                          {event.clubName || "Personalized Match"}
                        </span> • {event.category}
                      </p>
                    </div>
                    <button className="register-btn" onClick={(e) => { e.stopPropagation(); navigate(`/viewpost/${event._id || event.name}`); }}>Details</button>
                  </div>
                ))
              ) : (
                <div className="empty-ai-box">
                  <p>✨ To see AI-powered matches tailored to YOU, try joining some clubs or adding skills to your profile!</p>
                  <button className="text-btn" onClick={() => setActiveTab("profile")}>Enhance My Profile</button>
                </div>
              )}
            </div>
          </section>

          {/* General Upcoming Section */}
          <section className="section-card">
            <div className="section-header">
              <h3 className="section-title">📅 General Upcoming Events</h3>
              <button className="text-btn" onClick={() => setActiveTab("events")}>Full List</button>
            </div>
            <div className="event-list">
              {upcomingEvents?.length > 0 ? (
                upcomingEvents.slice(0, 3).map(event => (
                  <div className="event-item-modern" key={event._id} onClick={() => { logActivity("view", event._id, "event"); navigate(`/viewpost/${event._id}`); }}>
                    <div className="event-info">
                      <h4>{event.title}</h4>
                      <p onClick={(e) => handleClubClick(e, event.club?.name)} style={{ cursor: "pointer", color: "#6366f1", fontWeight: "600" }} className="hover-underline">
                        {event.club?.name || "Independent Event"}
                      </p>
                    </div>
                    <button className="register-btn" onClick={(e) => { e.stopPropagation(); navigate(`/viewpost/${event._id}`); }}>Details</button>
                  </div>
                ))
              ) : (
                <p>No general events found.</p>
              )}
            </div>
          </section>

          <section className="section-card">
            <div className="section-header">
              <h3 className="section-title">🛡️ Discover Clubs <RefreshCw size={14} className={isRefreshingAI ? "spin" : ""} style={{ marginLeft: '10px', cursor: 'pointer', color: '#6366f1' }} onClick={handleRefreshAI} /></h3>
            </div>
            <div className="club-list">
              {aiRecommendations?.recommended_clubs?.length > 0 ? (
                aiRecommendations.recommended_clubs.map(club => (
                  <div className="club-item-modern" key={club.name} onClick={() => logActivity("view", club.name, "club")}>
                    <div className="club-logo-modern">{club.name.charAt(0)}</div>
                    <div className="club-info">
                      <h4>{club.name} <span className="match-badge">{(club.match_score * 100).toFixed(0)}% Match</span></h4>
                      <p style={{ fontSize: '12px', color: '#6366f1' }}>{club.reason}</p>
                    </div>
                    <button className="join-btn-small">Join</button>
                  </div>
                ))
              ) : (
                <div className="empty-ai-box">
                  <p>No specific club matches found.</p>
                </div>
              )}
            </div>
            {aiRecommendations?.recommended_domains?.length > 0 && (
              <div className="interest-tags" style={{ marginTop: '1.5rem', padding: '10px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px' }}>
                <p style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Based on your interests:</p>
                {aiRecommendations.recommended_domains.map(d => <span key={d} className="tag" onClick={() => logActivity("explore", d, "domain")}>{d}</span>)}
              </div>
            )}
          </section>
        </div>
      </>
    );
  };

  const renderContent = () => {
    if (loading) return (
      <div className="skeleton-container">
        <div className="skeleton-hero"></div>
        <div className="skeleton-stats-grid">
          <div className="skeleton-stat"></div>
          <div className="skeleton-stat"></div>
          <div className="skeleton-stat"></div>
          <div className="skeleton-stat"></div>
        </div>
        <div className="skeleton-content-grid">
          <div className="skeleton-card-large"></div>
          <div className="skeleton-card-small"></div>
        </div>
      </div>
    );
    if (errorMessage) return (
      <div className="error-content">
        <h2>Something went wrong</h2>
        <p>{errorMessage}</p>
        <button onClick={() => window.location.reload()} className="primary-btn">Retry Connection</button>
      </div>
    );

    switch (activeTab) {
      case "dashboard": return renderDashboard();
      case "clubs": return renderClubs();
      case "events": return renderEvents();
      case "past-events": return renderPastEvents();
      case "explore": return renderExplore();
      case "notifications": return renderNotifications();
      case "profile": return renderProfile();
      default: return renderDashboard();
    }
  };

  const renderEvents = () => {
    return (
      <div className="section-card">
        <div className="section-header">
          <h2 className="section-title">Campus Events</h2>
          <div className="category-filters-container">
            <div className="category-filters">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  className={`filter-chip ${selectedCategories.includes(cat) ? 'active' : ''}`}
                  onClick={() => toggleCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="tab-search">
              <input
                type="text"
                placeholder="Search all events..."
                value={eventTabSearch}
                onChange={(e) => setEventTabSearch(e.target.value)}
                className="tab-search-input"
              />
            </div>
          </div>
        </div>
        <div className="event-list">
          {data?.upcomingEvents
            .filter(e => selectedCategories.length === 0 || selectedCategories.includes(e.category))
            .filter(e => e.title.toLowerCase().includes(eventTabSearch.toLowerCase()) ||
              e.description?.toLowerCase().includes(eventTabSearch.toLowerCase()) ||
              e.club?.name?.toLowerCase().includes(eventTabSearch.toLowerCase()))
            .map(event => (
              <div className="event-item-modern" key={event._id} onClick={() => navigate(`/viewpost/${event._id}`)}>
                <div className="event-date-box">
                  <div className="month">{new Date(event.date).toLocaleString('default', { month: 'short' })}</div>
                  <div className="day">{new Date(event.date).getDate()}</div>
                </div>
                <div className="event-info">
                  <h4>{event.title} <span className="cat-badge">{event.category}</span></h4>
                  <p onClick={(e) => handleClubClick(e, event.club?.name)} style={{ cursor: "pointer", color: "#6366f1", fontWeight: "600" }} className="hover-underline">
                    {event.club?.name || "Independent Event"}
                  </p>
                </div>
                <button className="register-btn" onClick={(e) => { e.stopPropagation(); navigate(`/viewpost/${event._id}`); }}>View Details</button>
              </div>
            ))}
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (activeTab === "past-events") {
      const fetchPastEvents = async () => {
        try {
          const token = localStorage.getItem("token");
          const res = await axios.get(`${API}/api/events/past`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setPastEvents(res.data);
        } catch (err) {
          console.error("Past events error:", err);
        }
      };
      fetchPastEvents();
    }
  }, [activeTab]);

  const renderPastEvents = () => {
    // Group by Month
    const grouped = pastEvents.reduce((acc, event) => {
      const date = new Date(event.date);
      const key = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!acc[key]) acc[key] = [];
      acc[key].push(event);
      return acc;
    }, {});

    return (
      <div className="section-card">
        <h2 className="section-title">Past Events History</h2>
        <p className="subtitle">All campus events — see which ones you attended.</p>
        <div className="history-timeline">
          {Object.keys(grouped).length > 0 ? Object.entries(grouped).map(([month, events]) => (
            <div key={month} className="month-group">
              <h3 className="month-label">📅 {month}</h3>
              <div className="month-events">
                {events.map(event => (
                  <div key={event._id} className="past-event-item">
                    <div className={`dot ${event.isRegistered ? 'dot-registered' : 'dot-missed'}`}></div>
                    <div className="past-event-info">
                      <strong>{event.title}</strong>
                      <span style={{ color: '#64748b', fontSize: '13px' }}>
                        {event.club?.name || 'Campus Event'} &bull; {event.category}
                      </span>
                    </div>
                    <span
                      className="past-event-badge"
                      style={{
                        marginLeft: 'auto',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                        background: event.isRegistered ? '#dcfce7' : '#f1f5f9',
                        color: event.isRegistered ? '#16a34a' : '#94a3b8',
                        border: event.isRegistered ? '1px solid #86efac' : '1px solid #e2e8f0'
                      }}
                    >
                      {event.isRegistered ? '✅ Registered' : '○ Not Registered'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )) : <p className="empty-state">No past events found yet.</p>}
        </div>
      </div>
    );
  };

  const renderProfile = () => {
    const { user } = data;

    if (isEditingProfile) {
      return (
        <div className="section-card edit-profile-card">
          <h2 className="section-title">Edit Your Profile</h2>
          <form className="profile-edit-form" onSubmit={handleProfileSubmit}>
            <div className="profile-photo-management">
              <img src={editProfileData.profileImage || user.profileImage} alt="Preview" className="profile-main-img" />
              <div className="photo-actions">
                <input
                  type="file"
                  id="photo-upload"
                  hidden
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, "profileImage")}
                />
                <label htmlFor="photo-upload" className="outline-btn">Change Photo</label>
                <button
                  type="button"
                  className="danger-btn-text"
                  onClick={() => setEditProfileData(prev => ({ ...prev, profileImage: "" }))}
                >
                  Remove Photo
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                value={editProfileData.fullName}
                onChange={(e) => setEditProfileData({ ...editProfileData, fullName: e.target.value })}
              />
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Department</label>
                <input
                  type="text"
                  value={editProfileData.department}
                  onChange={(e) => setEditProfileData({ ...editProfileData, department: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Year</label>
                <select
                  value={editProfileData.year}
                  onChange={(e) => setEditProfileData({ ...editProfileData, year: e.target.value })}
                >
                  <option value="">Select Year</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Bio</label>
              <textarea
                rows="4"
                value={editProfileData.bio}
                onChange={(e) => setEditProfileData({ ...editProfileData, bio: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Interests (comma separated)</label>
              <input
                type="text"
                value={editProfileData.interests.join(", ")}
                onChange={(e) => setEditProfileData({ ...editProfileData, interests: e.target.value.split(",").map(i => i.trim()) })}
              />
            </div>
            <div className="form-actions">
              <button type="button" className="text-btn" onClick={() => setIsEditingProfile(false)}>Cancel</button>
              <button type="submit" className="primary-btn">Save Changes</button>
            </div>
          </form>
        </div>
      );
    }

    const profileUser = data?.user || {};
    const stats = data?.stats || { points: 0, registeredEventsCount: 0, joinedClubsCount: 0 };
    
    return (
      <div className="profile-pro-container">
        <div className="profile-banner-premium">
          <div className="banner-glow"></div>
        </div>
        <div className="profile-main-card">
          <div className="profile-left-col">
            <div className="profile-avatar-wrapper">
              <img src={profileUser.profileImage || "https://cdn-icons-png.flaticon.com/512/847/847969.png"} alt="Profile" className="profile-avatar-pro" />
              <button className="edit-img-overlay" onClick={() => setIsEditingProfile(true)}>✎ Edit Photo</button>
            </div>
            <div className="profile-stats-mini">
               <div className="mini-stat">
                  <strong>{stats.points}</strong>
                  <span>Pts</span>
               </div>
               <div className="mini-stat">
                  <strong>{stats.joinedClubsCount}</strong>
                  <span>Clubs</span>
               </div>
            </div>
          </div>
          <div className="profile-right-col">
            <div className="profile-id-section">
              <div className="name-group">
                <h2 className="profile-user-name">{profileUser.fullName || "Student Name"}</h2>
                <div className="dept-badge-pro">{profileUser.department} • Year {profileUser.year}</div>
              </div>
              <button className="btn-edit-experience" onClick={() => {
                setEditProfileData({
                  fullName: profileUser.fullName || "",
                  department: profileUser.department || "",
                  year: profileUser.year || "",
                  bio: profileUser.bio || "",
                  interests: profileUser.interests || [],
                  profileImage: profileUser.profileImage || ""
                });
                setIsEditingProfile(true);
              }}>Edit Profile</button>
            </div>
            
            <div className="profile-bio-summary">
                <p>{profileUser.bio || "Enthusiastic student at Banasthali ready to explore new opportunities!"}</p>
            </div>

            <div className="profile-meta-grid">
              <div className="meta-card-pro">
                 <div className="meta-label">Total Engagement</div>
                 <div className="meta-value-pro">{stats.points} Points</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(`${API}/api/user/update-profile`, editProfileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message);
      // Ensure the dashboard state is updated immediately with the new user data
      if (res.data.user) {
        setData(prev => ({ ...prev, user: res.data.user }));
      }
      setIsEditingProfile(false);
      window.location.reload(); // Refresh to pull fresh statistics from backend
    } catch (error) {
      alert("Failed to update profile.");
    }
  };

  useEffect(() => {
    if (data?.user?.globalRole === "admin") {
      navigate("/admindashboard");
    }
  }, [data, navigate]);

  const renderClubs = () => {
    const clubs = data?.joinedClubs || [];
    return (
      <div className="section-card" style={{ background: 'transparent', boxShadow: 'none', padding: '0' }}>
        <h2 className="section-title" style={{ marginBottom: '1.5rem', fontSize: '1.4rem' }}>My Joined Clubs</h2>
        <div className="club-grid-premium">
          {clubs.length > 0 ? clubs.map(club => (
            <div key={club._id} className="club-flex-card">
              <div className="club-card-image-wrapper">
                <img src={club.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(club.name)}&background=6366f1&color=fff&bold=true`} alt={club.name} />
              </div>
              <div className="club-card-content">
                <h4 className="club-card-name">{club.name}</h4>
                <span className="club-card-role">{club.category || "General"} Member</span>
              </div>
              <div className="club-card-actions-vertical">
                <button className="btn-flex-secondary" onClick={() => navigate(`/viewclub?id=${club._id}`)}>
                  View Club Info
                </button>
                <button className="btn-flex-primary" onClick={(e) => handleClubClick(e, club.name)}>
                  See All Events
                </button>
              </div>
            </div>
          )) : (
            <div className="empty-state" style={{ background: 'white', borderRadius: '16px', width: '100%' }}>
              <p>You haven't joined any clubs yet. Explore and join some!</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderExplore = () => {
    const clubs = data?.allClubs || []; // Fixed to use allClubs for the explore tab
    return (
      <div className="section-card">
        <h2 className="section-title">Discover Clubs</h2>
        <p className="subtitle" style={{ marginBottom: '1.5rem' }}>Find your tribe. Hover to see what each club is about.</p>
        <div className="club-grid-premium">
          {clubs.map(club => {
            const isJoined = data?.joinedClubs?.some(jc => {
              const jcId = jc._id || jc.id;
              const clubId = club._id || club.id;
              return jcId && clubId && jcId.toString() === clubId.toString();
            });
            return (
              <div key={club._id} className="club-flex-card">
                <div className="club-card-image-wrapper">
                  <img src={club.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(club.name)}&background=6366f1&color=fff&bold=true`} alt={club.name} />
                </div>
                <div className="club-card-content">
                  <h4 className="club-card-name">{club.name}</h4>
                  <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>{club.category}</p>
                  <p style={{ fontSize: '13px', color: '#475569', height: '40px', overflow: 'hidden' }}>{club.description?.substring(0, 60)}...</p>
                </div>
                <div className="club-card-actions-vertical">
                  {isJoined ? (
                    <button className="btn-flex-secondary" disabled style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }}>
                      Member ✅
                    </button>
                  ) : (
                    <button className="btn-flex-primary" onClick={() => handleJoinClub(club._id)}>
                      Join Club
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {clubs.length === 0 && <p>No clubs available to join at this moment.</p>}
        </div>
      </div>
    );
  };

  const handleJoinClub = async (clubId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/api/clubs/join/${clubId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Fire and forget logActivity to avoid blocking the UI
      logActivity("join", clubId, "club").catch(e => console.error(e));
      
      alert("Successfully joined club! +10 points.");
      window.location.reload();
    } catch (err) {
      console.error("Join error:", err);
      alert("Failed to join club.");
    }
  };

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data.notifications || []);
      setUnreadNotifications(res.data.unreadCount || 0);
    } catch (err) {
      console.error("Notifications fetch error:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "notifications") {
      fetchNotifications();
    }
  }, [activeTab]);

  const renderNotifications = () => {
    return (
      <div className="section-card">
        <h2 className="section-title">Your Notifications</h2>
        <div className="notification-list" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notifications.length > 0 ? (
            notifications.map((n, i) => (
              <div key={n._id || i} className={`notif-item ${!n.read ? 'highlight' : ''}`} style={{
                padding: '16px',
                background: n.read ? '#f8fafc' : '#f0f4ff',
                borderRadius: '16px',
                borderLeft: n.read ? 'none' : '4px solid #4f46e5',
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <strong>{n.type === 'announcement' ? '📢 Announcement' : '🔔 Notification'}</strong>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(n.createdAt).toLocaleString()}</span>
                </div>
                <p style={{ margin: '8px 0 0 0', color: '#475569', fontSize: '14px', lineHeight: '1.5' }}>{n.message}</p>
              </div>
            ))
          ) : (
            <div className="empty-state" style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>🧘</div>
              <p>All caught up! No unread notifications.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const toggleCategory = (cat) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };



  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src={logo} alt="Logo" />
          <span>Banverse</span>
        </div>
        <ul className="nav-links">
          <li className={`nav-link ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => setActiveTab("dashboard")}><span>🏠</span> Dashboard</li>
          <li className={`nav-link ${activeTab === "clubs" ? "active" : ""}`} onClick={() => setActiveTab("clubs")}><span>🛡️</span> My Clubs</li>
          <li className={`nav-link ${activeTab === "events" ? "active" : ""}`} onClick={() => setActiveTab("events")}><span>📅</span> Events</li>
          <li className={`nav-link ${activeTab === "past-events" ? "active" : ""}`} onClick={() => setActiveTab("past-events")}><span>🗂️</span> Past Events</li>
          <li className={`nav-link ${activeTab === "explore" ? "active" : ""}`} onClick={() => setActiveTab("explore")}><span>🔍</span> Explore Clubs</li>
          <li className={`nav-link ${activeTab === "notifications" ? "active" : ""}`} onClick={() => setActiveTab("notifications")}>
            <span>🔔</span> Notifications
            {unreadNotifications > 0 && <span className="notif-badge">{unreadNotifications}</span>}
          </li>
          <li className={`nav-link ${activeTab === "profile" ? "active" : ""}`} onClick={() => setActiveTab("profile")}><span>👤</span> Profile</li>
          {JSON.parse(localStorage.getItem("user"))?.isClubLeader && (
            <li className="nav-link" onClick={() => { localStorage.setItem("role", "club"); navigate("/clubdashboard"); }} style={{ color: '#6366f1', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px' }}>
              <span>👑</span> Club Dashboard
            </li>
          )}
          <li className="nav-link logout" onClick={handleLogout}><span>🚪</span> Logout</li>
        </ul>
      </aside>

      <main className="main-content">
        <header className="top-navbar">
          {activeTab === "profile" ? (
            <h2 className="tab-title">User Profile</h2>
          ) : (
            <>
              <div className="search-container">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search clubs, events, categories..."
                  className="search-bar-enhanced"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery.length > 2 && (
                  <div className="search-dropdown">
                    {searchResults.events.length > 0 && <h4>Events</h4>}
                    {searchResults.events.map(e => (
                      <div key={e._id} className="search-item" onClick={() => { navigate(`/viewpost/${e._id}`); setSearchQuery(""); }}>
                        <span>📅</span> {e.title}
                      </div>
                    ))}
                    {searchResults.clubs.length > 0 && <h4>Clubs</h4>}
                    {searchResults.clubs.map(c => (
                      <div key={c._id} className="search-item" onClick={() => { navigate(`/viewclub?id=${c._id}`); setSearchQuery(""); }}>
                        <span>🛡️</span> {c.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="user-profile-top" onClick={() => setActiveTab("profile")} style={{ cursor: 'pointer' }}>
                <span className="user-name">{data?.user.fullName || "Loading..."}</span>
                <img src={data?.user.profileImage} alt="User" className="profile-img-small" />
              </div>
            </>
          )}
        </header>

        {renderContent()}
      </main>
      <ChatBot />
    </div>
  );
};

export default StudentDashboard;