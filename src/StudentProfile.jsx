import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./StudentProfile.css";
import logo from "./banasthali-logo.jpg";

const StudentProfile = () => {
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    name: "",
    course: "",
    department: "",
    studentId: "",
    image: "",
    resume: ""
  });

  useEffect(() => {
    setProfile({
      name: localStorage.getItem("studentName") || "",
      course: localStorage.getItem("studentCourse") || "",
      department: localStorage.getItem("studentDepartment") || "",
      studentId: localStorage.getItem("studentId") || "",
      image: localStorage.getItem("studentProfileImage") || "",
      resume: localStorage.getItem("studentResume") || ""
    });
  }, []);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const uploadImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      localStorage.setItem("studentProfileImage", reader.result);
      setProfile({ ...profile, image: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const deleteImage = () => {
    if (window.confirm("Delete profile photo?")) {
      localStorage.removeItem("studentProfileImage");
      setProfile({ ...profile, image: "" });
    }
  };

  const uploadResume = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      localStorage.setItem("studentResume", reader.result);
      setProfile({ ...profile, resume: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = () => {
    localStorage.setItem("studentName", profile.name);
    localStorage.setItem("studentCourse", profile.course);
    localStorage.setItem("studentDepartment", profile.department);
    localStorage.setItem("studentId", profile.studentId);
    alert("Profile updated successfully!");
    navigate("/studentdashboard");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* HEADER */}
      <header className="header">
        <div className="header-left" onClick={() => navigate("/home")}>
          <div className="logo-circle">
            <img src={logo} alt="Banverse Logo" />
          </div>
          <span className="brand-name">Banverse</span>
        </div>
      </header>

      {/* PROFILE */}
      <main className="profile-wrapper">
        <div className="profile-card glass">
          <h2>Edit Student Profile</h2>
          <p className="subtitle">Keep your academic profile up to date</p>

          {/* Avatar */}
          <div className="avatar-section">
            <label className="avatar-upload">
              <input type="file" accept="image/*" onChange={uploadImage} />
              <img
                src={
                  profile.image ||
                  "https://cdn-icons-png.flaticon.com/512/847/847969.png"
                }
                alt="Profile"
              />
              <span className="edit-overlay">Edit</span>
            </label>

            {profile.image && (
              <button className="delete-photo-btn" onClick={deleteImage}>
                Delete Photo
              </button>
            )}
          </div>

          {/* Form */}
          <div className="form-grid">
            <div className="form-group">
              <label>Full Name</label>
              <input
                name="name"
                value={profile.name}
                onChange={handleChange}
                placeholder="Enter your name"
              />
            </div>

            <div className="form-group">
              <label>Course</label>
              <input
                name="course"
                value={profile.course}
                onChange={handleChange}
                placeholder="B.Tech / MBA"
              />
            </div>

            <div className="form-group">
              <label>Department</label>
              <input
                name="department"
                value={profile.department}
                onChange={handleChange}
                placeholder="Computer Science"
              />
            </div>

            <div className="form-group">
              <label>Student ID</label>
              <input
                name="studentId"
                value={profile.studentId}
                onChange={handleChange}
                placeholder="BTBTI12345"
              />
            </div>
          </div>

          {/* Resume */}
          <div className="resume-section">
            <label className="resume-upload">
              Upload Resume (PDF)
              <input type="file" accept="application/pdf" onChange={uploadResume} />
            </label>
            {profile.resume && <span className="resume-ok">Resume uploaded ✓</span>}
          </div>

          <button className="save-btn" onClick={saveProfile}>
            Save Changes
          </button>
        </div>
      </main>
    </div>
  );
};

export default StudentProfile;