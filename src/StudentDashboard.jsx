import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./StudentDashboard.css";
import logo from "./banasthali-logo.jpg";
import ChatBot from "./ChatBot";

const CATEGORIES = ["Technical", "Cultural", "Workshop", "Hackathon", "Seminar", "Sports", "Entrepreneurship"];

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({ events: [], clubs: [] });
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState({
    fullName: "",
    department: "",
    year: "",
    bio: "",
    interests: [],
    profileImage: "",
    resume: ""
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

        const response = await axios.get("http://localhost:5001/api/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setData(response.data);

        // Fetch Notifications Count
        const notifRes = await axios.get("http://localhost:5001/api/notifications", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUnreadNotifications(notifRes.data.unreadCount);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        const url = error.config?.url || "unknown URL";
        setErrorMessage(`${url} failed: ${error.response?.status || error.message}`);
        if (error.response?.status === 401) {
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length > 2) {
        try {
          const token = localStorage.getItem("token");
          const res = await axios.get(`http://localhost:5001/api/search?q=${searchQuery}`, {
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

  const renderDashboard = () => {
    if (!data) return null;
    const { user, stats, upcomingEvents, recommendedClubs } = data;

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
          <section className="section-card">
            <div className="section-header">
              <h3 className="section-title">Upcoming Events</h3>
              <button className="text-btn" onClick={() => setActiveTab("events")}>View All</button>
            </div>
            <div className="event-list">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map(event => (
                  <div className="event-item-modern" key={event._id}>
                    <div className="event-date-box">
                      <div className="month">{new Date(event.date).toLocaleString('default', { month: 'short' })}</div>
                      <div className="day">{new Date(event.date).getDate()}</div>
                    </div>
                    <div className="event-info">
                      <h4>{event.title}</h4>
                      <p>{event.club?.name || "Independent Event"}</p>
                    </div>
                    <button className="register-btn">Register</button>
                  </div>
                ))
              ) : (
                <p>No upcoming events found.</p>
              )}
            </div>
          </section>

          <section className="section-card">
            <div className="section-header">
              <h3 className="section-title">Explore Clubs</h3>
            </div>
            <div className="club-list">
              {recommendedClubs.length > 0 ? (
                recommendedClubs.map(club => (
                  <div className="club-item-modern" key={club._id}>
                    <div className="club-logo-modern">{club.name.charAt(0)}</div>
                    <div className="club-info"><h4>{club.name}</h4></div>
                    <button className="join-btn-small">Join</button>
                  </div>
                ))
              ) : (
                <p>All caught up!</p>
              )}
            </div>
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
        </div>
        <div className="event-list">
          {data?.upcomingEvents.filter(e => selectedCategories.length === 0 || selectedCategories.includes(e.category)).map(event => (
            <div className="event-item-modern" key={event._id}>
              <div className="event-date-box">
                <div className="month">{new Date(event.date).toLocaleString('default', { month: 'short' })}</div>
                <div className="day">{new Date(event.date).getDate()}</div>
              </div>
              <div className="event-info">
                <h4>{event.title} <span className="cat-badge">{event.category}</span></h4>
                <p>{event.club?.name || "Independent Event"}</p>
              </div>
              <button className="register-btn" onClick={() => handleRegister(event._id)}>Register</button>
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
          const res = await axios.get("http://localhost:5001/api/events/past", {
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
        <p className="subtitle">Your participation record from the last 1 year.</p>
        <div className="history-timeline">
          {Object.keys(grouped).length > 0 ? Object.entries(grouped).map(([month, events]) => (
            <div key={month} className="month-group">
              <h3 className="month-label">📅 {month}</h3>
              <div className="month-events">
                {events.map(event => (
                  <div key={event._id} className="past-event-item">
                    <div className="dot"></div>
                    <div className="past-event-info">
                      <strong>{event.title}</strong>
                      <span>{event.club?.name} • Participated</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )) : <p className="empty-state">No past events recorded yet. Start participating to earn points!</p>}
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
              <label>Resume (PDF/Image)</label>
              <div className="file-input-wrapper">
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => handleFileChange(e, "resume")}
                />
                {editProfileData.resume && <span className="file-status">✅ Resume Attached</span>}
              </div>
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

    return (
      <div className="profile-edit-container">
        <div className="profile-header-card">
          <img src={user.profileImage} alt="Profile" className="profile-main-img" />
          <div className="profile-info-main">
            <h2>{user.fullName}</h2>
            <p className="email">{user.email}</p>
            <div className="user-badges">
              <span className="badge">Year {user.year}</span>
              <span className="badge">{user.department}</span>
            </div>
          </div>
          <button className="primary-btn" onClick={() => {
            setEditProfileData({
              fullName: user.fullName,
              department: user.department || "",
              year: user.year || "",
              bio: user.bio || "",
              interests: user.interests || [],
              profileImage: user.profileImage,
              resume: user.resume || ""
            });
            setIsEditingProfile(true);
          }}>Edit Profile</button>
        </div>
        <div className="profile-details-grid">
          <div className="detail-card">
            <h3>Bio</h3>
            <p>{user.bio || "No bio added yet."}</p>
          </div>
          <div className="detail-card">
            <h3>Interests</h3>
            <div className="interest-tags">
              {user.interests.length > 0 ? user.interests.map(i => <span key={i} className="tag">{i}</span>) : <p>Add interests to find better clubs!</p>}
            </div>
          </div>
          <div className="detail-card">
            <h3>Resume</h3>
            {user.resume ? (
              <a href={user.resume} target="_blank" rel="noopener noreferrer" className="view-resume-link">
                📄 View Resume
              </a>
            ) : (
              <p className="text-muted">No resume uploaded yet.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put("http://localhost:5001/api/user/update-profile", editProfileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message);
      setIsEditingProfile(false);
      window.location.reload();
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
      <div className="section-card">
        <h2 className="section-title">My Joined Clubs</h2>
        <div className="club-grid-premium" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
          {clubs.length > 0 ? clubs.map(club => (
            <div key={club._id} className="club-item-modern">
              <div className="club-logo-modern">{club.name.charAt(0)}</div>
              <div className="club-info">
                <h4>{club.name}</h4>
                <p>{club.category} Member</p>
              </div>
              <button className="join-btn-small" onClick={() => navigate(`/viewclub?id=${club._id}`)}>View</button>
            </div>
          )) : <p>You haven't joined any clubs yet. Explore and join some!</p>}
        </div>
      </div>
    );
  };

  const renderExplore = () => {
    const clubs = data?.recommendedClubs || [];
    return (
      <div className="section-card">
        <h2 className="section-title">Discover Clubs</h2>
        <p className="subtitle">Based on your interests: {data?.user.interests.join(", ") || "General"}</p>
        <div className="club-list" style={{ marginTop: '1.5rem' }}>
          {clubs.map(club => (
            <div key={club._id} className="club-item-modern">
              <div className="club-logo-modern">{club.name.charAt(0)}</div>
              <div className="club-info">
                <h4>{club.name}</h4>
                <p>{club.description?.substring(0, 60)}...</p>
              </div>
              <button className="join-btn-small" onClick={() => handleJoinClub(club._id)}>Join Club</button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handleJoinClub = async (clubId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`http://localhost:5001/api/clubs/join/${clubId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Successfully joined club! +10 points.");
      window.location.reload();
    } catch (err) {
      alert("Failed to join club.");
    }
  };

  const renderNotifications = () => {
    return (
      <div className="section-card">
        <h2 className="section-title">Your Notifications</h2>
        <div className="notification-list" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {unreadNotifications > 0 ? (
            <div className="notif-item highlight" style={{ padding: '15px', background: '#f0f4ff', borderRadius: '12px', borderLeft: '4px solid #4f46e5' }}>
              <strong>New Announcement</strong>
              <p>Check out the new hackathon event from Tech Club!</p>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Just now</span>
            </div>
          ) : (
            <div className="empty-state">
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

  const handleRegister = async (eventId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`http://localhost:5001/api/events/register/${eventId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Registration Successful! +20 points.");
      window.location.reload(); // Refresh to update points
    } catch (error) {
      alert("Failed to register.");
    }
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
                    {searchResults.events.map(e => <div key={e._id} className="search-item">{e.title}</div>)}
                    {searchResults.clubs.length > 0 && <h4>Clubs</h4>}
                    {searchResults.clubs.map(c => <div key={c._id} className="search-item">{c.name}</div>)}
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