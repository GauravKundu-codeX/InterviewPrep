import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// --- Firebase Imports ---
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// --- Page & Component Imports ---
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import DailyTips from './pages/DailyTips.jsx';
import DSA from './pages/DSA.jsx';
import HR from './pages/HR.jsx';
import MockInterview from './pages/MockInterview.jsx';
import Resources from './pages/Resources.jsx';
import SignIn from './pages/SignIn.jsx';
import SignUp from './pages/SignUp.jsx';
import './App.css';

function App() {
  // --- State to track user and loading ---
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- Listener for auth changes ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // This 'user' object is either the logged-in user or null
      setCurrentUser(user);
      setLoading(false); // Done checking
    });

    // Cleanup function: unsubscribe when the component unmounts
    return () => unsubscribe();
  }, []); // Empty dependency array means this runs only once on app load

  // --- Sign Out Function ---
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // The onAuthStateChanged listener will automatically update state
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  // --- Show loading screen while Firebase is checking ---
  if (loading) {
    return (
      <div className="app-loading">
        <h1>Loading...</h1>
        {/* You can replace this with a real spinner component */}
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        {/* --- Pass user status and sign out function to Navbar --- */}
        <Navbar isLoggedIn={!!currentUser} onSignOut={handleSignOut} />
        
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/daily-tips" element={<DailyTips />} />
          <Route path="/dsa" element={<DSA />} />
          <Route path="/hr" element={<HR />} />
          <Route path="/mock" element={<MockInterview />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
