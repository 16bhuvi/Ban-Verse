import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Auth.css";
import logo from "./banasthali-logo.jpg";

const ForgetPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:5001/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("resetEmail", email);
        navigate("/verify-reset-otp");
      } else {
        setError(data.error || "User not found.");
      }
    } catch {
      setError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <img src={logo} alt="Logo" className="auth-logo" />
        <h2>Recover Password</h2>
        <p className="subtitle">Enter your email to receive a 6-digit OTP</p>

        <form className="auth-form" onSubmit={sendOtp}>
          <div className="input-group">
            <input
              type="email"
              placeholder=" "
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label>Registered Email</label>
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button className="auth-btn" disabled={loading}>
            {loading ? "Sending Code..." : "Send Verification OTP"}
          </button>
        </form>

        <div className="auth-footer">
          Remember your password? <Link to="/login">Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgetPassword;