# MeetSpace - MERN Zoom Clone

MeetSpace is a full-stack Zoom-like video meeting app built with MongoDB, Express, React (Vite), and Node.js using strict MVC architecture on the backend.

## Features

- JWT email/password authentication
- Meeting creation and room join by `roomId`
- WebRTC mesh P2P video/audio calls (STUN only, no TURN)
- Real-time chat with Socket.IO
- Live synchronized whiteboard using Fabric.js
- Emoji reactions with broadcast animations
- Live polls with one vote per user
- Screen sharing with track replacement
- Responsive mobile-friendly UI with Tailwind CSS v4

## Project Structure

```
zoom_clone/
├── server/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middlewares/
│   ├── config/
│   ├── socket/
│   ├── .env
│   ├── package.json
│   └── server.js
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .env
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
└── README.md
```

## Environment Variables

### `server/.env`

```env
MONGODB_URI=your_mongodb_atlas_connection_string_here
JWT_SECRET=meetspace_super_secret_key_2024
PORT=5000
CLIENT_URL=http://localhost:5173
```

### `client/.env`

```env
VITE_SERVER_URL=http://localhost:5000
```

## Setup Instructions

1. Install backend dependencies:
   - `cd server`
   - `npm install`
2. Install frontend dependencies:
   - `cd ../client`
   - `npm install`
3. Run backend:
   - `cd ../server`
   - `npm run dev`
4. Run frontend:
   - `cd ../client`
   - `npm run dev`
5. Open `http://localhost:5173`

## API Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (protected)
- `POST /api/meetings/create` (protected)
- `GET /api/meetings/:roomId` (protected)

## Socket Events

- `join-room`, `leave-room`
- `offer`, `answer`, `ice-candidate`
- `send-message`, `receive-message`
- `whiteboard-draw`, `whiteboard-clear`
- `send-reaction`, `receive-reaction`
- `create-poll`, `vote-poll`, `poll-update`
- `screen-share-start`, `screen-share-stop`
- `user-joined`, `user-left`

## Notes

- Plain JavaScript only (no TypeScript)
- No recording feature
- No TURN server packages included
