# Retro Ludo Game

A multiplayer retro-style Ludo game built with Node.js, Socket.IO, and HTML5 Canvas.

## Features

- User authentication (register/login)
- Create and join game rooms
- Real-time multiplayer gameplay
- Retro pixel-art styling
- Player statistics and game history
- Private room invitations
- Responsive design

## Installation

1. Install Node.js (https://nodejs.org/)
2. Navigate to the project directory
3. Install dependencies:
   ```
   npm install
   ```

## Running the Game

1. Start the server:
   ```
   npm start
   ```
   
2. Open your browser and go to `http://localhost:3000`

## Development

For development with auto-restart:
```
npm run dev
```

## Game Rules

- 2-4 players can join a game
- Roll dice to move pieces
- Get all 4 pieces to the center to win
- Roll 6 to get pieces out of home
- Capture opponent pieces by landing on them

## File Structure

- `server.js` - Main server file
- `gameManager.js` - Game logic and room management
- `database.js` - SQLite database operations
- `authManager.js` - User authentication
- `public/` - Frontend files
  - `index.html` - Main HTML file
  - `css/style.css` - Retro styling
  - `js/app.js` - Main application logic
  - `js/game.js` - Game board rendering

## Technologies Used

- Backend: Node.js, Express, Socket.IO, SQLite
- Frontend: HTML5, CSS3, JavaScript, Canvas API
- Authentication: JWT, bcrypt