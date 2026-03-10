import React from "react";
import { useNavigate } from "react-router-dom";
import "./About.css";
import logo from "./banasthali-logo.jpg";

const About = () => {
  const navigate = useNavigate();

  const goToDashboard = () => {
    const role = localStorage.getItem("role");

    if (role === "student") navigate("/studentdashboard");
    else if (role === "club") navigate("/clubdashboard");
    else if (role === "admin") navigate("/admindashboard");
    else navigate("/login");
  };

  return (
    <>
      {/* ===== HEADER ===== */}
      <header className="header">
        <div className="header-left" onClick={() => navigate("/home")}>
          <div className="logo-circle">
            <img src={logo} alt="Banverse" />
          </div>
          <span className="brand-name">Banverse</span>
        </div>

        <nav className="nav-menu">
          <button className="nav-item" onClick={() => navigate("/home")}>Home</button>
          <button className="nav-item active">About</button>
          <button className="nav-item" onClick={() => navigate("/contact")}>Contact</button>
          <button className="nav-item" onClick={goToDashboard}>Dashboard</button>
        </nav>

        <div className="header-right">
          <div className="dashboard-circle" onClick={goToDashboard}>👤</div>
        </div>
      </header>

      {/* ===== ABOUT CONTENT ===== */}
      <main className="about-container">
        <section className="about-card">
          <h2>About the University</h2>
          <p>
            Our university is a vibrant academic community that promotes
            innovation, leadership, and holistic development.
          </p>
          <p>
            With a strong focus on skill development, research, and
            extracurricular engagement, students are encouraged to grow
            beyond classrooms.
          </p>
        </section>

        <section className="about-card">
          <h2>About Banverse</h2>
          <p>
            Banverse is a centralized university event management platform
            designed to connect students, clubs, and administrators.
          </p>
          <p>
            Students can discover events while clubs manage participation
            and announcements easily.
          </p>
          <p>
            Banverse enhances campus engagement by bringing everything into
            one platform.
          </p>
        </section>
      </main>
    </>
  );
};

export default About;