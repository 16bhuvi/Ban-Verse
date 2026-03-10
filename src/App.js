import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Welcome from "./Welcome";
import Home from "./Home";
import VerifyOtp from "./VerifyOtp";
import Signup from "./Signup";
import Login from "./Login";
import ClubDashboard from "./ClubDashboard";
import ClubProfile from "./ClubProfile";
import StudentDashboard from "./StudentDashboard";
import StudentProfile from "./StudentProfile";
import AdminDashboard from "./AdminDashboard";
import AdminProfile from "./AdminProfile";
import About from "./About";
import Contact from "./Contact";
import ViewPost from "./ViewPost";
import ViewClub from "./ViewClub";
import CreatePost from "./CreatePost";
import ForgetPassword from "./ForgetPassword";
import ResetPassword from "./ResetPassword";
import VerifyResetOtp from "./VerifyResetOtp";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem("user"));
  return user ? children : <Navigate to="/login" />;
};

const RoleRoute = ({ children, roles }) => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return <Navigate to="/login" />;
  if (!roles.includes(user.globalRole)) return <Navigate to="/home" />;
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/home" element={<Home />} />
        <Route path="/VerifyOtp" element={<VerifyOtp />} />

        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />

        <Route path="/clubdashboard" element={<ProtectedRoute><ClubDashboard /></ProtectedRoute>} />
        <Route path="/club/:clubId/dashboard" element={<ProtectedRoute><ClubDashboard /></ProtectedRoute>} />
        <Route path="/clubprofile" element={<ProtectedRoute><ClubProfile /></ProtectedRoute>} />
        <Route path="/createpost" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
        <Route path="/studentdashboard" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
        <Route path="/studentprofile" element={<ProtectedRoute><StudentProfile /></ProtectedRoute>} />
        <Route path="/viewpost" element={<ProtectedRoute><ViewPost /></ProtectedRoute>} />
        <Route path="/viewclub" element={<ProtectedRoute><ViewClub /></ProtectedRoute>} />
        <Route path="/admindashboard" element={<RoleRoute roles={['admin']}><AdminDashboard /></RoleRoute>} />
        <Route path="/adminprofile" element={<RoleRoute roles={['admin']}><AdminProfile /></RoleRoute>} />
        <Route path="/forgot" element={<ForgetPassword />} />
        <Route path="/ResetPassword" element={<ResetPassword />} />
        <Route path="/verify-reset-otp" element={<VerifyResetOtp />} />
      </Routes>
    </Router>
  );
}

export default App;