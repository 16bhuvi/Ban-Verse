import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./createPost.css";
import { ArrowLeft, AlertCircle, Calendar, Clock, MapPin, Award, PlusCircle, Link as LinkIcon, Phone } from "lucide-react";

export default function CreatePost() {
  const navigate = useNavigate();
  const [poster, setPoster] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    category: "Technical",
    regLink: "",
    contact: ""
  });

  const categories = ["Technical", "Cultural", "Workshop", "Hackathon", "Seminar", "Sports", "Entrepreneurship"];

  const handlePoster = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setPoster(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      await axios.post("http://localhost:5001/api/club-leader/create-event",
        { ...form, poster },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate("/clubdashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Error creating event. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/clubdashboard");
  };

  return (
    <div className="create-container">
      <header className="create-nav">
        <button className="back-link" onClick={handleCancel}>
          <ArrowLeft size={20} /> Back to Dashboard
        </button>
        <span className="nav-title">Event Studio</span>
      </header>

      <main className="create-content">
        <div className="create-card">
          <div className="create-header">
            <h2>Create New Event</h2>
            <p>Publish an event to the Banverse community</p>
          </div>

          <form onSubmit={submit} className="event-form">
            {error && (
              <div className="error-box">
                <AlertCircle size={20} /> {error}
              </div>
            )}

            <div className="form-section">
              <label className="upload-zone" style={{ backgroundImage: poster ? `url(${poster})` : 'none' }}>
                {!poster && (
                  <div className="upload-placeholder">
                    <PlusCircle size={32} />
                    <span>Upload Event Poster</span>
                    <small>Recommended: 1200x630px</small>
                  </div>
                )}
                <input type="file" onChange={handlePoster} accept="image/*" hidden />
                {poster && <div className="change-overlay">Change Image</div>}
              </label>
            </div>

            <div className="form-grid">
              <div className="form-group full">
                <label>Event Title</label>
                <div className="input-with-icon">
                  <Award size={18} />
                  <input
                    type="text"
                    placeholder="e.g. Annual Hackathon 2026"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Date</label>
                <div className="input-with-icon">
                  <Calendar size={18} />
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Time</label>
                <div className="input-with-icon">
                  <Clock size={18} />
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Location / Venue</label>
                <div className="input-with-icon">
                  <MapPin size={18} />
                  <input
                    type="text"
                    placeholder="e.g. Science Block Auditorium"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Registration Link (Optional)</label>
                <div className="input-with-icon">
                  <LinkIcon size={18} />
                  <input
                    type="url"
                    placeholder="https://forms.gle/..."
                    value={form.regLink}
                    onChange={(e) => setForm({ ...form, regLink: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Contact Info</label>
                <div className="input-with-icon">
                  <Phone size={18} />
                  <input
                    type="text"
                    placeholder="e.g. +91 9876543210"
                    value={form.contact}
                    onChange={(e) => setForm({ ...form, contact: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="form-group full" style={{ marginTop: '1.5rem' }}>
              <label>Event Description</label>
              <textarea
                placeholder="What is this event about? Mention key highlights..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
            </div>

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={handleCancel}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Publishing..." : "Publish Event"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}