import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './DailyTips.css';
// --- Firebase Imports ---
import { db } from '../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

const DailyTips = () => {
  const navigate = useNavigate();
  const [currentTip, setCurrentTip] = useState(0);
  
  // --- State for tips and loading ---
  const [allTips, setAllTips] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Fetch tips from Firestore ---
  useEffect(() => {
    const fetchTips = async () => {
      setLoading(true);
      try {
        // Create a query to get all tips, ordered by the 'order' field
        const tipsCollectionRef = collection(db, 'dailyTips');
        const q = query(tipsCollectionRef, orderBy('order', 'asc'));
        
        const querySnapshot = await getDocs(q);
        const tipsData = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id // Add the document ID
        }));
        
        setAllTips(tipsData);
      } catch (err) {
        console.error("Error fetching tips: ", err);
      }
      setLoading(false);
    };

    fetchTips();
  }, []); // Empty dependency array means this runs once on load

  const handlePrevious = () => {
    setCurrentTip((prev) => (prev > 0 ? prev - 1 : allTips.length - 1));
  };

  const handleNext = () => {
    setCurrentTip((prev) => (prev < allTips.length - 1 ? prev + 1 : 0));
  };

  // --- Show loading state ---
  if (loading) {
    return (
      <div className="daily-tips">
        <h1 style={{ textAlign: 'center' }}>Loading Tips...</h1>
      </div>
    );
  }

  // --- Show if no tips are found ---
  if (!loading && allTips.length === 0) {
    return (
      <div className="daily-tips">
        <h1 style={{ textAlign: 'center' }}>No tips found.</h1>
        <p style={{ textAlign: 'center' }}>Go to your Firebase Console to add documents to the 'dailyTips' collection.</p>
      </div>
    );
  }

  // --- Render tips once loaded ---
  return (
    <div className="daily-tips">
      <div className="tips-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
        <h1 className="tips-title">Daily Interview Tips</h1>
        <p className="tips-subtitle">Learn something new every day to ace your interviews</p>
      </div>

      <div className="tips-container">
        {/* Featured Tip - now uses data from Firestore */}
        <div className="featured-tip">
          <div className="tip-badge">
            <div className="badge-icon">🎯</div>
            <div className="badge-info">
              <div className="badge-category">{allTips[currentTip].category.toUpperCase()}</div>
              <div className="badge-number">Tip {currentTip + 1} of {allTips.length}</div>
            </div>
          </div>

          <h2 className="tip-heading">{allTips[currentTip].title}</h2>
          <p className="tip-content">{allTips[currentTip].description}</p>

          <div className="tip-navigation">
            <button className="nav-button nav-previous" onClick={handlePrevious}>
              ← Previous
            </button>
            <button className="nav-button nav-next" onClick={handleNext}>
              Next Tip →
            </button>
          </div>
        </div>

        {/* All Tips Section - now uses data from Firestore */}
        <div className="all-tips-section">
          <h3 className="section-title">All Tips</h3>
          <div className="tips-list">
            {allTips.map((tip) => (
              <div key={tip.id} className="tip-card">
                <div className="tip-card-header">
                  <h4 className="tip-card-title">{tip.title}</h4>
                  <span className="tip-card-badge">{tip.category}</span>
                </div>
                <p className="tip-card-description">{tip.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyTips;
