const { v4: uuidv4 } = require('uuid');

class GameManager {
  constructor(io, database = null) {
    this.io = io;
    this.db = database;
    this.rooms = new Map();
    this.playerSockets = new Map();
  }

  createRoom(socket, { roomName, playerName, userId, isPrivate = false, singlePlayer = false }) {
    const roomId = uuidv4();
    const players = [{
      id: userId,
      name: playerName,
      socketId: socket.id,
      color: 'red',
      pieces: this.initializePieces('red'),
      isReady: false
    }];
    
    if (singlePlayer) {
      players.push({
        id: 'ai',
        name: 'Computer',
        socketId: 'ai',
        color: 'blue',
        pieces: this.initializePieces('blue'),
        isReady: true,
        isAI: true
      });
    }
    
    const room = {
      id: roomId,
      name: roomName,
      players,
      gameState: singlePlayer ? 'playing' : 'waiting',
      currentPlayer: 0,
      isPrivate,
      singlePlayer,
      createdAt: new Date()
    };

    this.rooms.set(roomId, room);
    this.playerSockets.set(socket.id, { roomId, userId });
    
    socket.join(roomId);
    socket.emit('room-created', { roomId, room });
    
    if (!isPrivate) {
      socket.broadcast.emit('room-list-updated', this.getPublicRooms());
    }
  }

  joinRoom(socket, { roomId, playerName, userId }) {
    const room = this.rooms.get(roomId);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    if (room.players.length >= 4) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }

    if (room.gameState !== 'waiting') {
      socket.emit('error', { message: 'Game already in progress' });
      return;
    }

    const colors = ['red', 'blue', 'green', 'yellow'];
    const usedColors = room.players.map(p => p.color);
    const availableColor = colors.find(c => !usedColors.includes(c));

    const player = {
      id: userId,
      name: playerName,
      socketId: socket.id,
      color: availableColor,
      pieces: this.initializePieces(availableColor),
      isReady: false
    };

    room.players.push(player);
    this.playerSockets.set(socket.id, { roomId, userId });
    
    socket.join(roomId);
    this.io.to(roomId).emit('player-joined', { room, newPlayer: player });
    
    if (!room.isPrivate) {
      socket.broadcast.emit('room-list-updated', this.getPublicRooms());
    }
  }

  invitePlayer(socket, { roomId, targetUserId }) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const inviterSocket = this.playerSockets.get(socket.id);
    if (!inviterSocket || inviterSocket.roomId !== roomId) return;

    // Find target player's socket
    for (let [socketId, playerData] of this.playerSockets) {
      if (playerData.userId === targetUserId) {
        this.io.to(socketId).emit('game-invitation', {
          roomId,
          roomName: room.name,
          inviterName: room.players.find(p => p.socketId === socket.id)?.name
        });
        break;
      }
    }
  }

  rollDice(socket, { roomId }) {
    const room = this.rooms.get(roomId);
    if (!room || room.gameState !== 'playing') return;

    const currentPlayer = room.players[room.currentPlayer];
    if (currentPlayer.socketId !== socket.id) return;

    const diceValue = Math.floor(Math.random() * 6) + 1;
    room.lastDiceRoll = diceValue;
    room.canMove = true;

    this.io.to(roomId).emit('dice-rolled', {
      player: currentPlayer.name,
      value: diceValue,
      canMove: this.getMovablePieces(currentPlayer, diceValue).length > 0
    });

    // Auto-pass turn if no moves available
    if (this.getMovablePieces(currentPlayer, diceValue).length === 0) {
      setTimeout(() => this.nextTurn(roomId), 2000);
    }
  }

  movePiece(socket, { roomId, pieceIndex }) {
    const room = this.rooms.get(roomId);
    if (!room || room.gameState !== 'playing' || !room.canMove) return;

    const currentPlayer = room.players[room.currentPlayer];
    if (currentPlayer.socketId !== socket.id) return;

    const piece = currentPlayer.pieces[pieceIndex];
    const diceValue = room.lastDiceRoll;

    if (!this.isValidMove(piece, diceValue, currentPlayer.color)) return;

    // Move piece
    const oldPosition = piece.position;
    piece.position = this.calculateNewPosition(piece, diceValue, currentPlayer.color);
    
    // Check for captures
    this.checkCaptures(room, currentPlayer, piece);
    
    // Check for win
    if (this.checkWin(currentPlayer)) {
      room.gameState = 'finished';
      room.winner = currentPlayer;
      this.io.to(roomId).emit('game-won', { winner: currentPlayer.name });
      this.saveGameResult(room);
      return;
    }

    this.io.to(roomId).emit('piece-moved', {
      player: currentPlayer.name,
      pieceIndex,
      oldPosition,
      newPosition: piece.position
    });

    // Next turn (unless rolled 6)
    if (diceValue !== 6) {
      this.nextTurn(roomId);
    } else {
      room.canMove = false;
    }
  }

  initializePieces(color) {
    const homePositions = {
      red: [1, 2, 8, 9],
      blue: [5, 6, 12, 13],
      green: [89, 90, 96, 97],
      yellow: [85, 86, 92, 93]
    };

    return homePositions[color].map(pos => ({
      position: pos,
      isHome: true,
      isFinished: false
    }));
  }

  getMovablePieces(player, diceValue) {
    return player.pieces.filter(piece => {
      if (piece.isFinished) return false;
      if (piece.isHome && diceValue !== 6) return false;
      return true;
    });
  }

  isValidMove(piece, diceValue, color) {
    if (piece.isFinished) return false;
    if (piece.isHome && diceValue !== 6) return false;
    return true;
  }

  calculateNewPosition(piece, diceValue, color) {
    if (piece.isHome) {
      const startPositions = { red: 14, blue: 27, green: 40, yellow: 1 };
      piece.isHome = false;
      return startPositions[color];
    }
    
    return (piece.position + diceValue) % 52;
  }

  checkCaptures(room, currentPlayer, movedPiece) {
    room.players.forEach(player => {
      if (player === currentPlayer) return;
      
      player.pieces.forEach(piece => {
        if (!piece.isHome && !piece.isFinished && piece.position === movedPiece.position) {
          // Send piece back home
          const homePositions = {
            red: [1, 2, 8, 9],
            blue: [5, 6, 12, 13],
            green: [89, 90, 96, 97],
            yellow: [85, 86, 92, 93]
          };
          
          const availableHome = homePositions[player.color].find(pos => 
            !player.pieces.some(p => p.position === pos && p.isHome)
          );
          
          piece.position = availableHome;
          piece.isHome = true;
        }
      });
    });
  }

  checkWin(player) {
    return player.pieces.every(piece => piece.isFinished);
  }

  nextTurn(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.currentPlayer = (room.currentPlayer + 1) % room.players.length;
    room.canMove = false;
    
    const currentPlayer = room.players[room.currentPlayer];
    
    this.io.to(roomId).emit('turn-changed', {
      currentPlayer: currentPlayer.name,
      playerIndex: room.currentPlayer
    });
    
    // AI turn
    if (currentPlayer.isAI) {
      setTimeout(() => this.aiTurn(roomId), 1000);
    }
  }

  handleDisconnect(socket) {
    const playerData = this.playerSockets.get(socket.id);
    if (!playerData) return;

    const room = this.rooms.get(playerData.roomId);
    if (room) {
      room.players = room.players.filter(p => p.socketId !== socket.id);
      
      if (room.players.length === 0) {
        this.rooms.delete(playerData.roomId);
      } else {
        this.io.to(playerData.roomId).emit('player-left', { room });
      }
    }

    this.playerSockets.delete(socket.id);
  }

  getPublicRooms() {
    return Array.from(this.rooms.values())
      .filter(room => !room.isPrivate && room.gameState === 'waiting')
      .map(room => ({
        id: room.id,
        name: room.name,
        players: room.players.length,
        maxPlayers: 4,
        createdAt: room.createdAt
      }));
  }

  async saveGameResult(room) {
    if (!this.db) return;
    
    try {
      const gameData = {
        room_name: room.name,
        players: room.players.map(p => ({ id: p.id, name: p.name, color: p.color })),
        winner_id: room.winner.id,
        game_state: room.gameState
      };
      
      await this.db.saveGame(gameData);
      
      // Update player stats
      for (const player of room.players) {
        if (player.id !== 'ai') {
          const won = player.id === room.winner.id;
          await this.db.updatePlayerStats(player.id, won, 0);
        }
      }
    } catch (error) {
      console.error('Error saving game result:', error);
    }
  }
  
  aiTurn(roomId) {
    const room = this.rooms.get(roomId);
    if (!room || room.gameState !== 'playing') return;
    
    const aiPlayer = room.players[room.currentPlayer];
    if (!aiPlayer.isAI) return;
    
    // AI rolls dice
    const diceValue = Math.floor(Math.random() * 6) + 1;
    room.lastDiceRoll = diceValue;
    room.canMove = true;
    
    this.io.to(roomId).emit('dice-rolled', {
      player: aiPlayer.name,
      value: diceValue,
      canMove: true
    });
    
    // AI makes move after delay
    setTimeout(() => {
      const movablePieces = this.getMovablePieces(aiPlayer, diceValue);
      
      if (movablePieces.length > 0) {
        // Simple AI: prioritize getting pieces out, then move randomly
        let pieceIndex = 0;
        const homePieces = aiPlayer.pieces.filter((p, i) => p.isHome && movablePieces.includes(i));
        
        if (homePieces.length > 0 && diceValue === 6) {
          pieceIndex = aiPlayer.pieces.findIndex(p => p.isHome);
        } else {
          pieceIndex = movablePieces[Math.floor(Math.random() * movablePieces.length)];
        }
        
        this.aiMovePiece(roomId, pieceIndex);
      } else {
        this.nextTurn(roomId);
      }
    }, 1500);
  }
  
  aiMovePiece(roomId, pieceIndex) {
    const room = this.rooms.get(roomId);
    if (!room || !room.canMove) return;
    
    const aiPlayer = room.players[room.currentPlayer];
    const piece = aiPlayer.pieces[pieceIndex];
    const diceValue = room.lastDiceRoll;
    
    if (!this.isValidMove(piece, diceValue, aiPlayer.color)) return;
    
    const oldPosition = piece.position;
    piece.position = this.calculateNewPosition(piece, diceValue, aiPlayer.color);
    
    this.checkCaptures(room, aiPlayer, piece);
    
    if (this.checkWin(aiPlayer)) {
      room.gameState = 'finished';
      room.winner = aiPlayer;
      this.io.to(roomId).emit('game-won', { winner: aiPlayer.name });
      this.saveGameResult(room);
      return;
    }
    
    this.io.to(roomId).emit('piece-moved', {
      player: aiPlayer.name,
      pieceIndex,
      oldPosition,
      newPosition: piece.position
    });
    
    if (diceValue !== 6) {
      this.nextTurn(roomId);
    } else {
      room.canMove = false;
      setTimeout(() => this.aiTurn(roomId), 1000);
    }
  }
}

module.exports = GameManager;