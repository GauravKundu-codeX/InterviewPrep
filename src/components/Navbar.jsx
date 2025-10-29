import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

// --- Accept props from App.jsx ---
const Navbar = ({ isLoggedIn, onSignOut }) => {
  const navigate = useNavigate();

  // --- Handle sign-out logic ---
  const handleSignOutClick = () => {
    onSignOut();  // Call the sign-out function from App.js
    navigate('/'); // Redirect to home after sign out
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <div className="logo-icon">🧠</div>
          <span>InterviewPrep</span>
        </Link>
        
        <ul className="navbar-menu">
          <li><Link to="/" className="navbar-link">HOME</Link></li>
          <li><Link to="/daily-tips" className="navbar-link">DAILY TIPS</Link></li>
          <li><Link to="/dsa" className="navbar-link">DSA</Link></li>
          <li><Link to="/hr" className="navbar-link">HR</Link></li>
          <li><Link to="/mock" className="navbar-link">MOCK</Link></li>
          <li><Link to="/resources" className="navbar-link">RESOURCES</Link></li>
        </ul>

        {/* --- Dynamic Auth Buttons --- */}
        <div className="navbar-auth">
          {isLoggedIn ? (
            // If user is logged in:
            <button className="btn-signout" onClick={handleSignOutClick}>
              Sign Out
            </button>
          ) : (
            // If user is logged out:
            <>
              <button className="btn-signin" onClick={() => navigate('/signin')}>Sign In</button>
              <button className="btn-signup" onClick={() => navigate('/signup')}>Sign Up</button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
