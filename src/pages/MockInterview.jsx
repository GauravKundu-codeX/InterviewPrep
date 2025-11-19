import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './MockInterview.css';
import { io } from 'socket.io-client';

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

const SOCKET_SERVER_URL = 'http://localhost:3001';
let socket;

const MockInterview = () => {
  const navigate = useNavigate();
  const [view, setView] = useState('lobby');
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  
  const pc = useRef(null);
  const otherUser = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  
  const [localUserRole, setLocalUserRole] = useState('');
  const [usersInRoom, setUsersInRoom] = useState([]);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  
  const [remoteMicMuted, setRemoteMicMuted] = useState(false);
  const [remoteCameraOff, setRemoteCameraOff] = useState(false);
  const [remoteHandRaised, setRemoteHandRaised] = useState(false);
  const [peerLeft, setPeerLeft] = useState(false);

  // ... existing socket setup and WebRTC code ...
  useEffect(() => {
    socket = io(SOCKET_SERVER_URL);

    socket.on('room-created', ({ roomId: newRoomId, userRole, users }) => {
      setRoomId(newRoomId);
      setLocalUserRole(userRole);
      setUsersInRoom(users);
      setPeerLeft(false);
      setView('room');
    });

    socket.on('room-joined', ({ roomId: joinedRoomId, userRole, users }) => {
      setRoomId(joinedRoomId);
      setLocalUserRole(userRole);
      setUsersInRoom(users);
      setPeerLeft(false);
      const other = users.find(u => u.id !== socket.id);
      if (other) {
        otherUser.current = other;
      }
      setView('room');
    });

    socket.on('user-joined', ({ joinerId, joinerName, users }) => {
      otherUser.current = { id: joinerId, name: joinerName };
      setUsersInRoom(users);
      setPeerLeft(false);
      if(pc.current) {
        createOffer(joinerId);
      } else {
        setupMediaAndPeerConnection().then(success => {
          if (success && pc.current) {
            createOffer(joinerId);
          }
        });
      }
    });

    socket.on('offer', (payload) => {
      if (!otherUser.current) {
        const senderUser = usersInRoom.find(u => u.id === payload.sender);
        otherUser.current = { id: payload.sender, name: senderUser?.name || 'Peer' };
      }
      if(pc.current) {
        createAnswer(payload.sdp);
      } else {
        setupMediaAndPeerConnection().then(success => {
          if (success && pc.current) {
            createAnswer(payload.sdp);
          }
        });
      }
    });

    socket.on('answer', (payload) => {
      if (pc.current && pc.current.signalingState !== 'closed') {
        pc.current.setRemoteDescription(new RTCSessionDescription(payload.sdp))
          .catch(e => console.error("Error setting remote description:", e));
      }
    });

    socket.on('ice-candidate', (payload) => {
      if (pc.current && pc.current.signalingState !== 'closed') {
        pc.current.addIceCandidate(new RTCIceCandidate(payload.candidate))
          .catch(e => console.error("Error adding ICE candidate:", e));
      }
    });

    socket.on('peer-mic-toggle', ({ senderId, isMuted }) => {
      if (otherUser.current?.id === senderId) {
        setRemoteMicMuted(isMuted);
      }
    });
    socket.on('peer-camera-toggle', ({ senderId, isOff }) => {
      if (otherUser.current?.id === senderId) {
        setRemoteCameraOff(isOff);
      }
    });
    socket.on('peer-hand-toggle', ({ senderId, isRaised }) => {
      if (otherUser.current?.id === senderId) {
        setRemoteHandRaised(isRaised);
      }
    });

    socket.on('peer-left', ({ disconnectedUserId, disconnectedUserName }) => {
      if (otherUser.current?.id === disconnectedUserId) {
        setPeerLeft(true);
        alert(`User "${disconnectedUserName}" has left the room.`);
        setRemoteStream(null);
        otherUser.current = null;
        setRemoteMicMuted(false);
        setRemoteCameraOff(false);
        setRemoteHandRaised(false);
        if (pc.current) {
          pc.current.close();
          pc.current = null;
        }
        setUsersInRoom(prev => prev.filter(u => u.id !== disconnectedUserId));
      }
    });

    socket.on('room-full-or-invalid', (message) => {
      alert(`Could not join room: ${message}`);
      cleanupLocalState();
      setView('lobby');
    });

    socket.on('error', (message) => {
      alert(`Server error: ${message}`);
    });

    return () => {
      socket.off('room-created');
      socket.off('room-joined');
      socket.off('user-joined');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('peer-mic-toggle');
      socket.off('peer-camera-toggle');
      socket.off('peer-hand-toggle');
      socket.off('peer-left');
      socket.off('room-full-or-invalid');
      socket.off('error');
      if (pc.current) {
        pc.current.close();
        pc.current = null;
      }
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      socket.disconnect();
    };
  }, []);

  const setupMediaAndPeerConnection = async () => {
    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      stream.getAudioTracks()[0].enabled = !isMicMuted;
      stream.getVideoTracks()[0].enabled = !isCameraOff;

      pc.current = new RTCPeerConnection(servers);
      stream.getTracks().forEach((track) => {
        pc.current.addTrack(track, stream);
      });

      pc.current.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        } else {
          let inboundStream = remoteStream || new MediaStream();
          if (!inboundStream.getTracks().find(t => t.id === event.track.id)) {
            inboundStream.addTrack(event.track);
            if (remoteStream !== inboundStream) {
              setRemoteStream(inboundStream);
            }
          }
        }
      };

      pc.current.onicecandidate = (event) => {
        if (event.candidate && otherUser.current?.id) {
          socket.emit('ice-candidate', {
            target: otherUser.current.id,
            candidate: event.candidate,
          });
        }
      };

      pc.current.onconnectionstatechange = () => {
        if (pc.current?.connectionState === 'failed' || pc.current?.connectionState === 'disconnected' || pc.current?.connectionState === 'closed') {
          if(pc.current?.connectionState === 'failed'){
            alert("Connection failed. Please try rejoining.");
            cleanupLocalState();
            setView('lobby');
          }
        }
      };

      return true;
    } catch (err) {
      console.error('Failed to get media:', err);
      alert('Could not start. Please check permissions and try again.');
      return false;
    }
  };

  const createOffer = async (targetSocketId) => {
    if (!pc.current || pc.current.signalingState !== 'stable') {
      return;
    }
    try {
      const offer = await pc.current.createOffer();
      await pc.current.setLocalDescription(offer);
      socket.emit('offer', {
        target: targetSocketId,
        sdp: pc.current.localDescription,
      });
    } catch (err) {
      console.error('Error creating offer:', err);
    }
  };

  const createAnswer = async (offerSdp) => {
    if (!pc.current) {
      return;
    }
    try {
      if (pc.current.signalingState !== 'stable' && pc.current.signalingState !== 'have-local-offer') {
        await pc.current.setLocalDescription({ type: 'rollback' });
      }
      await pc.current.setRemoteDescription(new RTCSessionDescription(offerSdp));
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);
      if (otherUser.current?.id) {
        socket.emit('answer', {
          target: otherUser.current.id,
          sdp: pc.current.localDescription,
        });
      }
    } catch (err) {
      console.error('Error creating answer:', err);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!userName.trim()) {
      alert("Please enter your name.");
      return;
    }
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const success = await setupMediaAndPeerConnection();
    if (success) {
      socket.emit('create-room', { roomId: newRoomId, name: userName });
    } else {
      cleanupLocalState();
      setView('lobby');
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!userName.trim()) {
      alert("Please enter your name.");
      return;
    }
    const code = joinCode.trim().toUpperCase();
    if (!code || code.length !== 6) {
      alert("Please enter a valid 6-character room code.");
      return;
    }
    const success = await setupMediaAndPeerConnection();
    if (success) {
      socket.emit('join-room', { roomId: code, name: userName });
    } else {
      cleanupLocalState();
      setView('lobby');
    }
  };

  const handleHangUp = () => {
    if (roomId) {
      socket.emit('leave-room', { roomId });
    }
    cleanupLocalState();
  };

  const cleanupLocalState = () => {
    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    setLocalStream(null);
    setRemoteStream(null);
    otherUser.current = null;
    setUsersInRoom([]);
    setRoomId('');
    setJoinCode('');
    setLocalUserRole('');
    setPeerLeft(false);
    setIsMicMuted(false);
    setIsCameraOff(false);
    setIsHandRaised(false);
    setRemoteMicMuted(false);
    setRemoteCameraOff(false);
    setRemoteHandRaised(false);
    setView('lobby');
  };

  const toggleMic = () => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      const newState = !audioTrack.enabled;
      audioTrack.enabled = newState;
      const mutedState = !newState;
      setIsMicMuted(mutedState);
      socket.emit('toggle-mic', { roomId, isMuted: mutedState });
    }
  };

  const toggleCamera = () => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      const newState = !videoTrack.enabled;
      videoTrack.enabled = newState;
      const offState = !newState;
      setIsCameraOff(offState);
      socket.emit('toggle-camera', { roomId, isOff: offState });
    }
  };

  const toggleHand = () => {
    if (localUserRole !== 'Interviewee') return;
    const newState = !isHandRaised;
    setIsHandRaised(newState);
    socket.emit('raise-hand', { roomId, isRaised: newState });
  };

  useEffect(() => {
    if (view === 'room' && localStream && localVideoRef.current) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
    } else if (view !== 'room' && localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  }, [view, localStream]);

  useEffect(() => {
    if (view === 'room' && remoteStream && remoteVideoRef.current) {
      if (remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    } else if (view !== 'room' && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  }, [view, remoteStream]);

  const getLocalUserNameAndRole = () => {
    const name = usersInRoom.find(u => u.id === socket?.id)?.name || userName;
    return `${name} (${localUserRole || '...'})`;
  };

  const getRemoteUserNameAndRole = () => {
    const remoteUser = usersInRoom.find(u => u.id !== socket?.id);
    const name = remoteUser?.name || 'Peer';
    const role = localUserRole === 'Interviewer' ? 'Interviewee' : localUserRole === 'Interviewee' ? 'Interviewer' : '...';
    return `${name} (${role})`;
  };

  const renderLobby = () => (
    <div className="lobby-container fade-in">
      <div className="lobby-card glassmorphism">
        <div className="lobby-icon interviewer-icon">💼</div>
        <h2 className="lobby-title">Interviewer</h2>
        <p className="lobby-description">Start a new session and guide the interview process.</p>
        <button className="lobby-button primary" onClick={() => setView('create')}>
          Create Room
        </button>
      </div>
      <div className="lobby-card glassmorphism">
        <div className="lobby-icon interviewee-icon">👤</div>
        <h2 className="lobby-title">Interviewee</h2>
        <p className="lobby-description">Join an existing session using a room code.</p>
        <button className="lobby-button secondary" onClick={() => setView('join')}>
          Join Room
        </button>
      </div>
    </div>
  );

  const renderCreateForm = () => (
    <div className="form-container fade-in">
      <form onSubmit={handleCreateRoom} className="room-form glassmorphism">
        <h2 className="form-title">Create Interview Room</h2>
        <p className="form-subtitle">Enter your name to start the session</p>
        <div className="form-group">
          <label htmlFor="userName">Your Name</label>
          <input
            id="userName"
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="e.g., Gaurav"
            required
          />
        </div>
        <button type="submit" className="form-button primary">Start Session</button>
        <button type="button" className="back-button-form" onClick={() => setView('lobby')}>
          ← Back to Lobby
        </button>
      </form>
    </div>
  );

  const renderJoinForm = () => (
    <div className="form-container fade-in">
      <form onSubmit={handleJoinRoom} className="room-form glassmorphism">
        <h2 className="form-title">Join Interview Room</h2>
        <p className="form-subtitle">Enter your name and the 6-character room code</p>
        <div className="form-group">
          <label htmlFor="userName">Your Name</label>
          <input
            id="userName"
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="e.g., Anshika"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="joinCode">Room Code</label>
          <input
            id="joinCode"
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Enter 6-character code"
            required
            maxLength={6}
            style={{ textTransform: 'uppercase' }}
          />
        </div>
        <button type="submit" className="form-button primary">Join Session</button>
        <button type="button" className="back-button-form" onClick={() => setView('lobby')}>
          ← Back to Lobby
        </button>
      </form>
    </div>
  );

  const renderRoom = () => (
    <div className="room-container fade-in">
      <div className="room-header">
        {localUserRole === 'Interviewer' && (
          <h2 className="room-title">Room Code: <span className="room-code">{roomId}</span></h2>
        )}
        {localUserRole === 'Interviewee' && (
          <h2 className="room-title">Interview Session Active</h2>
        )}
      </div>
      <div className="video-grid">
        <div className={`video-participant remote ${remoteCameraOff ? 'camera-off' : ''}`}>
          <div className="video-wrapper">
            <video
              key={remoteStream ? `remote-${remoteStream.id}` : 'no-stream-remote'}
              ref={remoteVideoRef}
              id="remoteVideo"
              autoPlay
              playsInline
            ></video>
            {(peerLeft || !remoteStream || remoteCameraOff) && (
              <div className="video-placeholder">
                <span className="placeholder-icon">👤</span>
                {peerLeft && <span className="placeholder-text">Peer has left</span>}
                {!peerLeft && !remoteStream && <span className="placeholder-text">Waiting for peer...</span>}
                {!peerLeft && remoteStream && remoteCameraOff && <span className="placeholder-text">Camera Off</span>}
              </div>
            )}
            <div className="participant-info remote-info">
              <span className="participant-name">
                {peerLeft ? 'Peer Left' : getRemoteUserNameAndRole()}
              </span>
              {!peerLeft && (
                <div className="status-icons">
                  {remoteMicMuted && <span className="icon" title="Mic Muted">🎤<span className="slash">/</span></span>}
                  {remoteCameraOff && <span className="icon" title="Camera Off">📷<span className="slash">/</span></span>}
                  {remoteHandRaised && <span className="icon hand" title="Hand Raised">✋</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`video-participant local ${isCameraOff ? 'camera-off' : ''}`}>
          <div className="video-wrapper">
            <video
              key={localStream ? `local-${localStream.id}` : 'no-stream-local'}
              ref={localVideoRef}
              id="localVideo"
              autoPlay
              playsInline
              muted
            ></video>
            {isCameraOff && (
              <div className="video-placeholder">
                <span className="placeholder-icon">👤</span>
                <span className="placeholder-text">Camera Off</span>
              </div>
            )}
            <div className="participant-info local-info">
              <span className="participant-name">{getLocalUserNameAndRole()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="control-bar glassmorphism">
        <button
          className={`control-button mic-button ${isMicMuted ? 'active' : ''}`}
          onClick={toggleMic}
          title={isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
          disabled={!localStream}
        >
          {isMicMuted ? '🎤❌' : '🎤'}
        </button>
        <button
          className={`control-button camera-button ${isCameraOff ? 'active' : ''}`}
          onClick={toggleCamera}
          title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
          disabled={!localStream}
        >
          {isCameraOff ? '📷❌' : '📷'}
        </button>
        {localUserRole === 'Interviewee' && (
          <button
            className={`control-button hand-button ${isHandRaised ? 'active' : ''}`}
            onClick={toggleHand}
            title={isHandRaised ? 'Lower Hand' : 'Raise Hand'}
          >
            ✋
          </button>
        )}
        <button className="control-button hangup-button" onClick={handleHangUp} title="Leave Call">
          📞🔴
        </button>
      </div>
    </div>
  );

  const renderView = () => {
    switch (view) {
      case 'lobby':
        return renderLobby();
      case 'create':
        return renderCreateForm();
      case 'join':
        return renderJoinForm();
      case 'room':
        return socket?.connected && localStream ? renderRoom() : <div className="loading fade-in">Connecting...</div>;
      default:
        return renderLobby();
    }
  };

  return (
    <div className="mock-interview-page">
      <div className="mock-interview-header">
        {(view === 'lobby' || view === 'create' || view === 'join') && (
          <button className="back-button" onClick={() => view === 'lobby' ? navigate('/') : setView('lobby')}>
            ← Back
          </button>
        )}
        <div className="header-content">
          <h1 className="mock-interview-title">Live Mock Interview</h1>
          {view === 'lobby' && (
            <p className="mock-interview-subtitle">Practice 1-on-1 with another user in a live video call</p>
          )}
        </div>
      </div>

      <div className="mock-interview-content">
        {renderView()}
      </div>
    </div>
  );
};

export default MockInterview;
