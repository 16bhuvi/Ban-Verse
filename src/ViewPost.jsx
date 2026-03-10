import { useNavigate } from "react-router-dom";
import "./viewPost.css";
import logo from "./banasthali-logo.jpg";

export default function ViewPost() {
  const navigate = useNavigate();
  const index = localStorage.getItem("viewPostIndex");
  const posts = JSON.parse(localStorage.getItem("posts")) || [];
  const post = posts[index];

  if (!post) return null;

  return (
    <>
      <header className="header">
        <div className="header-left">
          <img src={logo} alt="logo" />
          <span>Banverse</span>
        </div>
        <button onClick={() => navigate("/home")}>Home</button>
      </header>

      <main className="post-view-container">
        <div className="post-card">
          <h2>{post.title}</h2>
          <p className="club" onClick={() => {
            localStorage.setItem("viewClubId", post.clubId);
            navigate("/view-club");
          }}>
            By {post.clubName}
          </p>
          <img src={post.poster} alt="" />
          <p>{post.desc}</p>
          <p><strong>Date:</strong> {post.date}</p>
          <p><strong>Time:</strong> {post.time}</p>
          <p><strong>Venue:</strong> {post.venue}</p>
          <a href={post.regLink} target="_blank" rel="noreferrer">Register</a>
        </div>
      </main>
    </>
  );
}