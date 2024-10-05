"use client";

import { useState } from 'react';

const Home = () => {
  const [username, setUsername] = useState<string>('');
  const [color, setColor] = useState<string>('#ff0000');
  const [roomId, setRoomId] = useState<string>('lobby');
  const [message, setMessage] = useState<string | null>(null);

  const connectToRoom = async () => {
    if (!username.trim() || !roomId.trim()) {
      alert('Please enter both username and room ID');
      return;
    }

    try {
      const res = await fetch('/api/mpp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channelName: roomId }),
      });

      const data = await res.json();
      setMessage(data.message);
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  return (
    <div>
      <h1>MPP Room Join</h1>
      <div>
        <label htmlFor="username">Username:</label>
        <input
          type="text"
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="color">Color:</label>
        <input
          type="color"
          id="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="roomId">Room ID:</label>
        <input
          type="text"
          id="roomId"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
      </div>
      <button onClick={connectToRoom}>Join Room</button>
      {message && <p>{message}</p>}
    </div>
  );
};

export default Home;
