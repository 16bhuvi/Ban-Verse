import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';
import logo from './banasthali-logo.jpg';
import eyeIcon from './images/eye.png';
import hiddenIcon from './images/hidden.png';
const Signup = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    course: '',
    branch: '',
    year: '',
    password: '',
    confirmPassword: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailWarning, setEmailWarning] = useState('');

  const courses = ["B.Tech", "B.Pharm", "MBA", "MCA", "M.Tech", "B.Sc", "B.A", "B.Com", "Design"];
  const branches = ["CSE", "IT", "ECE", "Electrical", "Biotechnology", "Mechanical", "HR", "Marketing", "Finance"];
  const years = ["1st", "2nd", "3rd", "4th", "5th"];

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({ ...formData, [name]: value });
    setError('');

    // Email domain warning
    if (name === "email") {
      if (value.includes("@")) {
        const domain = value.split("@")[1];

        if (!"banasthali.in".startsWith(domain)) {
          setEmailWarning("Invalid domain. Only @banasthali.in is allowed.");
        } else {
          setEmailWarning("");
        }
      } else {
        setEmailWarning("");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email.toLowerCase().endsWith("@banasthali.in")) {
      setError("Only Banasthali Vidyapith official emails are allowed.");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5001/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          course: formData.course,
          branch: formData.branch,
          year: formData.year
        })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("verifyEmail", formData.email);
        navigate("/VerifyOtp");
      } else {
        setError(data.error || "Registration failed.");
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
        <h2>Join Ban-verse</h2>
        <p className="subtitle">
          Exclusively for Banasthali Vidyapith Students
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>

          {/* Full Name */}
          <div className="input-group">
            <input
              type="text"
              name="fullName"
              placeholder=" "
              value={formData.fullName}
              onChange={handleChange}
              required
            />
            <label>Full Name</label>
          </div>

          {/* Email */}
          <div className="input-group">
            <input
              type="email"
              name="email"
              placeholder=" "
              value={formData.email}
              onChange={handleChange}
              required
            />
            <label>University Email (@banasthali.in)</label>
          </div>

          {emailWarning && <p className="error-msg">{emailWarning}</p>}

          {/* Course + Branch */}
          <div className="form-row">

            <div className="input-group">
              <select
                name="course"
                value={formData.course}
                onChange={handleChange}
                required
              >
                <option value="" disabled hidden></option>
                {courses.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <label style={
                formData.course
                  ? { top: 0, fontSize: "0.8rem", padding: "0 8px", background: "white" }
                  : {}
              }>
                Course
              </label>
            </div>

            <div className="input-group">
              <select
                name="branch"
                value={formData.branch}
                onChange={handleChange}
                required
              >
                <option value="" disabled hidden></option>
                {branches.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              <label style={
                formData.branch
                  ? { top: 0, fontSize: "0.8rem", padding: "0 8px", background: "white" }
                  : {}
              }>
                Branch
              </label>
            </div>

          </div>

          {/* Year */}
          <div className="input-group">
            <select
              name="year"
              value={formData.year}
              onChange={handleChange}
              required
            >
              <option value="" disabled hidden></option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <label style={
              formData.year
                ? { top: 0, fontSize: "0.8rem", padding: "0 8px", background: "white" }
                : {}
            }>
              Current Year
            </label>
          </div>

          {/* Password */}
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
              style={{ cursor: "pointer", width: "20px", height: "20px" }}
            />
          </div>

          {/* Confirm Password */}
          <div className="input-group">
            <input
              type={showPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder=" "
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
            <label>Confirm Password</label>
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button
            className="auth-btn"
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>

        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Login here</Link>
          <br /><br />
          <Link to="/" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: '500' }}>← Back to Welcome Page</Link>
        </div>

      </div>
    </div>
  );
};

export default Signup;