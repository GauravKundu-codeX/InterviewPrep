import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SignIn.css';
// --- Firebase Imports ---
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

const SignIn = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '', // Changed from emailOrUsername
    password: ''
  });
  // --- State for Firebase errors ---
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // --- Updated handleSubmit for Firebase ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors

    try {
      // 1. Sign in the user with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      console.log('User signed in:', userCredential.user);

      // 2. Redirect to home page on success
      navigate('/');

    } catch (err) {
      // Handle errors from Firebase
      console.error(err);
      setError(err.message); // Shows "auth/wrong-password", "auth/user-not-found" etc.
    }
  };

  return (
    <div className="signin-page">
      <div className="signin-container">
        <div className="signin-card">
          <div className="auth-header">
            <h1 className="auth-title">Welcome Back</h1>
            <p className="auth-subtitle">Sign in to continue your interview preparation</p>
          </div>

          {/* --- Display Firebase Errors Here --- */}
          {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email</label> {/* Updated Label */}
              <input
                type="email" // Updated type
                name="email"   // Updated name
                value={formData.email} // Updated value
                onChange={handleChange}
                className="form-input"
                placeholder="Enter your email" // Updated placeholder
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter your password"
                required
              />
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input type="checkbox" className="checkbox-input" />
                <span>Remember me</span>
              </label>
              <a href="#" className="forgot-link">Forgot password?</a>
            </div>

            <button type="submit" className="submit-button">
              Sign In
            </button>
          </form>

          <div className="auth-footer">
            <p>Don't have an account? <button onClick={() => navigate('/signup')} className="link-button">Sign Up</button></p>
          </div>
        </div>

        <div className="auth-decoration">
          <div className="decoration-circle circle-1"></div>
          <div className="decoration-circle circle-2"></div>
          <div className="decoration-circle circle-3"></div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
