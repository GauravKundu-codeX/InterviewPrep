import React, { useState, useEffect } from 'react';
import './Resources.css';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

const Resources = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchResources = async () => {
    setLoading(true);
    setError('');
    try {
      const categoriesQuery = query(collection(db, 'categories'), orderBy('order'));
      const categoriesSnapshot = await getDocs(categoriesQuery);
      
      const categoriesWithFiles = categoriesSnapshot.docs.map(async (categoryDoc) => {
        const categoryData = categoryDoc.data();
        
        const filesQuery = query(collection(db, 'categories', categoryDoc.id, 'resources'), orderBy('title', 'asc'));
        const filesSnapshot = await getDocs(filesQuery);
        
        const filesData = filesSnapshot.docs.map(fileDoc => ({
          id: fileDoc.id,
          ...fileDoc.data(),
        }));

        return {
          ...categoryData,
          id: categoryDoc.id,
          files: filesData, 
        };
      });

      const allData = await Promise.all(categoriesWithFiles);
      setResources(allData); 

    } catch (err) {
      console.error('Error fetching resources:', err);
      setError(`Could not load resources. Please ensure Firestore rules allow public read for /categories/{id}/resources.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);


  return (
    <div className="resources-page">
      <div className="resources-header">
        <h1>Study Resources</h1>
        <p>Curated study materials for core computer science topics</p>
      </div>

      {loading && <p className="loading-message">Loading resources...</p>}
      {error && <p className="error-message">{error}</p>}
      
      <div className="resources-grid">
        {resources.map((category, index) => {
          const filesCount = category.files?.length || 0;
          
          return (
            <div key={category.id} className="resource-card">
              <div className="card-bg-number">{String(index + 1).padStart(2, '0')}</div>
              <div className="card-icon">{category.icon}</div>
              <h3>{category.title}</h3> 
              <p className="card-desc">{category.description}</p>

              <div className="file-list-container">
                <div className="file-list">
                  {filesCount > 0 ? (
                    category.files.map(res => (
                      <div key={res.id} className="file-item">
                        <a href={res.fileUrl} target="_blank" rel="noreferrer" title={res.description}>
                          📄 {res.title}
                        </a>
                        <a href={res.fileUrl} target="_blank" rel="noreferrer" className="download-btn">
                          Download
                        </a>
                      </div>
                    ))
                  ) : (
                    <div className="file-item placeholder-text">
                      <span>No resources available for this topic yet.</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="view-resources-button-wrapper">
                  <button className="view-resources-btn" disabled={filesCount === 0}>
                      View All ({filesCount}) →
                  </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Resources;