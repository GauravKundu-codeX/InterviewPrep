import React, { useState, useEffect } from 'react';
import './DSA.css';
// --- Firebase Imports ---
import { db } from '../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

const DSA = () => {
  const [expandedSection, setExpandedSection] = useState(null);
  const [expandedProblem, setExpandedProblem] = useState(null);
  const [dsaTopics, setDsaTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchTopicsAndProblems = async () => {
      setLoading(true);
      try {
        const topicsQuery = query(collection(db, 'dsaTopics'), orderBy('order'));
        const topicsSnapshot = await getDocs(topicsQuery);
        
        const topicsWithProblems = topicsSnapshot.docs.map(async (topicDoc) => {
          const topicData = topicDoc.data();
          const problemsQuery = query(collection(db, 'dsaTopics', topicDoc.id, 'problems'));
          const problemsSnapshot = await getDocs(problemsQuery);
          
          const problemsData = problemsSnapshot.docs.map(problemDoc => ({
            ...problemDoc.data(),
            id: problemDoc.id,
            companies: problemDoc.data().tags || [], 
          }));

          return {
            ...topicData,
            id: topicDoc.id,
            problems: problemsData,
          };
        });

        const allData = await Promise.all(topicsWithProblems);
        setDsaTopics(allData);
      } catch (err) {
        console.error("Error fetching DSA data: ", err);
      }
      setLoading(false);
    };

    fetchTopicsAndProblems();
  }, []);

  const toggleSection = (topicId) => {
    setExpandedSection(expandedSection === topicId ? null : topicId);
    setExpandedProblem(null);
    const index = dsaTopics.findIndex(t => t.id === topicId);
    if (index !== -1) setCurrentIndex(index);
  };

  const toggleProblem = (problemId) => {
    setExpandedProblem(expandedProblem === problemId ? null : problemId);
  };

  const getDifficultyClass = (difficulty) => {
    switch(difficulty) {
      case 'Easy': return 'difficulty-easy';
      case 'Medium': return 'difficulty-medium';
      case 'Hard': return 'difficulty-hard';
      default: return '';
    }
  };

  const totalTopics = dsaTopics.length;
  const progressPercentage = totalTopics > 0 ? (currentIndex + 1) / totalTopics * 100 : 0;

  // --- NEW: Redirection Handler ---
  const handleSolveProblem = (url) => {
      if (url) {
          window.open(url, '_blank', 'noopener,noreferrer');
      } else {
          alert('LeetCode URL not available for this problem yet!');
      }
  };


  if (loading) {
    return (
      <div className="dsa-page">
        <h1 style={{ textAlign: 'center', marginTop: '4rem' }}>Loading DSA Problems...</h1>
      </div>
    );
  }

  return (
    <div className="dsa-page">
      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${progressPercentage}%` }}></div>
        {/* Removed unused back button div here */}
      </div>

      <div className="dsa-header">
        <div className="header-content">
          <h1 className="dsa-title">Master DSA Concepts</h1>
          <p className="dsa-subtitle">Master data structures and algorithms with curated problems from top companies</p>
          <div className="header-stats">
            <div className="stat-item">
              <span className="stat-number">{dsaTopics.length}</span>
              <span className="stat-label">Topics</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{dsaTopics.reduce((sum, topic) => sum + (topic.problems?.length || 0), 0)}</span>
              <span className="stat-label">Problems</span>
            </div>
          </div>
        </div>
      </div>

      <div className="dsa-container">
        {dsaTopics.map((topic, index) => (
          <div key={topic.id} className="topic-section">
            <div 
              className={`topic-header ${expandedSection === topic.id ? 'active' : ''}`}
              onClick={() => toggleSection(topic.id)}
            >
              <div className="topic-icon">
                <span className="topic-number">{index + 1}</span>
              </div>
              <div className="topic-info">
                <h2 className="topic-title">{topic.name}</h2>
                <p className="topic-description">{topic.description}</p>
              </div>
              <div className={`expand-icon ${expandedSection === topic.id ? 'rotated' : ''}`}>
                ▼
              </div>
            </div>

            {expandedSection === topic.id && (
              <div className="problems-list">
                {topic.problems.map((problem, problemIndex) => (
                  <div key={problem.id} className="problem-card" style={{ animationDelay: `${problemIndex * 0.05}s` }}>
                    <div 
                      className={`problem-header ${expandedProblem === problem.id ? 'active' : ''}`}
                      onClick={() => toggleProblem(problem.id)}
                    >
                      <div className="problem-main">
                        <h3 className="problem-title">{problem.title}</h3>
                        <p className="problem-description">{problem.description}</p>
                        <div className="problem-meta">
                          <span className={`difficulty-badge ${getDifficultyClass(problem.difficulty)}`}>
                            {problem.difficulty}
                          </span>
                          {problem.companies.map((company, idx) => (
                            <span key={idx} className="company-badge">{company}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {expandedProblem === problem.id && (
                      <div className="problem-details">
                        {problem.input && (
                          <div className="code-example">
                            <div className="code-label">Input:</div>
                            <div className="code-value">{problem.input}</div>
                          </div>
                        )}
                        {problem.output && (
                          <div className="code-example">
                            <div className="code-label">Output:</div>
                            <div className="code-value">{problem.output}</div>
                          </div>
                        )}
                        <div className="problem-actions">
                          <a 
                            className="action-button solve-button"
                            href={problem.leetCodeUrl} // Use the new link from Firestore
                            target="_blank" // Open in new tab
                            rel="noopener noreferrer"
                          >
                            ✏️ Solve Problem
                          </a>
                          <button className="action-button discuss-button">
                            💬 Discuss
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DSA;