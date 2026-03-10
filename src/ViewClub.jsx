import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./viewClub.css";
import logo from "./banasthali-logo.jpg";

export default function ViewClub() {
  const navigate = useNavigate();
  const [club, setClub] = useState(null);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const id = localStorage.getItem("viewClubId");
    const clubs = JSON.parse(localStorage.getItem("clubs")) || [];
    setClub(clubs.find(c => c.id === id));

    const allPosts = JSON.parse(localStorage.getItem("posts")) || [];
    setPosts(allPosts.filter(p => p.clubId === id));
  }, []);

  if (!club) return null;

  return (
    <>
      <header className="header">
        <img src={logo} alt="logo" />
        <button onClick={() => navigate("/home")}>Home</button>
      </header>

      <main className="club-container">
        <div className="club-card">
          <img src={club.logo} alt="" />
          <h2>{club.name}</h2>
          <p>{club.description}</p>
        </div>

        <h3>Related Posts</h3>
        <div className="related-posts">
          {posts.map((p, i) => (
            <div key={i} onClick={() => {
              localStorage.setItem("viewPostIndex", i);
              navigate("/view-post");
            }}>
              <h4>{p.title}</h4>
              <img src={p.poster} alt="" />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}