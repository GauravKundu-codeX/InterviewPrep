import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './DSA.css';
// --- Firebase Imports ---
import { db } from '../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

const DSA = () => {
  const navigate = useNavigate();
  // --- Updated state to hold string IDs, not number indexes ---
  const [expandedSection, setExpandedSection] = useState(null);
  const [expandedProblem, setExpandedProblem] = useState(null);

  // --- State for data and loading ---
  const [dsaTopics, setDsaTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Data Fetching Effect ---
  useEffect(() => {
    const fetchTopicsAndProblems = async () => {
      setLoading(true);
      try {
        // 1. Fetch all topics
        const topicsQuery = query(collection(db, 'dsaTopics'), orderBy('order'));
        const topicsSnapshot = await getDocs(topicsQuery);
        
        // 2. Create an array of promises for each topic's problems
        const topicsWithProblems = topicsSnapshot.docs.map(async (topicDoc) => {
          const topicData = topicDoc.data();
          
          // 3. Fetch the 'problems' subcollection for this topic
          const problemsQuery = query(collection(db, 'dsaTopics', topicDoc.id, 'problems'));
          const problemsSnapshot = await getDocs(problemsQuery);
          
          const problemsData = problemsSnapshot.docs.map(problemDoc => ({
            ...problemDoc.data(),
            id: problemDoc.id,
            // Map 'tags' from DB to 'companies' to match your JSX
            companies: problemDoc.data().tags || [], 
          }));

          return {
            ...topicData,
            id: topicDoc.id,
            problems: problemsData,
          };
        });

        // 4. Wait for all fetches to complete
        const allData = await Promise.all(topicsWithProblems);
        setDsaTopics(allData);

      } catch (err) {
        console.error("Error fetching DSA data: ", err);
      }
      setLoading(false);
    };

    fetchTopicsAndProblems();
  }, []); // Runs once on component load

  // --- Updated toggle functions to use IDs ---
  const toggleSection = (topicId) => {
    setExpandedSection(expandedSection === topicId ? null : topicId);
    setExpandedProblem(null); // Close any open problem
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

  // --- Loading State ---
  if (loading) {
    return (
      <div className="dsa-page">
        <h1 style={{ textAlign: 'center' }}>Loading DSA Problems...</h1>
      </div>
    );
  }

  return (
    <div className="dsa-page">
      <div className="dsa-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
        <h1 className="dsa-title">Practice DSA Problems</h1>
        <p className="dsa-subtitle">Master data structures and algorithms with topic-wise problems from top companies</p>
      </div>

      <div className="dsa-container">
        {/* --- Render dynamic topics --- */}
        {dsaTopics.map((topic) => (
          <div key={topic.id} className="topic-section">
            <div 
              className="topic-header"
              // --- Use topic.id ---
              onClick={() => toggleSection(topic.id)}
            >
              <div>
                <h2 className="topic-title">{topic.name}</h2> {/* Use 'name' from DB */}
                <p className="topic-description">{topic.description}</p>
              </div>
              <div className="expand-icon">
                {/* --- Use topic.id --- */}
                {expandedSection === topic.id ? '▲' : '▼'}
              </div>
            </div>

            {/* --- Use topic.id --- */}
            {expandedSection === topic.id && (
              <div className="problems-list">
                {topic.problems.map((problem) => (
                  <div key={problem.id} className="problem-card">
                    <div 
                      className="problem-header"
                      // --- Use problem.id ---
                      onClick={() => toggleProblem(problem.id)}
                    >
                      <div className="problem-main">
                        <h3 className="problem-title">{problem.title}</h3>
                        <p className="problem-description">{problem.description}</p>
                        <div className="problem-meta">
                          <span className={`difficulty-badge ${getDifficultyClass(problem.difficulty)}`}>
                            {problem.difficulty}
                          </span>
                          {/* 'companies' is mapped from 'tags' in our fetch logic */}
                          {problem.companies.map((company, idx) => (
                            <span key={idx} className="company-badge">{company}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* --- Use problem.id --- */}
                    {expandedProblem === problem.id && (
                      <div className="problem-details">
                        {/* Only show input/output if they exist in the DB */}
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
                          <button className="action-button solve-button">
                            ✏️ Solve Problem
                          </button>
                          <button className="action-button discuss-button">
                            Discuss
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
