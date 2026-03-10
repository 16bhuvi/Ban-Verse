import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./admin.css";
import logo from "./banasthali-logo.jpg";

function AdminProfile() {
  const [admin, setAdmin] = useState({ name: "", email: "" });
  const navigate = useNavigate();

  useEffect(() => {
    setAdmin(
      JSON.parse(localStorage.getItem("admin")) || {
        name: "Admin",
        email: "admin@banverse.com",
      }
    );
  }, []);

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const getInitials = (name) =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <>
      {/* HEADER */}
      <header className="header">
        <div className="header-left">
          <div className="logo-circle">
            <img src={logo} alt="logo" />
          </div>
          <span className="brand-name">Banverse Admin</span>
        </div>

        {/* LOGOUT BUTTON */}
        <div className="header-nav">
          <button className="logout-btn" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {/* PROFILE */}
      <main className="profile">
        <h2>👤 Admin Profile</h2>

        <div className="profile-avatar">{getInitials(admin.name)}</div>

        <div className="profile-card">
          <div className="profile-field">
            <label>Name</label>
            <input value={admin.name} readOnly />
          </div>

          <div className="profile-field">
            <label>Email</label>
            <input value={admin.email} readOnly />
          </div>

          <div className="profile-field">
            <label>Role</label>
            <input value="Administrator" readOnly />
          </div>
        </div>

        {/* SAVE PROFILE → REDIRECT TO DASHBOARD */}
        <button onClick={() => navigate("/admindashboard")}>
          Save Profile
        </button>
      </main>
    </>
  );
}

export default AdminProfile;