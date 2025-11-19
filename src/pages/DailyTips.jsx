import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './DailyTips.css';
// --- Firebase Imports ---
import { db } from '../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
// --- Framer Motion Imports ---
import { motion, AnimatePresence } from 'framer-motion';

const DailyTips = () => {
  const navigate = useNavigate();
  const [currentTip, setCurrentTip] = useState(0);
  const [allTips, setAllTips] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Default tips array ---
  const defaultTips = [
    { id: 'tip-1', title: 'Research the Company Thoroughly', description: '...', category: 'Preparation' },
    { id: 'tip-2', title: 'Practice the STAR Method', description: '...', category: 'Technique' },
    // (Aapke baaki default tips yahan hain...)
    { id: 'tip-10', title: 'Follow Up After the Interview', description: '...', category: 'Follow-up' }
  ];

  // --- Fetch tips from Firestore ---
  useEffect(() => {
    const fetchTips = async () => {
      setLoading(true);
      try {
        const tipsCollectionRef = collection(db, 'dailyTips');
        // --- FIX: Ensure 'order' field name matches Firebase ---
        // (Humne pehle discuss kiya tha, Firebase mein 'order' (chhota o) hona chahiye)
        const q = query(tipsCollectionRef, orderBy('order', 'asc')); 
        const querySnapshot = await getDocs(q);
        const tipsData = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        }));
        
        // Agar Firebase se tips mile toh woh use karo, varna default waale
        if (tipsData.length > 0) {
          setAllTips(tipsData);
        } else {
          // Fallback agar Firebase khaali hai, lekin 'order' nahi hai
          // Isliye defaultTips ko bhi set kar rahe hain
          console.warn("No tips found in Firebase, using default tips.");
          setAllTips(defaultTips);
        }
      } catch (err) {
        console.error("Error fetching tips: ", err);
        // Agar fetch fail ho (jaise 'order' field na mile), toh default tips dikhao
        console.warn("Using default tips due to fetch error.");
        setAllTips(defaultTips);
      }
      setLoading(false);
    };
    fetchTips();
  }, []); // Empty dependency array, runs once

  const handlePrevious = () => {
    setCurrentTip((prev) => (prev > 0 ? prev - 1 : allTips.length - 1));
  };

  const handleNext = () => {
    setCurrentTip((prev) => (prev < allTips.length - 1 ? prev + 1 : 0));
  };
  
  const handleCardClick = (index) => {
    setCurrentTip(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const truncateDescription = (text, maxLength) => {
    if (!text) return ''; // Guard clause for undefined description
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // --- Animation Variants ---
  const featuredTipVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  const listContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
  };

  const tipCardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
  };

  // --- Loading State ---
  if (loading) {
    return (
      <div className="daily-tips">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading Interview Tips...</p>
        </div>
      </div>
    );
  }

  // --- No Tips Found State ---
  // (Yeh tabhi dikhega jab fetch bhi fail ho aur defaultTips bhi na ho)
  if (!loading && allTips.length === 0) {
    return (
      <div className="daily-tips">
        <div className="empty-state">
          <h1>No tips available yet</h1>
          <p>Add tips to your Firebase 'dailyTips' collection to get started</p>
        </div>
      </div>
    );
  }
  
  // --- Render Main Component ---
  // Added a check for allTips[currentTip] to prevent crash
  const currentTipData = allTips[currentTip];
  if (!currentTipData) {
    // This can happen briefly if firebase data is bad
    return (
        <div className="daily-tips">
          <div className="loading-container">
            <p>Error loading tip data. Refreshing...</p>
            {/* You might want to auto-refresh or reset state here */}
          </div>
        </div>
    );
  }


  return (
    <motion.div 
      className="daily-tips"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* --- FIX: Top waala progress bar humne YAHAN SE HATA DIYA ---
        (Original .progress-container yahan tha)
      */}

      {/* Header Section */}
      <div className="tips-header">
        <div className="header-content">
          <motion.h1 
            className="tips-title"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            Interview Mastery
          </motion.h1>
          <motion.p 
            className="tips-subtitle"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Daily insights to help you ace every interview
          </motion.p>
        </div>
      </div>

      <div className="tips-container">
        
        {/* Featured Tip Section */}
        <AnimatePresence mode="wait"> 
          <motion.div
            key={currentTip}
            className="featured-tip-wrapper"
            variants={featuredTipVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.35 }}
          >
            <div className="featured-tip">
              {/* Tip Badge */}
              <div className="tip-badge">
                <motion.div 
                  className="badge-icon"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 3 }}
                >
                  🎯
                </motion.div>
                <div className="badge-info">
                  <span className="badge-category">
                    {currentTipData.category?.toUpperCase() || 'GENERAL'}
                  </span>
                  <span className="badge-number">
                    Tip {currentTip + 1} of {allTips.length}
                  </span>
                </div>
              </div>

              {/* Tip Content */}
              <h2 className="tip-heading">{currentTipData.title}</h2>
              
              {/* --- FIX: Ab yeh divider progress bar hai ---
                Iski width 'currentTip' state ke hisaab se update hogi
              */}
              <div 
                className="tip-divider"
                style={{
                  width: `${((currentTip + 1) / allTips.length) * 100}%`,
                  transition: 'width 0.4s ease-out' // Taaki 'grow' effect smooth ho
                }}
              ></div>

              <p className="tip-content">
                {currentTipData.description}
              </p>

              {/* Navigation Buttons */}
              <div className="tip-navigation">
                <motion.button 
                  className="nav-button nav-previous" 
                  onClick={handlePrevious}
                  whileHover={{ scale: 1.02, x: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  <span>←</span> Previous
                </motion.button>
                <motion.button 
                  className="nav-button nav-next" 
                  onClick={handleNext}
                  whileHover={{ scale: 1.02, x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  Next <span>→</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* All Tips Section */}
        <div className="all-tips-section">
          <h3 className="section-title">All Tips</h3>
          <p className="section-subtitle">Explore all interview preparation tips</p>
          
          <motion.div 
            className="tips-list"
            variants={listContainerVariants}
            initial="hidden"
            animate="visible"
          >
            {allTips.map((tip, index) => (
              <motion.div
                key={tip.id}
                className={`tip-card ${index === currentTip ? 'active' : ''}`}
                onClick={() => handleCardClick(index)}
                variants={tipCardVariants}
                whileHover={{ scale: 1.02, y: -8 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <div className="card-content">
                  <div className="card-header">
                    <h4 className="tip-card-title">{tip.title}</h4>
                    <span className="tip-card-badge">{tip.category || 'General'}</span>
                  </div>
                  <p className="tip-card-description">
                    {truncateDescription(tip.description, 110)}
                  </p>
                </div>
                <div className="card-indicator"></div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default DailyTips;