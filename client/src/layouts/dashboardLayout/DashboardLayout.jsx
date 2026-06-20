import { Outlet, useNavigate, useLocation } from "react-router-dom";
import "./dashboardLayout.css";
import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import ChatList from "../../components/chatList/ChatList";

const DashboardLayout = () => {
  const { userId, isLoaded } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (isLoaded && !userId) {
      navigate("/sign-in");
    }
  }, [isLoaded, userId, navigate]);

  // Auto-close menu when navigating (recent chats clicks)
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  if (!isLoaded) return "Loading...";

  return (
    <div className={`dashboardLayout ${isMenuOpen ? "menuOpen" : ""}`}>
      {/* Backdrop overlay */}
      {isMenuOpen && (
        <div
          className="menuBackdrop"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <div className="menu">
        <button
          className="closeMenuBtn"
          onClick={() => setIsMenuOpen(false)}
          aria-label="Close menu"
        >
          ✕
        </button>
        <ChatList />
      </div>

      <div className="content">
        {/* Toggle Button for mobile/tablet */}
        <button
          className="toggleMenuBtn"
          onClick={() => setIsMenuOpen(true)}
          aria-label="Open menu"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>
        <Outlet />
      </div>
    </div>
  );
};

export default DashboardLayout;
