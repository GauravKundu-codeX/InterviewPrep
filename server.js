import express from 'express';
import http from 'http';
import { Server } from "socket.io";
import cors from 'cors';

const app = express();
app.use(cors()); // Allow requests from your React app

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins (for testing) - Change in production
    methods: ["GET", "POST"]
  }
});

const PORT = 3001; // We'll run this on port 3001
let rooms = {}; // Store room data: { roomId: [{id: socketId, name: userName}, ...] }

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // --- 1. CREATE ROOM ---
  // Data: { roomId: string, name: string }
  socket.on('create-room', ({ roomId, name }) => {
    if (!rooms[roomId]) {
      rooms[roomId] = [{ id: socket.id, name: name }];
      socket.join(roomId);
      console.log(`Room created: ${roomId} by ${name} (${socket.id})`);
      // Send back creator info (including role)
      socket.emit('room-created', { roomId, userRole: 'Interviewer', users: rooms[roomId] });
    } else {
      socket.emit('error', 'Room already exists'); // Should ideally not happen with random IDs
    }
  });

  // --- 2. JOIN ROOM ---
  // Data: { roomId: string, name: string }
  socket.on('join-room', ({ roomId, name }) => {
    const room = rooms[roomId];
    if (room && room.length < 2) {
      room.push({ id: socket.id, name: name });
      socket.join(roomId);
      console.log(`User ${name} (${socket.id}) joined room ${roomId}`);

      const creator = room[0]; // First user is always the creator (Interviewer)
      const joiner = room[1]; // Second user is the joiner (Interviewee)

      // Send joiner their info (including role and list of users)
      socket.emit('room-joined', { roomId, userRole: 'Interviewee', users: room });

      // Tell the creator that someone has joined (send joiner's info and full user list)
      io.to(creator.id).emit('user-joined', { joinerId: joiner.id, joinerName: joiner.name, users: room });

    } else if (room && room.length >= 2) {
      socket.emit('room-full-or-invalid', 'Room is full');
    } else {
      socket.emit('room-full-or-invalid', 'Room not found');
    }
  });

  // --- 3. WebRTC Signaling (Offer, Answer, ICE Candidates) ---
  socket.on('offer', (payload) => {
    // payload: { target: socketId, sdp: RTCSessionDescription }
    console.log(`Offer from ${socket.id} to ${payload.target}`);
    io.to(payload.target).emit('offer', {
      sdp: payload.sdp,
      sender: socket.id
    });
  });

  socket.on('answer', (payload) => {
    // payload: { target: socketId, sdp: RTCSessionDescription }
    console.log(`Answer from ${socket.id} to ${payload.target}`);
    io.to(payload.target).emit('answer', {
      sdp: payload.sdp,
      sender: socket.id
    });
  });

  socket.on('ice-candidate', (payload) => {
    // payload: { target: socketId, candidate: RTCIceCandidate }
    // Sending directly to target instead of broadcasting to room
    console.log(`ICE candidate from ${socket.id} to ${payload.target}`);
    io.to(payload.target).emit('ice-candidate', {
      candidate: payload.candidate,
      sender: socket.id
    });
  });

  // --- 4. In-Call Controls ---
  socket.on('toggle-mic', ({ roomId, isMuted }) => {
    console.log(`User ${socket.id} in room ${roomId} toggled mic: ${isMuted}`);
    // Broadcast to others in the room
    socket.to(roomId).emit('peer-mic-toggle', { senderId: socket.id, isMuted });
  });

  socket.on('toggle-camera', ({ roomId, isOff }) => {
    console.log(`User ${socket.id} in room ${roomId} toggled camera: ${isOff}`);
    socket.to(roomId).emit('peer-camera-toggle', { senderId: socket.id, isOff });
  });

  socket.on('raise-hand', ({ roomId, isRaised }) => {
    console.log(`User ${socket.id} in room ${roomId} toggled hand: ${isRaised}`);
    socket.to(roomId).emit('peer-hand-toggle', { senderId: socket.id, isRaised });
  });

  // --- 5. LEAVE ROOM / DISCONNECT ---
  // Data: { roomId: string }
  socket.on('leave-room', ({ roomId }) => {
    handleLeave(roomId, socket, 'leave-room event');
  });

  socket.on('disconnect', (reason) => {
    console.log('User disconnected:', socket.id, 'Reason:', reason);
    // Find which room the user was in and notify the other person
    for (const roomId in rooms) {
       // Check if the disconnected socket was in this room
      const userIndex = rooms[roomId]?.findIndex(user => user.id === socket.id);
      if (userIndex !== -1) {
          handleLeave(roomId, socket, 'disconnect event');
          break; // Exit loop once found
      }
    }
  });

  function handleLeave(roomId, leavingSocket, eventSource) {
    const room = rooms[roomId];
    if (room) {
      // Find the index of the leaving user
      const userIndex = room.findIndex(user => user.id === leavingSocket.id);

      if (userIndex !== -1) {
        const leavingUserName = room[userIndex].name;
        // Remove user from room array
        room.splice(userIndex, 1);
        console.log(`User ${leavingUserName} (${leavingSocket.id}) left room ${roomId} due to ${eventSource}`);
        leavingSocket.leave(roomId); // Make socket leave the room

        // Notify the remaining user (if any)
        if (room.length > 0) {
          const remainingUser = room[0];
          console.log(`Notifying remaining user ${remainingUser.name} (${remainingUser.id}) that ${leavingSocket.id} left`);
          io.to(remainingUser.id).emit('peer-left', { disconnectedUserId: leavingSocket.id, disconnectedUserName: leavingUserName });
        } else {
          // If room is now empty, delete it
          console.log(`Room ${roomId} is empty, deleting.`);
          delete rooms[roomId];
        }
      } else {
        // User wasn't found in this room, might happen if disconnect fires after leave-room
        console.log(`User ${leavingSocket.id} not found in room ${roomId} during ${eventSource}. Room state:`, room);
      }
    } else {
        console.log(`Room ${roomId} not found during ${eventSource} for user ${leavingSocket.id}.`);
    }
  }
});

server.listen(PORT, () => {
  console.log(`Socket.IO server running on http://localhost:${PORT}`);
});

