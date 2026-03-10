import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Auth.css";
import logo from "./banasthali-logo.jpg";

const ResetPassword = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    password: "",
    confirmPassword: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const email = localStorage.getItem("resetEmail");
    const otpVerified = localStorage.getItem("otpVerified");

    if (!email || otpVerified !== "true") {
      navigate("/forgot");
    }
  }, [navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const resetPassword = async (e) => {
    e.preventDefault();

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:5001/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: localStorage.getItem("resetEmail"),
          newPassword: form.password
        }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.removeItem("resetEmail");
        localStorage.removeItem("otpVerified");
        navigate("/login");
      } else {
        setError(data.error || "Failed to reset password.");
      }
    } catch {
      setError("Server error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <img src={logo} alt="Logo" className="auth-logo" />
        <h2>Set New Password</h2>
        <p className="subtitle">Secure your account with a new password</p>

        <form className="auth-form" onSubmit={resetPassword}>
          <div className="input-group">
            <input
              type="password"
              name="password"
              placeholder=" "
              value={form.password}
              onChange={handleChange}
              required
            />
            <label>New Password (min. 8 chars)</label>
          </div>

          <div className="input-group">
            <input
              type="password"
              name="confirmPassword"
              placeholder=" "
              value={form.confirmPassword}
              onChange={handleChange}
              required
            />
            <label>Confirm Password</label>
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button className="auth-btn" disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;