import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "./viewClub.css";
import logo from "./banasthali-logo.jpg";
import { 
  Calendar, Users, Building, ArrowLeft, 
  Mail, Phone, Instagram, Linkedin, 
  ExternalLink, MapPin
} from "lucide-react";

import config from "./config";
const API = config.API_BASE_URL;

export default function ViewClub() {
  const navigate = useNavigate();
  const location = useLocation();
  const [club, setClub] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const clubId = new URLSearchParams(location.search).get("id");

  useEffect(() => {
    const fetchClubData = async () => {
      if (!clubId) {
        setError("Club identity not found.");
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch club details
        const clubRes = await axios.get(`${API}/api/clubs/${clubId}`, { headers });
        setClub(clubRes.data.club);

        // Fetch club events (Clustered)
        const eventsRes = await axios.get(`${API}/api/dashboard/events/club/${clubId}`, { headers });
        setEvents(eventsRes.data);
      } catch (err) {
        console.error("ViewClub error:", err);
        setError("Failed to load club information.");
      } finally {
        setLoading(false);
      }
    };

    fetchClubData();
  }, [clubId]);

  if (loading) return (
    <div className="view-club-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner"></div>
    </div>
  );

  if (error || !club) return (
    <div className="view-club-page" style={{ padding: '4rem', textAlign: 'center' }}>
      <h2 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', fontWeight: 800 }}>{error || "Club not found"}</h2>
      <button onClick={() => navigate("/studentdashboard")} className="nav-back-button" style={{ margin: '0 auto' }}>
        <ArrowLeft size={20} /> Back to Discover
      </button>
    </div>
  );

  // Fallback Banner Color
  // Explicit Banner Styling
  const bannerStyle = club.banner ? {
    backgroundImage: `url(${club.banner})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  } : {
    background: `linear-gradient(135deg, #6366f1, #a855f7)`
  };

  const today = new Date();
  today.setHours(0,0,0,0);
  
  const upcomingEvents = events.filter(e => new Date(e.date) >= today);
  const pastEvents = events.filter(e => new Date(e.date) < today);

  return (
    <div className="view-club-page">
      {/* Premium Glass NavBar */}
      <nav className="club-view-navbar">
        <button onClick={() => navigate("/studentdashboard")} className="nav-back-button">
          <ArrowLeft size={20} /> Dashboard
        </button>
        <img src={logo} alt="Banasthali Logo" style={{ height: '42px' }} />
      </nav>

      <main className="club-dashboard-wrapper">
        <header className="club-profile-header reveal-up">
          <div className="club-banner-area" style={bannerStyle}>
             <div className="club-banner-overlay" />
          </div>
          <div className="club-profile-brief">
            <div className="club-logo-outer">
              <img src={club.logo || logo} className="club-logo-inner" alt={club.name} />
            </div>
            <div className="club-name-stack">
              <h1>{club.name}</h1>
              <div className="club-badge-row">
                <span className="badge badge-primary">{club.category}</span>
                <span className="badge badge-secondary">Verified Club</span>
                <span className="badge" style={{ background: '#f8fafc', color: '#1e293b' }}>
                  <Users size={14} style={{ display: 'inline', marginRight: '5px' }} /> {events.length > 5 ? 'Elite Organization' : 'Rising Core'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="club-stats-row" style={{ display: 'flex', gap: '3rem', padding: '1rem 3rem 2rem', color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Building size={16} /> Banasthali Vidyapith</div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={16} /> {events.length} Events Hosted</div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={16} /> Campus Registered</div>
          </div>
        </header>

        <section className="club-content-grid">
          {/* Main Info Card */}
          <div className="info-area reveal-up" style={{ animationDelay: '0.1s' }}>
            <div className="club-card-standard">
              <div className="section-title">About the Society</div>
              <p className="about-text">{club.description || "The society mission statement is being refined by the club administrators. Stay tuned for a deeper look into their core objectives."}</p>
              
              {club.vision && (
                <div style={{ marginTop: '3rem' }}>
                  <div className="section-title">Future Vision</div>
                  <p className="about-text" style={{ fontStyle: 'italic' }}>"{club.vision}"</p>
                </div>
              )}

               <div className="club-social-links">
                 {club.instagram && (
                   <a href={club.instagram} target="_blank" rel="noreferrer" className="social-pill">
                      <Instagram size={18} /> Instagram
                   </a>
                 )}
                 {club.linkedin && (
                   <a href={club.linkedin} target="_blank" rel="noreferrer" className="social-pill">
                      <Linkedin size={18} /> LinkedIn
                   </a>
                 )}
                 {club.email && (
                   <a href={`mailto:${club.email}`} className="social-pill">
                      <Mail size={18} /> {club.email}
                   </a>
                 )}
                 {club.phone && (
                   <a href={`tel:${club.phone}`} className="social-pill">
                      <Phone size={18} /> {club.phone}
                   </a>
                 )}
              </div>
            </div>
          </div>

          {/* Upcoming Events Sidebar Card */}
          <div className="events-sidebar-area reveal-up" style={{ animationDelay: '0.2s' }}>
            <div className="club-card-standard" style={{ padding: '2rem' }}>
              <div className="section-title" style={{ marginBottom: '2rem' }}>
                Upcoming Hub ({upcomingEvents.length})
              </div>
              
              <div className="event-list-sidebar">
                {upcomingEvents.length > 0 ? upcomingEvents.map(e => (
                  <div key={e._id} className="event-item-card" onClick={() => navigate(`/viewpost/${e._id}`)}>
                    <div className="event-date-box">
                      <span className="event-date-day">{new Date(e.date).getDate()}</span>
                      <span className="event-date-month">{new Date(e.date).toLocaleString('default', { month: 'short' })}</span>
                    </div>
                    <div className="event-item-content">
                      <h4>{e.title}</h4>
                      <span>{e.category} Workshop <ExternalLink size={12} style={{ marginLeft: '4px' }} /></span>
                    </div>
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>
                    <Calendar size={48} style={{ opacity: 0.1, margin: '0 auto 1rem' }} />
                    <p>No upcoming activities at the moment. Keep following us for updates!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Past Events Sidebar Card */}
          <div className="events-sidebar-area reveal-up" style={{ animationDelay: '0.3s' }}>
            <div className="club-card-standard" style={{ padding: '2rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div className="section-title" style={{ marginBottom: '2rem', color: '#64748b' }}>
                Past Events ({pastEvents.length})
              </div>
              
              <div className="event-list-sidebar">
                {pastEvents.length > 0 ? pastEvents.map(e => (
                  <div key={e._id} className="event-item-card" onClick={() => navigate(`/viewpost/${e._id}`)} style={{ opacity: 0.8 }}>
                    <div className="event-date-box" style={{ background: '#e2e8f0' }}>
                      <span className="event-date-day" style={{ color: '#475569' }}>{new Date(e.date).getDate()}</span>
                      <span className="event-date-month" style={{ color: '#475569' }}>{new Date(e.date).toLocaleString('default', { month: 'short' })}</span>
                    </div>
                    <div className="event-item-content">
                      <h4 style={{ color: '#334155' }}>{e.title}</h4>
                      <span>Completed • {e.category} <ExternalLink size={12} style={{ marginLeft: '4px' }} /></span>
                    </div>
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>
                    <Calendar size={48} style={{ opacity: 0.1, margin: '0 auto 1rem' }} />
                    <p>No past events recorded yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer style={{ textAlign: 'center', padding: '4rem 0', opacity: 0.5 }}>
         <p>© 2026 {club.name} • Banverse Intelligence Ecosystem</p>
      </footer>
    </div>
  );
}