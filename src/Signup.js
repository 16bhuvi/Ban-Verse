import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';
import logo from './banasthali-logo.jpg';
import eyeIcon from './images/eye.png';
import hiddenIcon from './images/hidden.png';
import config from "./config";

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
  // eslint-disable-next-line no-unused-vars
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailWarning, setEmailWarning] = useState('');

  const courses = ["B.Tech", "B.Pharm", "MBA", "MCA", "M.Tech", "B.Sc", "B.A", "B.Com", "Design"];
  const branches = ["CSE", "IT", "ECE", "Electrical", "Biotechnology", "Mechanical", "HR", "Marketing", "Finance"];
  const years = ["1st", "2nd", "3rd", "4th", "5th"];

  const validateField = (name, value) => {
    let err = "";
    if (name === "fullName") {
      if (!value.trim()) err = "Full Name is required";
      else if (value.trim().length < 3) err = "Name must be at least 3 characters";
      else if (!/^[a-zA-Z\s]+$/.test(value)) err = "Only letters and spaces allowed";
    } else if (name === "email") {
      if (!value) err = "Email is required";
      else if (!value.toLowerCase().endsWith("@banasthali.in")) err = "Use @banasthali.in email";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) err = "Invalid email format";
    } else if (name === "password") {
      if (!value) err = "Password is required";
      else if (value.length < 8) err = "Minimum 8 characters required";
      else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/.test(value)) err = "Include uppercase, lowercase and number";
    } else if (name === "confirmPassword") {
      if (value !== formData.password) err = "Passwords do not match";
    } else if (["course", "branch", "year"].includes(name)) {
      if (!value) err = "Selection required";
    }
    return err;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear field-specific error
    setFieldErrors(prev => ({ ...prev, [name]: "" }));
    setError('');

    if (name === "email") {
      if (value.includes("@")) {
        const domain = value.split("@")[1];
        if (!"banasthali.in".startsWith(domain) && domain !== "") {
          setEmailWarning("Only @banasthali.in allowed");
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
    
    // Validate all fields
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      const err = validateField(key, formData[key]);
      if (err) newErrors[key] = err;
    });

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      setError("Please fix the errors above.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${config.API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          <div className={`input-group ${fieldErrors.fullName ? 'has-error' : ''}`}>
            <input
              type="text"
              name="fullName"
              placeholder=" "
              value={formData.fullName}
              onChange={handleChange}
              required
            />
            <label>Full Name</label>
            {fieldErrors.fullName && <p className="field-error-msg">{fieldErrors.fullName}</p>}
          </div>

          {/* Email */}
          <div className={`input-group ${fieldErrors.email ? 'has-error' : ''}`}>
            <input
              type="email"
              name="email"
              placeholder=" "
              value={formData.email}
              onChange={handleChange}
              required
            />
            <label>University Email (@banasthali.in)</label>
            {fieldErrors.email ? (
              <p className="field-error-msg">{fieldErrors.email}</p>
            ) : emailWarning ? (
              <p className="error-msg">{emailWarning}</p>
            ) : null}
          </div>

          {/* Course + Branch */}
          <div className="form-row">

            <div className={`input-group ${fieldErrors.course ? 'has-error' : ''}`}>
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
              {fieldErrors.course && <p className="field-error-msg">{fieldErrors.course}</p>}
            </div>

            <div className={`input-group ${fieldErrors.branch ? 'has-error' : ''}`}>
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
              {fieldErrors.branch && <p className="field-error-msg">{fieldErrors.branch}</p>}
            </div>

          </div>

          {/* Year */}
          <div className={`input-group ${fieldErrors.year ? 'has-error' : ''}`}>
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
            {fieldErrors.year && <p className="field-error-msg">{fieldErrors.year}</p>}
          </div>

          {/* Password */}
          <div className={`input-group ${fieldErrors.password ? 'has-error' : ''}`}>
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
            {fieldErrors.password && <p className="field-error-msg">{fieldErrors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div className={`input-group ${fieldErrors.confirmPassword ? 'has-error' : ''}`}>
            <input
              type={showPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder=" "
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
            <label>Confirm Password</label>
            <img
              src={showPassword ? hiddenIcon : eyeIcon}
              alt={showPassword ? "Hide password" : "Show password"}
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              style={{ cursor: "pointer", width: "20px", height: "20px" }}
            />
            {fieldErrors.confirmPassword && <p className="field-error-msg">{fieldErrors.confirmPassword}</p>}
          </div>

          {error && !Object.keys(fieldErrors).length && <p className="error-msg text-center">{error}</p>}

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