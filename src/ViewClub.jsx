import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "./viewClub.css";
import logo from "./banasthali-logo.jpg";
import { Calendar, Users, Building, ArrowLeft } from "lucide-react";

const API = "http://localhost:5001";

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
        setError("Club ID not found");
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch club details
        const clubRes = await axios.get(`${API}/api/clubs/${clubId}`, { headers });
        setClub(clubRes.data);

        // Fetch club events (Clustered) - FIXED ROUTE
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

  if (loading) return <div className="centered-loader"><div className="spinner"></div></div>;
  if (error || !club) return (
    <div className="error-container" style={{ padding: '4rem', textAlign: 'center' }}>
      <h2>{error || "Club not found"}</h2>
      <button onClick={() => navigate("/studentdashboard")} className="btn-flex-primary" style={{ marginTop: '1rem', width: 'auto', display: 'inline-flex' }}>
        Go Back to Dashboard
      </button>
    </div>
  );

  return (
    <div className="view-club-page">
      <header className="club-view-header" style={{ padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '80px', background: 'white', borderBottom: '1px solid #f1f5f9' }}>
        <div className="header-left-group" onClick={() => navigate("/studentdashboard")} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#6366f1', fontWeight: 'bold' }}>
          <ArrowLeft size={20} />
          <span>Dashboard</span>
        </div>
        <img src={logo} alt="banasthali logo" style={{ height: '50px' }} />
      </header>

      <main className="club-detail-container" style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 20px' }}>
        <section className="club-hero-card" style={{ background: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
          <div className="club-banner" style={{ height: '200px', background: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${club.logo})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
          <div className="club-identity" style={{ padding: '0 2.5rem', marginTop: '-50px', display: 'flex', alignItems: 'flex-end', gap: '1.5rem' }}>
            <div className="club-large-logo" style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'white', border: '5px solid white', overflow: 'hidden', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}>
              <img src={club.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div className="club-titles" style={{ paddingBottom: '1rem' }}>
              <h1 style={{ fontSize: '2rem', color: '#1e293b' }}>{club.name}</h1>
              <div className="club-category-tag" style={{ color: '#6366f1', fontWeight: 'bold' }}>{club.category} Member</div>
            </div>
          </div>
          
          <div className="club-stats-strip" style={{ display: 'flex', gap: '2rem', padding: '1.5rem 2.5rem', borderTop: '1px solid #f1f5f9' }}>
            <div className="stat-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}><Users size={18}/> <span>Joined</span></div>
            <div className="stat-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}><Calendar size={18}/> <span>{events.length} Events Cluster</span></div>
            <div className="stat-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}><Building size={18}/> <span>Verified Club</span></div>
          </div>
        </section>

        <section className="club-info-tabs" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginTop: '2rem' }}>
          <div className="info-section" style={{ background: 'white', padding: '2rem', borderRadius: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
            <h3 style={{ marginBottom: '1rem' }}>About the Club</h3>
            <p style={{ color: '#475569', lineHeight: '1.6' }}>{club.description}</p>
            {club.vision && (
                <>
                <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Our Vision</h3>
                <p style={{ color: '#475569', lineHeight: '1.6' }}>{club.vision}</p>
                </>
            )}
          </div>

          <div className="events-section">
            <h3 style={{ marginBottom: '1rem' }}>Club Events ({events.length})</h3>
            <div className="events-grid-mini" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {events.length > 0 ? events.map(event => (
                <div key={event._id} className="mini-event-card" onClick={() => navigate(`/viewpost/${event._id}`)} style={{ background: 'white', padding: '1rem', borderRadius: '16px', display: 'flex', gap: '1rem', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid #f1f5f9' }}>
                  <div className="mini-event-date" style={{ background: '#f8fafc', padding: '8px', borderRadius: '12px', textAlign: 'center', minWidth: '55px' }}>
                    <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 'bold', color: '#1e293b' }}>{new Date(event.date).getDate()}</span>
                    <small style={{ color: '#6366f1', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '10px' }}>{new Date(event.date).toLocaleString('default', { month: 'short' })}</small>
                  </div>
                  <div className="mini-event-info">
                    <h4 style={{ fontSize: '1rem', marginBottom: '4px' }}>{event.title}</h4>
                    <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{event.category}</p>
                  </div>
                </div>
              )) : (
                <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', textAlign: 'center', color: '#94a3b8' }}>
                  <Calendar size={32} style={{ marginBottom: '8px', opacity: 0.3 }} />
                  <p>No events scheduled.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}