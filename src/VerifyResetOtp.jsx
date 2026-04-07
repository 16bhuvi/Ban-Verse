import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

import config from "./config";

const VerifyResetOtp = () => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const verifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(
        `${config.API_BASE_URL}/api/auth/verify-reset-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: localStorage.getItem("resetEmail"),
            otp: otp,
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        alert("✅ OTP verified");
        localStorage.setItem("otpVerified", "true");
        localStorage.setItem("resetOtp", otp);
        navigate("/ResetPassword");
      } else {
        alert(data.error || "Invalid OTP");
      }
    } catch {
      alert("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>Verify OTP</h2>

        <form onSubmit={verifyOtp}>
          <input
            type="text"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
          />

          <button className="btn" disabled={loading}>
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default VerifyResetOtp;