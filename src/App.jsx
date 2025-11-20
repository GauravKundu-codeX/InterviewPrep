import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

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
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  if (loading) {
    return (
      <div className="app-loading">
        <h1>Loading...</h1>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
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