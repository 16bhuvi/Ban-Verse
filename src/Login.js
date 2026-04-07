import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';
import logo from './banasthali-logo.jpg';
import eyeIcon from './images/eye.png';
import hiddenIcon from './images/hidden.png';

import config from "./config";

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailWarning, setEmailWarning] = useState('');

  React.useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (user && token && role) {
      if (user.globalRole === "admin") navigate("/admindashboard");
      else if (role === "club") navigate("/clubdashboard");
      else navigate("/studentdashboard");
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError('');
    if (name === 'email') {
      if (value.includes('@')) {
        const domain = value.split('@')[1];
        if (!'banasthali.in'.startsWith(domain)) {
          setEmailWarning('Invalid domain. Only @banasthali.in is allowed.');
        } else {
          setEmailWarning('');
        }
      } else {
        setEmailWarning('');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${config.API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Login successful:", data);
        const globalRole = data.user.globalRole;
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);

        // Map role for Home.jsx and redirection
        let redirectRole = globalRole;
        if (data.user.isClubLeader) {
          redirectRole = "club";
        }
        localStorage.setItem("role", redirectRole);

        console.log("Redirecting to dashboard for role:", redirectRole);

        if (globalRole === "admin") {
          navigate("/admindashboard");
        } else if (data.user.isClubLeader) {
          navigate("/clubdashboard");
        } else {
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

          {emailWarning && <p className="error-msg">{emailWarning}</p>}

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
            <img
              src={showPassword ? hiddenIcon : eyeIcon}
              alt={showPassword ? "Hide password" : "Show password"}
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              style={{ cursor: 'pointer', width: '20px', height: '20px' }}
            />
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
          <br /><br />
          <Link to="/" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: '500' }}>← Back to Welcome Page</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;