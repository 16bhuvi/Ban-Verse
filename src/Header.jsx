import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

export default function Header({ rightIcon, onRightClick }) {
  const navigate = useNavigate();

  return (
    <header className="header">
      <div className="header-left" onClick={() => navigate("/")}>
        <div className="logo-circle">
          <img src={logo} alt="Banverse Logo" />
        </div>
        <span className="brand-name">Banverse</span>
      </div>

      <div className="dashboard-circle" onClick={onRightClick}>
        {rightIcon}
      </div>
    </header>
  );
}