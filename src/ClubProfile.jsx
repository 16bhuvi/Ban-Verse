import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  BarChart3, LogOut, Settings, Activity, Camera, Save, ArrowLeft, Mail, Phone, Instagram, Linkedin, Users, Calendar, Image as ImageIcon
} from "lucide-react";
import "./ClubDashboard.css";
import "./ClubProfile.css";

const ClubProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    email: "",
    phone: "",
    instagram: "",
    linkedin: "",
    category: "Technical",
    logo: ""
  });

  const categories = ["Technical", "Cultural", "Workshop", "Hackathon", "Seminar", "Sports", "Entrepreneurship"];

  useEffect(() => {
    const fetchClubProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return navigate("/login");

        const res = await axios.get("http://localhost:5001/api/club-leader/dashboard", {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data.club) {
          const c = res.data.club;
          setForm({
            name: c.name || "",
            description: c.description || "",
            email: c.email || "",
            phone: c.phone || "",
            instagram: c.instagram || "",
            linkedin: c.linkedin || "",
            category: c.category || "Technical",
            logo: c.logo || ""
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };
    fetchClubProfile();
  }, [navigate]);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setForm({ ...form, logo: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put("http://localhost:5001/api/club-leader/update-profile", form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Profile updated successfully!");
      navigate("/clubdashboard");
    } catch (err) {
      alert("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="club-layout">
      {/* Sidebar - Consistent with Dashboard */}
      <aside className="club-sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon"><Activity size={24} /></div>
          <span className="brand-text">Banverse</span>
        </div>

        <div className="leader-badge">Club Leader</div>

        <div className="nav-section">
          <h4 className="nav-label">Main Menu</h4>
          <button onClick={() => navigate("/clubdashboard")} className="nav-item">
            <BarChart3 size={20} /> <span>Dashboard</span>
          </button>
          <button className="nav-item" disabled>
            <Users size={20} /> <span style={{ opacity: 0.5 }}>Members</span>
          </button>
          <button className="nav-item" disabled>
            <Calendar size={20} /> <span style={{ opacity: 0.5 }}>Events</span>
          </button>
          <button className="nav-item" disabled>
            <ImageIcon size={20} /> <span style={{ opacity: 0.5 }}>Gallery</span>
          </button>
        </div>

        <div className="nav-section" style={{ marginTop: '2rem' }}>
          <h4 className="nav-label">Management</h4>
          <button className="nav-item active">
            <Settings size={20} /> <span>Profile Settings</span>
          </button>
        </div>

        <div className="logout-container">
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
        <header className="main-header">
          <div className="club-branding">
            <button onClick={() => navigate("/clubdashboard")} className="btn-icon">
              <ArrowLeft size={20} />
            </button>
            <div className="club-info-text">
              <h1>Club Profile Settings</h1>
              <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>Refine your club's identity on Banverse</p>
            </div>
          </div>
        </header>

        <div className="profile-edit-grid">
          <form className="profile-form-card dash-card" onSubmit={saveProfile}>
            <div className="card-header">
              <h3>General Information</h3>
            </div>
            <div className="card-body">
              <div className="profile-logo-section">
                <div className="logo-upload-wrapper">
                  <img src={form.logo || "https://via.placeholder.com/150"} alt="Logo" className="profile-logo-preview" />
                  <label className="logo-edit-btn">
                    <Camera size={18} />
                    <input type="file" hidden onChange={handleLogoChange} accept="image/*" />
                  </label>
                </div>
                <div className="logo-hint">
                  <h4>Club Logo</h4>
                  <p>PNG or JPG, max 5MB. Circular crops work best.</p>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Club Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Google Developer Student Club"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1.5rem' }}>
                <label>Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe your club's mission and activities..."
                  rows={4}
                />
              </div>
            </div>

            <div className="card-header" style={{ borderTop: '1px solid #f1f5f9' }}>
              <h3>Contact & Socials</h3>
            </div>
            <div className="card-body">
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Official Email</label>
                  <div className="input-with-icon">
                    <Mail size={18} />
                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="club@banasthali.in" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Contact Number</label>
                  <div className="input-with-icon">
                    <Phone size={18} />
                    <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 XXX-XXX-XXXX" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Instagram URL</label>
                  <div className="input-with-icon">
                    <Instagram size={18} />
                    <input type="text" value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} placeholder="instagram.com/club" />
                  </div>
                </div>
                <div className="form-group">
                  <label>LinkedIn URL</label>
                  <div className="input-with-icon">
                    <Linkedin size={18} />
                    <input type="text" value={form.linkedin} onChange={e => setForm({ ...form, linkedin: e.target.value })} placeholder="linkedin.com/company/club" />
                  </div>
                </div>
              </div>

              <div className="form-actions" style={{ marginTop: '2.5rem' }}>
                <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', height: '50px' }}>
                  {loading ? 'Saving Changes...' : <><Save size={20} /> Save Club Profile</>}
                </button>
              </div>
            </div>
          </form>

          <aside className="profile-sidebar-info">
            <div className="info-card dash-card">
              <div className="card-header">
                <h3>Visibility</h3>
              </div>
              <div className="card-body">
                <div className="visibility-status">
                  <div className="status-dot"></div>
                  <span>Your profile is <strong>Public</strong></span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
                  Public clubs are visible to all students on the explore page.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default ClubProfile;