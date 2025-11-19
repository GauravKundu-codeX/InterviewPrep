import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './HR.css';
import { db, storage, auth } from '../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';

const HR = () => {
  const navigate = useNavigate();
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const [animatedProgress, setAnimatedProgress] = useState(0);

  // --- Recording State ---
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState('Idle');
  const [audioBlob, setAudioBlob] = useState(null);
  const [feedback, setFeedback] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (questions.length > 0 && selectedQuestionId) {
      const currentIndex = questions.findIndex(q => q.id === selectedQuestionId);
      const progress = ((currentIndex + 1) / questions.length) * 100;
      setAnimatedProgress(progress);
    }
  }, [selectedQuestionId, questions]);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'hrQuestions'), orderBy('order'));
        const querySnapshot = await getDocs(q);

        const questionsData = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        }));

        setQuestions(questionsData);

        if (questionsData.length > 0 && !selectedQuestionId) {
          setSelectedQuestionId(questionsData[0].id);
        }
      } catch (err) {
        console.error("Error fetching HR questions: ", err);
      }
      setLoading(false);
    };

    fetchQuestions();
  }, [selectedQuestionId]);

  const handleQuestionSelect = (id) => {
    setSelectedQuestionId(id);
    setShowAnswer(false);
    setIsRecording(false);
    setRecordingStatus('Idle');
    setAudioBlob(null);
    setFeedback('');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const currentQuestion = questions.find(q => q.id === selectedQuestionId);
  const currentIndex = questions.findIndex(q => q.id === selectedQuestionId);

  // --- Start Recording ---
  const startRecording = async () => {
    if (!currentUser) {
      alert("Please sign in to record your answers.");
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Your browser does not support audio recording.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setRecordingStatus('Processing');

        if (!currentUser || !currentQuestion) return;

        const userId = currentUser.uid;
        const questionId = currentQuestion.id;
        const timestamp = Date.now();
        const fileName = `hr-answers/${userId}/${questionId}-${timestamp}.webm`;
        const storageRef = ref(storage, fileName);

        try {
          await uploadBytes(storageRef, blob);
          setRecordingStatus('Done');
          setFeedback('Recording uploaded successfully! AI feedback coming soon...');
        } catch (uploadError) {
          console.error("Error uploading audio:", uploadError);
          setRecordingStatus('Error');
          setFeedback(`Upload failed: ${uploadError.message}`);
        }

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingStatus('Recording');
      setFeedback('');
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
      setRecordingStatus('Error');
    }
  };

  // --- Stop Recording ---
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleRecordClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  if (loading) {
    return (
      <div className="hr-page">
        <div className="loading-spinner">
          <div className="spinner-circle"></div>
          <p>Loading HR Questions...</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="hr-page">
        <div className="no-data-container">
          <p>No HR Questions Found.</p>
          <p style={{ fontSize: '0.95rem' }}>Go to your Firebase Console to add documents to the 'hrQuestions' collection.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="hr-page">
      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${animatedProgress}%` }}></div>
      </div>

      <div className="hr-header">
        <h1 className="hr-title">Master HR Interviews</h1>
        <p className="hr-subtitle">Practice behavioral and HR questions with AI-powered feedback</p>
        <div className="progress-counter">Question {currentIndex + 1} of {questions.length}</div>
      </div>

      <div className="hr-container">
        <div className="questions-sidebar">
          <h3 className="sidebar-title">
            <span className="sidebar-icon">📋</span> Questions
          </h3>
          <div className="questions-list">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className={`question-item ${selectedQuestionId === q.id ? 'active' : ''}`}
                onClick={() => handleQuestionSelect(q.id)}
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="question-number">{idx + 1}</div>
                <div className="question-content">
                  <div className="question-text">{q.question}</div>
                  <div className="question-category">{q.category}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="question-detail">
          <div className="detail-card">
            <div className="question-header">
              <div className="question-icon">💬</div>
              <div>
                <h2 className="detail-question">{currentQuestion.question}</h2>
                <span className="detail-category-badge">{currentQuestion.category}</span>
              </div>
            </div>

            <button
              className={`show-answer-button ${showAnswer ? 'active' : ''}`}
              onClick={() => setShowAnswer(!showAnswer)}
            >
              <span className="button-icon">{showAnswer ? '▼' : '▶'}</span>
              {showAnswer ? 'Hide Tips & Answer' : 'Show Tips & Answer'}
            </button>

            {showAnswer && (
              <div className="answer-section animate-in">
                <div className="answer-content">
                  <h4 className="answer-title">💡 Tips for Success</h4>
                  <ul className="tips-list">
                    {currentQuestion.tips.map((tip, idx) => (
                      <li key={idx} className="tip-item" style={{ animationDelay: `${idx * 0.1}s` }}>
                        <span className="tip-number">{idx + 1}</span>
                        <span className="tip-text">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="answer-text">
                  <h4 className="answer-title">📝 Sample Approach</h4>
                  <p>{currentQuestion.sampleAnswer}</p>
                </div>
              </div>
            )}

            <div className="recording-section">
              <h3 className="recording-title">🎤 Practice Your Answer</h3>
              <button
                className={`practice-button record-button ${isRecording ? 'recording' : ''} ${recordingStatus === 'Done' ? 'success' : ''}`}
                onClick={handleRecordClick}
                disabled={recordingStatus === 'Processing'}
              >
                <span className="button-pulse"></span>
                {isRecording ? '⏹ Stop Recording' : (audioBlob ? '🔄 Record Again' : '🎤 Start Recording')}
              </button>
              <p className={`recording-status ${recordingStatus.toLowerCase()}`}>
                <span className="status-indicator"></span>
                {recordingStatus}
                {isRecording && <span className="recording-dot"> ●</span>}
              </p>
              {feedback && (
                <div className={`feedback-section ${recordingStatus === 'Done' ? 'success' : 'error'}`}>
                  <h4>📊 Feedback:</h4>
                  <p>{feedback}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HR;
