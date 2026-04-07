import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./viewPost.css";
import logo from "./banasthali-logo.jpg";
import { ArrowLeft, Calendar, Clock, MapPin, CheckCircle } from "lucide-react";

import config from "./config";
const API = config.API_BASE_URL;

export default function ViewPost() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasVisitedForm, setHasVisitedForm] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const token = localStorage.getItem("token");
        const user = JSON.parse(localStorage.getItem("user"));

        if (id) {
          const res = await axios.get(`${API}/api/events/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setPost(res.data);
          // Check if already registered
          if (res.data.participants?.some(p => p._id === user?.id || p === user?.id)) {
            setIsRegistered(true);
          }
        } else {
          // Fallback to legacy
          const index = localStorage.getItem("viewPostIndex");
          const posts = JSON.parse(localStorage.getItem("posts")) || [];
          setPost(posts[index]);
        }
      } catch (err) {
        console.error("Error fetching post:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  const handleRegister = async () => {
    if (!hasVisitedForm) {
      alert("Please fill the registration form first!");
      return;
    }

    setRegistering(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/api/events/register/${post._id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsRegistered(true);
      alert("Registration successful! Points awarded.");
    } catch (err) {
      alert("Registration failed. Please try again.");
    } finally {
      setRegistering(false);
    }
  };

  if (loading) return <div className="loading-screen"><div className="custom-spinner"></div></div>;
  if (!post) return <div className="error-content"><h2>Post not found</h2><button onClick={() => navigate(-1)}>Go Back</button></div>;

  return (
    <div className="vp-page-root">
      <header className="vp-header">
        <div className="vp-header-left" onClick={() => navigate("/studentdashboard")}>
          <div className="vp-logo-wrap">
            <img src={logo} alt="Banasthali Logo" />
          </div>
          <span className="vp-brand">Banverse</span>
        </div>
        <div className="vp-header-right">
          <button className="vp-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} /> Back
          </button>
        </div>
      </header>

      <main className="vp-container">
        <div className="vp-card">
          <h2 className="vp-title">{post.title}</h2>
          <div className="vp-meta">
            <p className="vp-club-pill" onClick={(e) => {
              e.stopPropagation();
              localStorage.setItem("viewClubId", post.club?._id || post.clubId);
              navigate("/viewclub");
            }}>
              {post.club?.name || post.clubName || "Banverse Member"}
            </p>
            <span className="vp-tag">{post.category || "Event"}</span>
          </div>

          <div className="vp-image-wrap">
            <img src={post.poster || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800"} alt="Event" />
          </div>

          <div className="vp-details-grid">
            <div className="vp-detail-item">
              <div className="vp-detail-icon"><Calendar size={20} /></div>
              <div className="vp-detail-content">
                <strong>Date</strong>
                <span>{new Date(post.date).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="vp-detail-item">
              <div className="vp-detail-icon"><Clock size={20} /></div>
              <div className="vp-detail-content">
                <strong>Time</strong>
                <span>{post.time || "TBA"}</span>
              </div>
            </div>
            <div className="vp-detail-item vp-full-width">
              <div className="vp-detail-icon"><MapPin size={20} /></div>
              <div className="vp-detail-content">
                <strong>Venue</strong>
                <span>{post.location || post.venue || "Campus Auditorium"}</span>
              </div>
            </div>
          </div>

          <div className="vp-description">
            <h3>Description</h3>
            <p>{post.description || post.desc}</p>
          </div>

          <div className="vp-registration">
            {isRegistered ? (
              <div className="vp-success-badge">
                <div className="vp-check-icon"><CheckCircle size={24} /></div>
                <span>You are registered for this event!</span>
              </div>
            ) : post.regLink ? (
              <div className="vp-workflow">
                <div className={`vp-step ${hasVisitedForm ? 'vp-completed' : 'vp-active'}`}>
                  <div className="vp-step-num">1</div>
                  <div className="vp-step-info">
                    <h4>Fill Registration Form</h4>
                    <p>Required by club organizers</p>
                    <a
                      href={post.regLink}
                      target="_blank"
                      rel="noreferrer"
                      className="vp-form-link"
                      onClick={() => setHasVisitedForm(true)}
                    >
                      Open Form Link
                    </a>
                  </div>
                </div>

                <div className={`vp-step ${hasVisitedForm ? 'vp-active' : 'vp-disabled'}`}>
                  <div className="vp-step-num">2</div>
                  <div className="vp-step-info">
                    <h4>Complete Registration</h4>
                    <p>Click after filling the form</p>
                    <button
                      className="vp-register-btn"
                      disabled={!hasVisitedForm || registering}
                      onClick={handleRegister}
                    >
                      {registering ? "..." : "Confirm My Spot"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                className="vp-register-btn vp-full-btn"
                onClick={() => { setHasVisitedForm(true); handleRegister(); }}
                disabled={registering}
              >
                {registering ? "Processing..." : "Register Now"}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}