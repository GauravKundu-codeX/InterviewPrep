import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './MockInterview.css';

// --- NEW: Import Socket.IO client ---
import { io } from 'socket.io-client';

// --- WebRTC Configuration ---
const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

// --- Socket Connection ---
// Initialize socket connection (consider moving URL to env variable)
const SOCKET_SERVER_URL = 'http://localhost:3001';
let socket; // Define socket outside component to prevent re-creation on re-renders

const MockInterview = () => {
  const navigate = useNavigate();

  // State to manage which view is active
  const [view, setView] = useState('lobby'); // lobby, create, join, room

  // State for the room ID
  const [roomId, setRoomId] = useState('');

  // State for form inputs
  const [userName, setUserName] = useState(''); // User's name
  const [joinCode, setJoinCode] = useState('');

  // --- WebRTC State ---
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  // --- Refs for stable objects ---
  const pc = useRef(null);
  const otherUser = useRef(null); // { id: socketId, name: userName }

  // --- Video Element Refs ---
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // --- User/Role State ---
  const [localUserRole, setLocalUserRole] = useState(''); // 'Interviewer' or 'Interviewee'
  const [usersInRoom, setUsersInRoom] = useState([]); // Array of {id, name}

  // --- Media Control State ---
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);

  // --- Remote Peer State ---
  const [remoteMicMuted, setRemoteMicMuted] = useState(false);
  const [remoteCameraOff, setRemoteCameraOff] = useState(false);
  const [remoteHandRaised, setRemoteHandRaised] = useState(false);
  const [peerLeft, setPeerLeft] = useState(false); // New state to track if peer left

  // --- Initialize Socket Connection ---
  useEffect(() => {
    // Connect socket only once when component mounts
    socket = io(SOCKET_SERVER_URL);

    // --- Setup all socket listeners ---

    // Server confirms room creation
    socket.on('room-created', ({ roomId: newRoomId, userRole, users }) => {
        console.log(`Room ${newRoomId} created successfully. You are ${userRole}.`);
        setRoomId(newRoomId);
        setLocalUserRole(userRole);
        setUsersInRoom(users);
        setPeerLeft(false); // Reset peer left state
        setView('room');
    });

    // Server confirms room join
    socket.on('room-joined', ({ roomId: joinedRoomId, userRole, users }) => {
        console.log(`Joined room ${joinedRoomId}. You are ${userRole}.`);
        setRoomId(joinedRoomId);
        setLocalUserRole(userRole);
        setUsersInRoom(users);
        setPeerLeft(false); // Reset peer left state
        // Find the other user in the list sent by server
        const other = users.find(u => u.id !== socket.id);
        if (other) {
            otherUser.current = other;
            console.log("Setting other user from room-joined:", other);
        }
        setView('room');
    });

    // A peer joins (for creator)
    socket.on('user-joined', ({ joinerId, joinerName, users }) => { // Receive full user list
      console.log('Other user joined:', joinerName, joinerId);
      otherUser.current = { id: joinerId, name: joinerName };
      setUsersInRoom(users); // Update user list
      setPeerLeft(false); // Reset peer left state
      // Creator makes the offer ONLY IF PC is ready
      if(pc.current) {
        createOffer(joinerId);
      } else {
          console.warn("PC not ready when user-joined received, attempting setup...");
          // Attempt to setup media and then create offer
          setupMediaAndPeerConnection().then(success => {
              if (success && pc.current) {
                  createOffer(joinerId);
              } else {
                  console.error("Failed to setup media on user-joined, cannot create offer.");
              }
          });
      }
    });

    // Receive an OFFER (for joiner)
    socket.on('offer', (payload) => {
      console.log('Received offer from:', payload.sender);
      // Ensure otherUser is set (should be set during room-joined)
      if (!otherUser.current) {
         console.warn("Received offer, but otherUser ref is not set. Setting from sender.");
         // Find name from usersInRoom if possible, otherwise just use ID
         const senderUser = usersInRoom.find(u => u.id === payload.sender);
         otherUser.current = { id: payload.sender, name: senderUser?.name || 'Peer' };
      }

      // Joiner creates an answer ONLY IF PC is ready
      if(pc.current) {
         createAnswer(payload.sdp);
      } else {
          console.warn("PC not ready when offer received, attempting setup...");
           // Attempt to setup media and then create answer
           setupMediaAndPeerConnection().then(success => {
              if (success && pc.current) {
                  createAnswer(payload.sdp);
              } else {
                  console.error("Failed to setup media on offer, cannot create answer.");
              }
          });
      }
    });

    // Receive an ANSWER (for creator)
    socket.on('answer', (payload) => {
      console.log('Received answer from:', payload.sender);
      if (pc.current && pc.current.signalingState !== 'closed') {
        pc.current.setRemoteDescription(new RTCSessionDescription(payload.sdp))
          .catch(e => console.error("Error setting remote description from answer:", e));
      } else {
        console.warn("PeerConnection not ready or closed, ignoring answer");
      }
    });

    // Receive ICE Candidates
    socket.on('ice-candidate', (payload) => {
      if (pc.current && pc.current.signalingState !== 'closed') {
        console.log('Received ICE candidate from', payload.sender);
        pc.current.addIceCandidate(new RTCIceCandidate(payload.candidate))
          .catch(e => console.error("Error adding received ICE candidate:", e));
      } else {
        console.warn("PeerConnection not ready or closed, ignoring ICE candidate");
      }
    });

    // --- Handle Peer Media Toggles ---
    socket.on('peer-mic-toggle', ({ senderId, isMuted }) => {
        // Ensure the update is coming from the *other* user
        if (otherUser.current?.id === senderId) {
            console.log(`Peer ${senderId} mic toggled: ${isMuted}`);
            setRemoteMicMuted(isMuted);
        }
    });
    socket.on('peer-camera-toggle', ({ senderId, isOff }) => {
        if (otherUser.current?.id === senderId) {
            console.log(`Peer ${senderId} camera toggled: ${isOff}`);
            setRemoteCameraOff(isOff);
        }
    });
    socket.on('peer-hand-toggle', ({ senderId, isRaised }) => {
        if (otherUser.current?.id === senderId) {
            console.log(`Peer ${senderId} hand toggled: ${isRaised}`);
            setRemoteHandRaised(isRaised);
        }
    });


    // Peer leaves / Hangs up
    socket.on('peer-left', ({ disconnectedUserId, disconnectedUserName }) => {
      console.log(`Peer ${disconnectedUserName} (${disconnectedUserId}) left the call.`);
      // Only show alert if the leaving user is the one we were connected to
      if (otherUser.current?.id === disconnectedUserId) {
        setPeerLeft(true); // Set state to show peer left message
        alert(`User "${disconnectedUserName}" has left the room.`);

        // Clean up remote state and connection
        setRemoteStream(null);
        otherUser.current = null;
        setRemoteMicMuted(false);
        setRemoteCameraOff(false);
        setRemoteHandRaised(false);

        // Close peer connection for the user who is still in the room
        if (pc.current) {
            pc.current.close();
            pc.current = null; // Reset peer connection
            console.log("Peer connection closed because peer left.");
            // Re-initialize PC for potentially new connection? Optional.
            // setupMediaAndPeerConnection(); // Re-setup? Or wait for manual action?
        }
        // Update local user list
        setUsersInRoom(prev => prev.filter(u => u.id !== disconnectedUserId));

        // Option: Go back to lobby immediately
        // setView('lobby');

        // Option: Stay in room but show peer left
        // No view change needed if showing message in renderRoom
      } else {
          console.log("Received peer-left event for a user not currently connected to.");
      }
    });

    // Room is full or invalid on join attempt
    socket.on('room-full-or-invalid', (message) => {
      alert(`Could not join room: ${message}`);
      cleanupLocalState(); // Perform cleanup before going back
      setView('lobby'); // Go back to lobby if join failed
    });

    // General error from server
    socket.on('error', (message) => {
        console.error("Server error:", message);
        alert(`Server error: ${message}`);
        // Consider cleanup and returning to lobby on critical errors
    });

    // Cleanup: Disconnect socket when component unmounts
    return () => {
      console.log("Disconnecting socket...");
      // Remove all listeners to prevent memory leaks
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

      // Clean up WebRTC connection if it exists
      if (pc.current) {
        pc.current.close();
        pc.current = null;
      }
      // Stop local media tracks
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }

      socket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // --- Central function to set up media and PC ---
  const setupMediaAndPeerConnection = async () => {
     // Close existing connection first if any
    if (pc.current) {
        console.log("Closing existing PeerConnection before setup...");
        pc.current.close();
        pc.current = null;
    }
    // Stop existing local stream first if any
    if (localStream) {
        console.log("Stopping existing local stream before setup...");
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
    }
    // Clear remote stream as well
    setRemoteStream(null);


    try {
      // 1. Get media
      console.log("Requesting media devices...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true, // Request audio
      });
      setLocalStream(stream);
      console.log("Media stream obtained.");

      // Apply initial mute/off state based on current state
      stream.getAudioTracks()[0].enabled = !isMicMuted;
      stream.getVideoTracks()[0].enabled = !isCameraOff;


      // 2. Setup Peer Connection
      console.log("Initializing PeerConnection...");
      pc.current = new RTCPeerConnection(servers);
      console.log("PeerConnection initialized.");

      // 3. Add local tracks
      console.log("Adding local tracks to PeerConnection...");
      stream.getTracks().forEach((track) => {
        try {
          pc.current.addTrack(track, stream);
          console.log(`Added local ${track.kind} track.`);
        } catch (e) {
          console.error("Error adding track:", track.kind, e);
        }
      });

      // 4. Listen for remote tracks
      pc.current.ontrack = (event) => {
        console.log("Got remote track!", event.track.kind);
        // We might receive audio and video tracks separately
        if (event.streams && event.streams[0]) {
             // Use the stream directly if available
             if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== event.streams[0]) {
                console.log("Assigning remote stream directly from event.streams[0]");
                setRemoteStream(event.streams[0]);
             }
        } else {
            // If streams[0] isn't available, build the stream track by track
             let inboundStream = remoteStream || new MediaStream();
             if (!inboundStream.getTracks().find(t => t.id === event.track.id)) {
                console.log("Adding track to remote stream:", event.track.kind);
                inboundStream.addTrack(event.track);
                // Only update state if the stream object itself changes or is new
                if (remoteStream !== inboundStream) {
                    setRemoteStream(inboundStream);
                }
             }
        }
      };

      // 5. Listen for ICE candidates and send to peer
      pc.current.onicecandidate = (event) => {
        if (event.candidate && otherUser.current?.id) { // Only send if we know who the peer is
          console.log("Sending ICE candidate to:", otherUser.current.id);
          socket.emit('ice-candidate', {
            target: otherUser.current.id, // Send directly to the peer
            candidate: event.candidate,
          });
        } else if (!otherUser.current?.id) {
            console.warn("Generated ICE candidate, but otherUser is not known yet.");
        }
      };

      // 6. Listen for connection state changes (for debugging)
       pc.current.onconnectionstatechange = () => {
           console.log("PeerConnection state changed:", pc.current?.connectionState);
           if (pc.current?.connectionState === 'failed' || pc.current?.connectionState === 'disconnected' || pc.current?.connectionState === 'closed') {
               // Handle potential connection failures here
               console.warn("PeerConnection state is failed/disconnected/closed.");
               // Maybe try to restart ICE or show a reconnecting message
               // If disconnected, WebRTC might try to reconnect automatically for a while
               if(pc.current?.connectionState === 'failed'){
                   // Possibly try ICE restart
                   // pc.current.restartIce();
                   alert("Connection failed. Please try rejoining.");
                   cleanupLocalState();
                   setView('lobby');
               }
           }
       };
       pc.current.oniceconnectionstatechange = () => {
           console.log("ICE connection state changed:", pc.current?.iceConnectionState);
       };
       pc.current.onsignalingstatechange = () => {
           console.log("Signaling state changed:", pc.current?.signalingState);
       };


      return true; // Success
    } catch (err) {
      console.error('Failed to get media/setup PC:', err);
      alert('Could not start. Please check permissions and try again.');
      return false; // Failure
    }
  };

  // --- Function to create and send an offer ---
  const createOffer = async (targetSocketId) => {
    if (!pc.current || pc.current.signalingState !== 'stable') {
      console.warn(`Cannot create offer in signaling state: ${pc.current?.signalingState}`);
      // Attempt to reset if necessary or just return
      return;
    };
    try {
      console.log('Creating offer for:', targetSocketId);
      const offer = await pc.current.createOffer();
      await pc.current.setLocalDescription(offer);

      socket.emit('offer', {
        target: targetSocketId,
        sdp: pc.current.localDescription, // Send the full description
      });
      console.log('Offer sent to:', targetSocketId);
    } catch (err) {
      console.error('Error creating offer:', err);
    }
  };

  // --- Function to create and send an answer ---
  const createAnswer = async (offerSdp) => {
    if (!pc.current) {
        console.error("Cannot create answer, PC not initialized");
        return;
    }
    try {
      console.log('Creating answer for:', otherUser.current?.id);
      // Ensure signaling state allows setting remote description
       // Reset if needed before setting remote description
      if (pc.current.signalingState !== 'stable' && pc.current.signalingState !== 'have-local-offer') {
            console.warn(`Signaling state is ${pc.current.signalingState}, attempting offer rollback before setting remote description.`);
            // A simple rollback approach
            await pc.current.setLocalDescription({ type: 'rollback' });
      }

      await pc.current.setRemoteDescription(new RTCSessionDescription(offerSdp));
      console.log("Remote description set from offer.");


      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);
      console.log("Local description set from answer.");

      if (otherUser.current?.id) {
          socket.emit('answer', {
            target: otherUser.current.id,
            sdp: pc.current.localDescription, // Send the full description
          });
          console.log('Answer sent to:', otherUser.current.id);
      } else {
          console.error("Cannot send answer, other user ID not known.");
      }
    } catch (err) {
      console.error('Error creating answer:', err);
    }
  };

  // --- Handle Create Room ---
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!userName.trim()) {
        alert("Please enter your name.");
        return;
    }

    // Generate a simple 6-char random ID
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Setup media *before* trying to create room on server
    const success = await setupMediaAndPeerConnection();

    if (success) {
      // Now that media is ready, tell server to create room
      socket.emit('create-room', { roomId: newRoomId, name: userName });
      // Wait for server confirmation ('room-created') before changing view
    } else {
        console.error("Media setup failed, cannot create room.");
        cleanupLocalState(); // Clean up if media failed
        setView('lobby');
    }
  };

  // --- Handle Join Room ---
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

    // Setup media *before* trying to join room on server
    const success = await setupMediaAndPeerConnection();

    if (success) {
      // Now that media is ready, tell server to join room
      socket.emit('join-room', { roomId: code, name: userName });
      // Wait for server confirmation ('room-joined' or 'room-full-or-invalid')
      // before changing view
    } else {
       console.error("Media setup failed, cannot join room.");
       cleanupLocalState(); // Clean up if media failed
       setView('lobby');
    }
  };

  // --- Handle Hang Up ---
  const handleHangUp = () => {
    console.log("Handling Hang Up...");

    if (roomId) {
      // Notify server (and thus the peer) that we are leaving
      console.log(`Emitting leave-room for room: ${roomId}`);
      socket.emit('leave-room', { roomId });
    }

    // --- Local Cleanup ---
    cleanupLocalState();
  };

  // --- Helper for local cleanup ---
  const cleanupLocalState = () => {
    console.log("Cleaning up local state...");
     // Close peer connection
    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }

    // Stop streams
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    setLocalStream(null);
    setRemoteStream(null); // Clear remote stream too

    // Clean up refs and state
    otherUser.current = null;
    setUsersInRoom([]);
    setRoomId('');
    // Keep userName, but clear joinCode
    setJoinCode('');
    setLocalUserRole('');
    setPeerLeft(false); // Reset peer left state
    // Reset controls
    setIsMicMuted(false);
    setIsCameraOff(false);
    setIsHandRaised(false);
    setRemoteMicMuted(false);
    setRemoteCameraOff(false);
    setRemoteHandRaised(false);

    // Go back to lobby
    setView('lobby');
  }


  // --- Media Toggle Functions ---
  const toggleMic = () => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
        const newState = !audioTrack.enabled;
        audioTrack.enabled = newState; // Directly enable/disable track
        const mutedState = !newState; // Muted is opposite of enabled
        setIsMicMuted(mutedState);
        console.log("Toggled mic:", mutedState);
        // Notify peer
        socket.emit('toggle-mic', { roomId, isMuted: mutedState });
    }
  };

  const toggleCamera = () => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
        const newState = !videoTrack.enabled;
        videoTrack.enabled = newState; // Directly enable/disable track
        const offState = !newState; // Off is opposite of enabled
        setIsCameraOff(offState);
        console.log("Toggled camera:", offState);
        // Notify peer
        socket.emit('toggle-camera', { roomId, isOff: offState });
    }
  };

  const toggleHand = () => {
    // Only allow interviewee to raise hand
    if (localUserRole !== 'Interviewee') return;

    const newState = !isHandRaised;
    setIsHandRaised(newState);
    console.log("Toggled hand:", newState);
    // Notify peer
    socket.emit('raise-hand', { roomId, isRaised: newState });
  };


  // --- Effect to assign local stream ---
  useEffect(() => {
    if (view === 'room' && localStream && localVideoRef.current) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
    } else if (view !== 'room' && localVideoRef.current) {
        // Clear video element if not in room
        localVideoRef.current.srcObject = null;
    }
  }, [view, localStream]);

  // --- Effect to assign remote stream ---
  useEffect(() => {
    if (view === 'room' && remoteStream && remoteVideoRef.current) {
      if (remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    } else if (view !== 'room' && remoteVideoRef.current) {
        // Clear video element if not in room
        remoteVideoRef.current.srcObject = null;
    }
  }, [view, remoteStream]);


  // --- Find user names ---
  const getLocalUserNameAndRole = () => {
      const name = usersInRoom.find(u => u.id === socket?.id)?.name || userName;
      return `${name} (${localUserRole || '...'})`;
  }
  const getRemoteUserNameAndRole = () => {
       const remoteUser = usersInRoom.find(u => u.id !== socket?.id);
       const name = remoteUser?.name || 'Peer';
       // Determine remote role based on local role
       const role = localUserRole === 'Interviewer' ? 'Interviewee' : localUserRole === 'Interviewee' ? 'Interviewer' : '...';
       return `${name} (${role})`;
  }


  // --- Render Functions for Each View ---
  const renderLobby = () => (
    <div className="lobby-container fade-in">
      <div className="lobby-card interactive-card glassmorphism"> {/* Added glassmorphism */}
        <h2 className="lobby-title">Interviewer</h2>
        <p className="lobby-description">Start a new session and guide the interview.</p>
        <button className="lobby-button primary" onClick={() => setView('create')}>
          Create Room
        </button>
      </div>
      <div className="lobby-card interactive-card glassmorphism"> {/* Added glassmorphism */}
        <h2 className="lobby-title">Interviewee</h2>
        <p className="lobby-description">Join an existing session using a code.</p>
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
        <p className="form-subtitle">Enter your name to start the session.</p>
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
        {/* Description removed for simplicity, can be added back */}
        <button type="submit" className="form-button primary">Start Session</button>
        <button type="button" className="back-button-form subtle" onClick={() => setView('lobby')}>
          ← Back to Lobby
        </button>
      </form>
    </div>
  );

  const renderJoinForm = () => (
    <div className="form-container fade-in">
      <form onSubmit={handleJoinRoom} className="room-form glassmorphism">
        <h2 className="form-title">Join Interview Room</h2>
        <p className="form-subtitle">Enter your name and the 6-character room code.</p>
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
            maxLength={6} // Enforce 6 characters
            style={{ textTransform: 'uppercase' }} // Style hint
          />
        </div>
        <button type="submit" className="form-button primary">Join Session</button>
        <button type="button" className="back-button-form subtle" onClick={() => setView('lobby')}>
          ← Back to Lobby
        </button>
      </form>
    </div>
  );

  const renderRoom = () => (
    <div className="room-container fade-in">
      <div className="room-header">
        {/* Only show Room Code to Interviewer */}
        {localUserRole === 'Interviewer' && (
            <h2 className="room-title">Room Code: <span className="room-code">{roomId}</span></h2>
        )}
        {/* Placeholder if Interviewee */}
         {localUserRole === 'Interviewee' && (
            <h2 className="room-title">Interview Session</h2>
        )}
        {/* Hang up button moved to control bar */}
      </div>
      <div className="video-grid">
        {/* Remote Participant */}
        <div className={`video-participant remote ${remoteCameraOff ? 'camera-off' : ''}`}>
           <div className="video-wrapper">
             <video
               key={remoteStream ? `remote-${remoteStream.id}` : 'no-stream-remote'} // More specific key
               ref={remoteVideoRef}
               id="remoteVideo"
               autoPlay
               playsInline
               // muted // Remote should NOT be muted by default
             ></video>
             {/* Show placeholder if camera is off or stream not ready */}
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
                {!peerLeft && ( // Only show icons if peer is present
                    <div className="status-icons">
                        {remoteMicMuted && <span className="icon" title="Mic Muted">🎤<span className="slash">/</span></span>}
                        {remoteCameraOff && <span className="icon" title="Camera Off">📷<span className="slash">/</span></span>}
                        {remoteHandRaised && <span className="icon hand" title="Hand Raised">✋</span>}
                    </div>
                )}
              </div>
           </div>
        </div>

        {/* Local Participant */}
        <div className={`video-participant local ${isCameraOff ? 'camera-off' : ''}`}>
           <div className="video-wrapper">
             <video
                key={localStream ? `local-${localStream.id}` : 'no-stream-local'} // More specific key
                ref={localVideoRef}
                id="localVideo"
                autoPlay
                playsInline
                muted // Always mute local video to prevent echo
             ></video>
              {isCameraOff && (
                <div className="video-placeholder">
                    <span className="placeholder-icon">👤</span>
                     <span className="placeholder-text">Camera Off</span>
                </div>
              )}
             <div className="participant-info local-info">
               <span className="participant-name">{getLocalUserNameAndRole()}</span>
                {/* Local status icons could be shown here too if needed */}
             </div>
           </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="control-bar glassmorphism">
         <button
           className={`control-button mic-button ${isMicMuted ? 'active' : ''}`}
           onClick={toggleMic}
           title={isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
           disabled={!localStream} // Disable if no stream
          >
           {/* Simple icons: Replace with SVGs or icon library for better visuals */}
           {isMicMuted ? '🎤❌' : '🎤'}
         </button>
         <button
           className={`control-button camera-button ${isCameraOff ? 'active' : ''}`}
           onClick={toggleCamera}
           title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
           disabled={!localStream} // Disable if no stream
          >
           {isCameraOff ? '📷❌' : '📷'}
         </button>
         {/* Only show Raise Hand button to Interviewee */}
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

  // --- Main Render Logic ---
  const renderView = () => {
    switch (view) {
      case 'lobby':
        return renderLobby();
      case 'create':
        return renderCreateForm();
      case 'join':
        return renderJoinForm();
      case 'room':
        // Only render room if local stream is ready (prevents errors)
        // Add check for socket connection too
        return socket?.connected && localStream ? renderRoom() : <div className="loading fade-in">Connecting...</div>;
      default:
        return renderLobby();
    }
  };

  return (
    <div className="mock-interview-page">
      <div className="mock-interview-header">
        {(view === 'lobby' || view === 'create' || view === 'join') && ( // Show back button on forms too
          <button className="back-button subtle" onClick={() => view === 'lobby' ? navigate('/') : setView('lobby')}>
            ← Back
          </button>
        )}
        <h1 className="mock-interview-title">Live Mock Interview</h1>
        {view === 'lobby' && (
          <p className="mock-interview-subtitle">Practice 1-on-1 with another user in a live video call.</p>
        )}
      </div>

      <div className="mock-interview-content">
        {renderView()}
      </div>
    </div>
  );
};

export default MockInterview;

