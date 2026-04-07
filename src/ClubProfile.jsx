import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Camera, Save, ArrowLeft, Mail, Phone, Instagram, Linkedin
} from "lucide-react";
import "./ClubDashboard.css";
import "./ClubProfile.css";

import config from "./config";

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
    logo: "",
    banner: ""
  });

  const categories = ["Technical", "Cultural", "Workshop", "Hackathon", "Seminar", "Sports", "Entrepreneurship"];

  useEffect(() => {
    const fetchClubProfile = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        const token = localStorage.getItem("token");
        
        if (!token || !user) return navigate("/login");
        
        // Final guard for main leader access
        if (!user.isClubLeader && user.globalRole !== 'admin') {
          return navigate("/home");
        }

        const res = await axios.get(`${config.API_BASE_URL}/api/club-leader/dashboard`, {
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
            logo: c.logo || "",
            banner: c.banner || ""
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

  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setForm({ ...form, banner: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();

    // MANDATORY VALIDATIONS
    if (!form.logo) return alert("Please upload a local club logo. It's compulsory!");
    if (!form.banner) return alert("Please upload a cover banner. It's compulsory for a professional dashboard!");
    if (!form.description || form.description.length < 20) return alert("Please provide a proper description (min 20 characters). It's compulsory!");

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${config.API_BASE_URL}/api/club-leader/update-profile`, form, {
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
      {/* Main Content */}
      <main className="club-main" style={{ marginLeft: 0, width: '100%' }}>
        <header className="main-header" style={{ padding: '1rem 2rem', background: 'white', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10 }}>
          <div className="club-branding">
            <button type="button" onClick={() => navigate("/clubdashboard")} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '10px', boxShadow: 'none', width: 'auto' }}>
              <ArrowLeft size={18} /> Back to Dashboard
            </button>
            <div className="club-info-text" style={{ marginLeft: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Club Profile Settings</h2>
              <p style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 500, margin: 0 }}>Refine your club's identity on Banverse</p>
            </div>
          </div>
        </header>

        <div className="profile-container-inner" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
          <div className="profile-edit-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
            <form className="profile-form-card dash-card" onSubmit={saveProfile} style={{ padding: '2rem' }}>
              <div className="card-header" style={{ border: 'none', padding: 0, marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>General Information</h2>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>These details are visible to all students on the explore page.</p>
              </div>

              <div className="card-body" style={{ padding: 0 }}>
                <div className="profile-images-grid" style={{ display: 'grid', gridTemplateColumns: 'min-content 1fr', gap: '2rem', marginBottom: '2rem' }}>
                  <div className="profile-logo-section">
                    <div className="logo-upload-wrapper">
                      <img src={form.logo || "https://via.placeholder.com/150"} alt="Logo" className="profile-logo-preview" />
                      <label className="logo-edit-btn">
                        <Camera size={18} />
                        <input type="file" hidden onChange={handleLogoChange} accept="image/*" />
                      </label>
                    </div>
                    <div className="logo-hint">
                      <h4>Club Logo*</h4>
                      <p>Circular crops work best.</p>
                    </div>
                  </div>

                  <div className="profile-banner-section" style={{ flex: 1 }}>
                    <div className="banner-upload-wrapper" style={{ height: '120px', background: '#f1f5f9', borderRadius: '12px', position: 'relative', overflow: 'hidden', border: '2px dashed #cbd5e1' }}>
                      {form.banner ? (
                        <img src={form.banner} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>No Cover Uploaded</div>
                      )}
                      <label className="banner-edit-btn" style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'white', padding: '8px', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <Camera size={18} />
                        <input type="file" hidden onChange={handleBannerChange} accept="image/*" />
                      </label>
                    </div>
                    <div className="logo-hint" style={{ marginTop: '0.5rem' }}>
                      <h4>Cover Banner*</h4>
                      <p>Wide aspect ratio recommended.</p>
                    </div>
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
                  <label>Description*</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe your club's mission, goals, and recurring activities..."
                    rows={4}
                    required
                  />
                </div>

                <div className="card-header" style={{ borderTop: '1px solid #f1f5f9', padding: '2rem 0 1rem 0', marginTop: '1rem', background: 'none' }}>
                  <h3 style={{ margin: 0 }}>Contact & Socials</h3>
                </div>
                
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
                  <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', height: '50px', background: '#6366f1' }}>
                    {loading ? 'Saving Changes...' : <><Save size={20} /> Save Club Profile</>}
                  </button>
                </div>
              </div>
            </form>

            <aside className="profile-sidebar-info">
              <div className="info-card dash-card" style={{ padding: '1.5rem' }}>
                <div className="card-header" style={{ border: 'none', padding: 0, marginBottom: '1rem' }}>
                  <h3>Visibility Status</h3>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  <div className="visibility-status" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="status-dot" style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '50%' }}></div>
                    <span>Your profile is <strong>Public</strong></span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '1rem', lineHeight: '1.5' }}>
                    Public clubs are visible to all students on the explore page. Keep your info updated to attract more applicants.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ClubProfile;