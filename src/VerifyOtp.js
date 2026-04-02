import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css';
import logo from './banasthali-logo.jpg';

const VerifyOtp = () => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const email = localStorage.getItem("verifyEmail") || localStorage.getItem("loginEmail");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5001/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);

        let role = data.user.globalRole;
        if (data.user.isClubLeader) role = "club";
        localStorage.setItem("role", role);

        if (data.user.globalRole === "admin") {
          navigate("/admindashboard");
        } else if (data.user.isClubLeader) {
          navigate("/clubdashboard");
        } else {
          navigate("/studentdashboard");
        }
      } else {
        setError(data.error || "Verification failed.");
      }
    } catch (err) {
      setError("Server connection failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    const resendEmail = localStorage.getItem("verifyEmail") || email;
    if (!resendEmail) return setError("User email not found. Please register again.");

    try {
      const response = await fetch("http://localhost:5001/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail })
      });

      const data = await response.json();
      if (response.ok) {
        alert("A new 6-digit code has been sent to your email!");
      } else {
        setError(data.error || "Resend failed.");
      }
    } catch (err) {
      setError("Network error. Could not resend code.");
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <img src={logo} alt="Logo" className="auth-logo" />
        <h2>Verify Account</h2>
        <p className="subtitle">We've sent a 6-digit OTP to <b>{email}</b></p>
 
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="text"
              name="otp"
              placeholder=" "
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              maxLength="6"
              style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '1.5rem' }}
            />
            <label style={{ left: '50%', transform: 'translateX(-50%)' }}>6-Digit Code</label>
          </div>
 
          {error && <p className="error-msg" style={{ textAlign: 'center' }}>{error}</p>}
 
          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Confirm & Activate"}
          </button>
        </form>
 
        <div className="auth-footer">
          Didn't receive the code? <span onClick={handleResend} style={{ color: '#6366f1', cursor: 'pointer', fontWeight: '700' }}>Resend</span>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;