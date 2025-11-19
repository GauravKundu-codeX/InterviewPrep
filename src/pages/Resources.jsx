import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Resources.css';

const Resources = () => {
  const navigate = useNavigate();
  const [uploadedFiles, setUploadedFiles] = useState({});

  const topics = [
    {
      title: 'Data Structures',
      icon: '📊',
      description: 'Arrays, Linked Lists, Trees, Graphs, Hash Tables',
      color: '#00D9FF'
    },
    {
      title: 'Algorithms',
      icon: '⚡',
      description: 'Sorting, Searching, Dynamic Programming, Greedy',
      color: '#00D9FF'
    },
    {
      title: 'Object-Oriented Programming',
      icon: '🏗️',
      description: 'OOP Concepts, Design Patterns, SOLID Principles',
      color: '#00D9FF'
    },
    {
      title: 'Database Management System',
      icon: '🗄️',
      description: 'SQL, NoSQL, Normalization, Indexing, Transactions',
      color: '#00D9FF'
    },
    {
      title: 'Operating Systems',
      icon: '⚙️',
      description: 'Process Management, Memory, File Systems, Scheduling',
      color: '#00D9FF'
    },
    {
      title: 'Computer Networks',
      icon: '🌐',
      description: 'TCP/IP, HTTP, DNS, Routing, Network Security',
      color: '#00D9FF'
    },
    {
      title: 'System Design',
      icon: '🏛️',
      description: 'Scalability, Load Balancing, Caching, Microservices',
      color: '#00D9FF'
    }
  ];

  const handleFileUpload = (topicTitle, event) => {
    const files = Array.from(event.target.files);
    setUploadedFiles(prev => ({
      ...prev,
      [topicTitle]: [...(prev[topicTitle] || []), ...files]
    }));
  };

  const handleRemoveFile = (topicTitle, fileIndex) => {
    setUploadedFiles(prev => ({
      ...prev,
      [topicTitle]: prev[topicTitle].filter((_, index) => index !== fileIndex)
    }));
  };

  return (
    <div className="resources-page">
      <div className="resources-left-border"></div>
      
      <div className="resources-header">
        <h1 className="resources-title">Study Resources</h1>
        <p className="resources-subtitle">Curated study materials for core computer science topics</p>
      </div>

      <div className="resources-container">
        <div className="topics-grid">
          {topics.map((topic, index) => (
            <div key={index} className="resource-card">
              <div className="card-number">{String(index + 1).padStart(2, '0')}</div>
              
              <div className="resource-header">
                <div className="resource-icon">
                  {topic.icon}
                </div>
              </div>

              <h3 className="resource-title">{topic.title}</h3>
              <p className="resource-description">{topic.description}</p>

              <div className="upload-section">
                <label className="upload-label">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.ppt,.pptx"
                    onChange={(e) => handleFileUpload(topic.title, e)}
                    className="file-input"
                  />
                  <span className="upload-button">
                    + Upload Files
                  </span>
                </label>

                {uploadedFiles[topic.title] && uploadedFiles[topic.title].length > 0 && (
                  <div className="uploaded-files">
                    <div className="files-count">{uploadedFiles[topic.title].length} file(s)</div>
                    {uploadedFiles[topic.title].map((file, fileIndex) => (
                      <div key={fileIndex} className="file-item">
                        <span className="file-name">{file.name}</span>
                        <button
                          className="remove-button"
                          onClick={() => handleRemoveFile(topic.title, fileIndex)}
                          aria-label="Remove file"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button className="view-resources-button">
                View Resources →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Resources;
