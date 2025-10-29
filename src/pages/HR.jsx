import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './HR.css';
// --- Firebase Imports ---
import { db, storage, auth } from '../firebase'; // Added storage and auth
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // Storage functions
import { onAuthStateChanged } from 'firebase/auth'; // To get user ID

const HR = () => {
  const navigate = useNavigate();
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null); // Added state for user

  // --- Recording State ---
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState('Idle'); // Idle, Recording, Processing, Done, Error
  const [audioBlob, setAudioBlob] = useState(null);
  const [feedback, setFeedback] = useState(''); // State for AI feedback (later)
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // --- Get current user ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe(); // Cleanup listener
  }, []);

  // --- Fetch questions from Firestore ---
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
  }, [selectedQuestionId]); // Rerun if selectedQuestionId is null initially

  const handleQuestionSelect = (id) => {
    setSelectedQuestionId(id);
    setShowAnswer(false);
    // Reset recording state when question changes
    setIsRecording(false);
    setRecordingStatus('Idle');
    setAudioBlob(null);
    setFeedback('');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const currentQuestion = questions.find(q => q.id === selectedQuestionId);

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
      audioChunksRef.current = []; // Reset chunks

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); // Use webm or another suitable format
        setAudioBlob(blob);
        setRecordingStatus('Processing');
        console.log("Recording stopped, audio blob created:", blob);

        // --- Upload to Firebase Storage ---
        if (!currentUser || !currentQuestion) return;

        const userId = currentUser.uid;
        const questionId = currentQuestion.id;
        const timestamp = Date.now();
        const fileName = `hr-answers/${userId}/${questionId}-${timestamp}.webm`;
        const storageRef = ref(storage, fileName);

        try {
          console.log("Uploading to:", fileName);
          const snapshot = await uploadBytes(storageRef, blob);
          console.log('Uploaded a blob or file!', snapshot);
          // Optional: Get download URL if you want to store it in Firestore
          // const downloadURL = await getDownloadURL(snapshot.ref);
          // console.log('File available at', downloadURL);

          setRecordingStatus('Done'); // Mark as done after successful upload

          // --- Placeholder for AI analysis call ---
          setFeedback('Recording uploaded successfully! AI feedback coming soon...');


        } catch (uploadError) {
          console.error("Error uploading audio:", uploadError);
          setRecordingStatus('Error');
          setFeedback(`Upload failed: ${uploadError.message}`);
        }

        // Stop the media stream tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingStatus('Recording');
      setFeedback(''); // Clear previous feedback
      console.log("Recording started...");

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
      // Status will be set to 'Processing' in the onstop handler
    }
  };

  // --- Handle Record Button Click ---
  const handleRecordClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };


  // --- Loading State ---
  if (loading) {
    return (
      <div className="hr-page">
        <h1 style={{ textAlign: 'center' }}>Loading HR Questions...</h1>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="hr-page">
        <h1 style={{ textAlign: 'center' }}>No HR Questions Found.</h1>
        <p style={{ textAlign: 'center' }}>Go to your Firebase Console to add documents to the 'hrQuestions' collection.</p>
      </div>
    );
  }

  return (
    <div className="hr-page">
      <div className="hr-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
        <h1 className="hr-title">Practice HR Questions</h1>
        <p className="hr-subtitle">Prepare for behavioral and HR interview questions</p>
      </div>

      <div className="hr-container">
        <div className="questions-sidebar">
          <h3 className="sidebar-title">Questions</h3>
          <div className="questions-list">
            {questions.map((q) => (
              <div
                key={q.id}
                className={`question-item ${selectedQuestionId === q.id ? 'active' : ''}`}
                onClick={() => handleQuestionSelect(q.id)}
              >
                <div className="question-text">{q.question}</div>
                <div className="question-category">{q.category}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="question-detail">
          <div className="detail-card">
            <div className="question-icon">💬</div>
            <h2 className="detail-question">{currentQuestion.question}</h2>
            <span className="detail-category">{currentQuestion.category}</span>

            <button
              className="show-answer-button"
              onClick={() => setShowAnswer(!showAnswer)}
            >
              {showAnswer ? 'Hide Answer' : 'Show Answer'}
            </button>

            {showAnswer && (
              <div className="answer-section">
                <div className="answer-content">
                  <h4>Tips for Success</h4>
                  <ul className="tips-list">
                    {currentQuestion.tips.map((tip, idx) => (
                      <li key={idx} className="tip-item">
                        <span className="tip-icon">✓</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="answer-text">
                  <h4>Sample Approach</h4>
                  <p>{currentQuestion.sampleAnswer}</p>
                </div>
              </div>
            )}

            {/* --- Recording UI --- */}
            <div className="recording-section">
              <button
                className={`practice-button record-button ${isRecording ? 'recording' : ''}`}
                onClick={handleRecordClick}
                disabled={recordingStatus === 'Processing'} // Disable while uploading/analyzing
              >
                🎤 {isRecording ? 'Stop Recording' : (audioBlob ? 'Record Again' : 'Record Answer')}
              </button>
              <p className="recording-status">
                Status: {recordingStatus}
                {isRecording && <span className="recording-indicator"> (● Recording...)</span>}
                {recordingStatus === 'Processing' && <span> (Uploading...)</span>}
              </p>
              {feedback && (
                <div className="feedback-section">
                  <h4>Feedback:</h4>
                  <p>{feedback}</p>
                </div>
              )}
            </div>

            {/* Removed the 'Practice Speaking' button div */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HR;


