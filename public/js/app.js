class LudoApp {
  constructor() {
    this.socket = io();
    this.currentUser = null;
    this.currentRoom = null;
    this.token = localStorage.getItem('ludoToken');
    
    this.initializeEventListeners();
    this.initializeSocketListeners();
    
    if (this.token) {
      this.autoLogin();
    }
  }

  initializeEventListeners() {
    // Auth forms
    document.getElementById('login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.login();
    });

    document.getElementById('register-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.register();
    });

    document.getElementById('create-room-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.createRoom();
    });

    // Search functionality
    document.getElementById('search-room').addEventListener('input', (e) => {
      this.filterRooms(e.target.value);
    });

    document.getElementById('search-players').addEventListener('input', (e) => {
      this.filterPlayers(e.target.value);
    });
  }

  initializeSocketListeners() {
    this.socket.on('connect', () => {
      console.log('Connected to server');
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.showNotification('Connection lost. Trying to reconnect...', 'error');
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.showNotification('Failed to connect to server', 'error');
    });
    
    this.socket.on('room-created', (data) => {
      this.currentRoom = data.room;
      this.showGameRoom();
      this.updateGameRoom();
    });

    this.socket.on('player-joined', (data) => {
      this.currentRoom = data.room;
      this.updateGameRoom();
      this.showNotification(`${data.newPlayer.name} joined the room`);
    });

    this.socket.on('player-left', (data) => {
      this.currentRoom = data.room;
      this.updateGameRoom();
    });

    this.socket.on('game-invitation', (data) => {
      this.showInvitation(data);
    });

    this.socket.on('dice-rolled', (data) => {
      this.updateDiceDisplay(data);
    });

    this.socket.on('piece-moved', (data) => {
      this.updateBoard(data);
    });

    this.socket.on('turn-changed', (data) => {
      this.updateCurrentPlayer(data);
    });

    this.socket.on('game-won', (data) => {
      this.showGameResult(data);
    });

    this.socket.on('player-ready-update', (data) => {
      this.currentRoom = data.room;
      this.updateGameRoom();
    });

    this.socket.on('game-started', (data) => {
      this.currentRoom = data.room;
      this.showNotification('Game Started! Roll dice to begin.', 'success');
      this.updateGameRoom();
    });

    this.socket.on('room-list-updated', (rooms) => {
      this.updateRoomsList(rooms);
    });

    this.socket.on('error', (data) => {
      this.showNotification(data.message, 'error');
    });
  }

  async login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      
      if (data.success) {
        this.currentUser = data.user;
        this.token = data.token;
        localStorage.setItem('ludoToken', this.token);
        this.showMainMenu();
        this.updatePlayerInfo();
      } else {
        this.showNotification(data.error || 'Login failed', 'error');
      }
    } catch (error) {
      this.showNotification('Network error', 'error');
    }
  }

  async register() {
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();
      
      if (data.success) {
        this.currentUser = data.user;
        this.token = data.token;
        localStorage.setItem('ludoToken', this.token);
        this.showMainMenu();
        this.updatePlayerInfo();
      } else {
        this.showNotification(data.error || 'Registration failed', 'error');
      }
    } catch (error) {
      this.showNotification('Network error', 'error');
    }
  }

  createRoom() {
    const roomName = document.getElementById('room-name').value;
    const isPrivate = document.getElementById('private-room').checked;

    this.socket.emit('create-room', {
      roomName,
      playerName: this.currentUser.username,
      userId: this.currentUser.id,
      isPrivate
    });
  }
  
  startSinglePlayer() {
    this.socket.emit('create-room', {
      roomName: `${this.currentUser.username} vs Computer`,
      playerName: this.currentUser.username,
      userId: this.currentUser.id,
      isPrivate: true,
      singlePlayer: true
    });
  }

  joinRoom(roomId) {
    this.socket.emit('join-room', {
      roomId,
      playerName: this.currentUser.username,
      userId: this.currentUser.id
    });
  }

  async loadRooms() {
    try {
      const response = await fetch('/api/rooms');
      const rooms = await response.json();
      this.updateRoomsList(rooms);
    } catch (error) {
      this.showNotification('Failed to load rooms', 'error');
    }
  }

  async loadPlayers() {
    try {
      const response = await fetch('/api/players');
      const players = await response.json();
      this.updatePlayersList(players);
    } catch (error) {
      this.showNotification('Failed to load players', 'error');
    }
  }

  async loadHistory() {
    try {
      const response = await fetch(`/api/history/${this.currentUser.id}`);
      const history = await response.json();
      this.updateHistoryList(history);
    } catch (error) {
      this.showNotification('Failed to load history', 'error');
    }
  }

  updateRoomsList(rooms) {
    const roomsList = document.getElementById('rooms-list');
    roomsList.innerHTML = '';

    rooms.forEach(room => {
      const roomItem = document.createElement('div');
      roomItem.className = 'room-item';
      roomItem.innerHTML = `
        <div>
          <strong>${room.name}</strong><br>
          <small>${room.players}/${room.maxPlayers} players</small>
        </div>
        <button class="retro-btn" onclick="app.joinRoom('${room.id}')">JOIN</button>
      `;
      roomsList.appendChild(roomItem);
    });
  }

  updatePlayersList(players) {
    const playersList = document.getElementById('players-list');
    playersList.innerHTML = '';

    players.forEach(player => {
      const playerItem = document.createElement('div');
      playerItem.className = 'player-item';
      playerItem.innerHTML = `
        <div>
          <strong>${player.username}</strong><br>
          <small>Games: ${player.games_played} | Wins: ${player.games_won}</small>
        </div>
        <button class="retro-btn" onclick="app.invitePlayer(${player.id})">INVITE</button>
      `;
      playersList.appendChild(playerItem);
    });
  }

  updateHistoryList(history) {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';

    history.forEach(game => {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      historyItem.innerHTML = `
        <div>
          <strong>${game.room_name}</strong><br>
          <small>${new Date(game.finished_at).toLocaleDateString()} - ${game.result}</small>
        </div>
      `;
      historyList.appendChild(historyItem);
    });
  }

  updateGameRoom() {
    if (!this.currentRoom) return;

    document.getElementById('room-title').textContent = this.currentRoom.name;
    
    const playersPanel = document.getElementById('players-in-room');
    playersPanel.innerHTML = '';

    this.currentRoom.players.forEach(player => {
      const playerCard = document.createElement('div');
      playerCard.className = 'player-card';
      playerCard.style.borderColor = player.color;
      playerCard.innerHTML = `
        <div>${player.name}</div>
        <div style="color: ${player.color}">${player.color.toUpperCase()}</div>
        <div>${player.isReady ? '✓ READY' : 'NOT READY'}</div>
      `;
      playersPanel.appendChild(playerCard);
    });
    
    // Update ready button
    const readyBtn = document.getElementById('ready-btn');
    const currentPlayer = this.currentRoom.players.find(p => p.socketId === this.socket.id);
    if (readyBtn && currentPlayer) {
      readyBtn.textContent = currentPlayer.isReady ? 'READY ✓' : 'READY';
      readyBtn.style.background = currentPlayer.isReady ? '#00ff00' : 'transparent';
      readyBtn.style.color = currentPlayer.isReady ? '#000' : '#00ff00';
    }
    
    // Show/hide dice button based on game state and current player
    const diceBtn = document.getElementById('dice-btn');
    if (diceBtn) {
      const isMyTurn = this.currentRoom.gameState === 'playing' && 
                      this.currentRoom.players[this.currentRoom.currentPlayer]?.socketId === this.socket.id;
      diceBtn.style.display = this.currentRoom.gameState === 'playing' ? 'inline-block' : 'none';
      diceBtn.disabled = !isMyTurn;
      diceBtn.style.opacity = isMyTurn ? '1' : '0.5';
      console.log('Dice button - gameState:', this.currentRoom.gameState, 'isMyTurn:', isMyTurn);
    }

    if (this.currentRoom.gameState === 'playing') {
      this.updateCurrentPlayer({
        currentPlayer: this.currentRoom.players[this.currentRoom.currentPlayer].name
      });
    }
  }

  updateCurrentPlayer(data) {
    document.getElementById('current-player').textContent = `Current: ${data.currentPlayer}`;
  }

  updateDiceDisplay(data) {
    document.getElementById('dice-value').textContent = `Rolled: ${data.value}`;
    
    if (data.canMove && data.movablePieces && window.ludoGame) {
      const currentPlayer = this.currentRoom.players[this.currentRoom.currentPlayer];
      if (currentPlayer.socketId === this.socket.id) {
        // Highlight movable pieces
        window.ludoGame.highlightMovablePieces(currentPlayer.color, data.movablePieces);
        
        if (data.movablePieces.length === 1) {
          this.showNotification('Auto-moving your only available piece...', 'info');
        } else {
          this.showNotification('Select a highlighted piece to move', 'info');
        }
      }
    }
    
    if (!data.canMove) {
      this.showNotification('No valid moves - turn passed', 'error');
      setTimeout(() => {
        document.getElementById('dice-value').textContent = '';
      }, 2000);
    }
  }

  updateBoard(data) {
    // This will be handled by the game.js file
    if (window.ludoGame) {
      window.ludoGame.updatePiecePosition(data);
      window.ludoGame.clearHighlights();
    }
    document.getElementById('dice-value').textContent = '';
  }

  showGameResult(data) {
    this.showNotification(`🎉 ${data.winner} wins the game!`, 'success');
  }

  showInvitation(data) {
    const accept = confirm(`${data.inviterName} invited you to join "${data.roomName}". Accept?`);
    if (accept) {
      this.joinRoom(data.roomId);
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px;
      background: ${type === 'error' ? '#ff4444' : type === 'success' ? '#44ff44' : '#4444ff'};
      color: white;
      border-radius: 5px;
      z-index: 1000;
      font-family: 'Press Start 2P';
      font-size: 0.7rem;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  updatePlayerInfo() {
    if (this.currentUser) {
      document.getElementById('player-name').textContent = `Welcome, ${this.currentUser.username}!`;
    }
  }

  filterRooms(query) {
    const rooms = document.querySelectorAll('.room-item');
    rooms.forEach(room => {
      const roomName = room.querySelector('strong').textContent.toLowerCase();
      room.style.display = roomName.includes(query.toLowerCase()) ? 'flex' : 'none';
    });
  }

  filterPlayers(query) {
    const players = document.querySelectorAll('.player-item');
    players.forEach(player => {
      const playerName = player.querySelector('strong').textContent.toLowerCase();
      player.style.display = playerName.includes(query.toLowerCase()) ? 'flex' : 'none';
    });
  }

  autoLogin() {
    // Auto-login logic would go here
    // For now, just show main menu if token exists
    this.showMainMenu();
  }

  logout() {
    this.currentUser = null;
    this.token = null;
    localStorage.removeItem('ludoToken');
    this.showLoginScreen();
  }

  // Screen navigation methods
  showLoginScreen() {
    this.hideAllScreens();
    document.getElementById('login-screen').classList.add('active');
  }

  showMainMenu() {
    this.hideAllScreens();
    document.getElementById('main-menu').classList.add('active');
    this.updatePlayerInfo();
  }

  showCreateRoom() {
    this.hideAllScreens();
    document.getElementById('create-room').classList.add('active');
  }

  showJoinRoom() {
    this.hideAllScreens();
    document.getElementById('join-room').classList.add('active');
    this.loadRooms();
  }

  showDashboard() {
    this.hideAllScreens();
    document.getElementById('dashboard').classList.add('active');
    this.loadPlayers();
  }

  showHistory() {
    this.hideAllScreens();
    document.getElementById('history').classList.add('active');
    this.loadHistory();
  }

  showGameRoom() {
    this.hideAllScreens();
    document.getElementById('game-room').classList.add('active');
    
    // Initialize the game board
    setTimeout(() => {
      if (window.LudoGame) {
        window.ludoGame = new LudoGame('ludo-board');
        if (this.currentRoom) {
          window.ludoGame.initializePieces(this.currentRoom);
        }
      }
    }, 100);
  }

  hideAllScreens() {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });
  }
}

// Global functions for HTML onclick events
function showLogin() {
  document.getElementById('login-form').classList.remove('hidden');
  document.getElementById('register-form').classList.add('hidden');
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
}

function showRegister() {
  document.getElementById('register-form').classList.remove('hidden');
  document.getElementById('login-form').classList.add('hidden');
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
}

function showMainMenu() { app.showMainMenu(); }
function startSinglePlayer() { app.startSinglePlayer(); }
function showCreateRoom() { app.showCreateRoom(); }
function showJoinRoom() { app.showJoinRoom(); }
function showDashboard() { app.showDashboard(); }
function showHistory() { app.showHistory(); }
function logout() { app.logout(); }
function leaveRoom() { app.showMainMenu(); }

function rollDice() {
  console.log('Roll dice clicked');
  if (app.currentRoom) {
    console.log('Emitting roll-dice for room:', app.currentRoom.id);
    app.socket.emit('roll-dice', { roomId: app.currentRoom.id });
  } else {
    console.log('No current room');
  }
}

function showInviteModal() {
  document.getElementById('invite-modal').classList.add('active');
}

function closeInviteModal() {
  document.getElementById('invite-modal').classList.remove('active');
}

function sendInvite() {
  const userId = document.getElementById('invite-user-id').value;
  if (userId && app.currentRoom) {
    app.socket.emit('invite-player', {
      roomId: app.currentRoom.id,
      targetUserId: parseInt(userId)
    });
    closeInviteModal();
  }
}

function searchPlayers() {
  app.loadPlayers();
}

function toggleReady() {
  if (app.currentRoom) {
    app.socket.emit('player-ready', { roomId: app.currentRoom.id });
  }
}

// Initialize the app
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new LudoApp();
});