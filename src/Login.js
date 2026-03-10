import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';
import logo from './banasthali-logo.jpg';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  React.useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (user && token && role) {
      if (user.globalRole === "admin") navigate("/admindashboard");
      else if (role === "club" || role === "core") navigate("/clubdashboard");
      else navigate("/studentdashboard");
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5001/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Login successful:", data);
        const { globalRole, isClubLeader, membershipType, clubId } = data.user;

        // Store full user object (includes membershipType, clubId for routing)
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);

        // ── LOGIN REDIRECTION LOGIC (as per spec) ──
        // 1. Admin → Admin Dashboard
        if (globalRole === "admin") {
          localStorage.setItem("role", "admin");
          navigate("/admindashboard");
        }
        // 2. Student who is Club Leader → Club Leader Dashboard
        else if (isClubLeader) {
          localStorage.setItem("role", "club");
          navigate("/clubdashboard");
        }
        // 3. Core Member → Club Dashboard (core role view)
        else if (membershipType === "Core Member") {
          localStorage.setItem("role", "core");
          if (clubId) {
            navigate(`/club/${clubId}/dashboard`);
          } else {
            navigate("/clubdashboard");
          }
        }
        // 4. General Member / Unaffiliated Student → Student Dashboard
        else {
          localStorage.setItem("role", "student");
          navigate("/studentdashboard");
        }
      } else {
        setError(data.error || "Login failed.");
      }
    } catch (err) {
      setError("Server connection failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <img src={logo} alt="Logo" className="auth-logo" />
        <h2>Welcome Back</h2>
        <p className="subtitle">Sign in to your Ban-verse account</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="email"
              name="email"
              placeholder=" "
              value={formData.email}
              onChange={handleChange}
              required
            />
            <label>University Email</label>
          </div>

          <div className="input-group">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder=" "
              value={formData.password}
              onChange={handleChange}
              required
            />
            <label>Password</label>
            <span className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? "Hide" : "Show"}
            </span>
          </div>

          <div style={{ textAlign: 'right', marginTop: '-10px' }}>
            <Link to="/forgot" style={{ fontSize: '0.85rem', color: '#6366f1' }}>Forgot password?</Link>
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? "Authenticating..." : "Login"}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/signup">Create one now</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;