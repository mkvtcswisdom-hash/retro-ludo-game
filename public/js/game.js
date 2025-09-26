class LudoGame {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.boardSize = 600;
    this.cellSize = this.boardSize / 15;
    
    this.colors = {
      red: '#ff4444',
      blue: '#4444ff',
      green: '#44ff44',
      yellow: '#ffff44'
    };
    
    this.pieces = {
      red: [],
      blue: [],
      green: [],
      yellow: []
    };
    
    this.setupCanvas();
    this.drawBoard();
    this.setupClickHandler();
  }

  setupCanvas() {
    this.canvas.width = this.boardSize;
    this.canvas.height = this.boardSize;
    this.canvas.style.border = '2px solid #000';
  }

  drawBoard() {
    this.ctx.clearRect(0, 0, this.boardSize, this.boardSize);
    
    // Draw background
    this.ctx.fillStyle = '#f0f0f0';
    this.ctx.fillRect(0, 0, this.boardSize, this.boardSize);
    
    // Draw grid
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 1;
    
    for (let i = 0; i <= 15; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(i * this.cellSize, 0);
      this.ctx.lineTo(i * this.cellSize, this.boardSize);
      this.ctx.stroke();
      
      this.ctx.beginPath();
      this.ctx.moveTo(0, i * this.cellSize);
      this.ctx.lineTo(this.boardSize, i * this.cellSize);
      this.ctx.stroke();
    }
    
    // Draw home areas
    this.drawHomeArea('red', 0, 0);
    this.drawHomeArea('blue', 9, 0);
    this.drawHomeArea('green', 9, 9);
    this.drawHomeArea('yellow', 0, 9);
    
    // Draw path
    this.drawPath();
    
    // Draw center area
    this.drawCenter();
    
    // Draw pieces
    this.drawAllPieces();
  }

  drawHomeArea(color, startX, startY) {
    this.ctx.fillStyle = this.colors[color];
    this.ctx.globalAlpha = 0.3;
    this.ctx.fillRect(startX * this.cellSize, startY * this.cellSize, 6 * this.cellSize, 6 * this.cellSize);
    this.ctx.globalAlpha = 1;
    
    // Draw home positions
    const homePositions = [
      [startX + 1, startY + 1], [startX + 2, startY + 1],
      [startX + 1, startY + 2], [startX + 2, startY + 2]
    ];
    
    homePositions.forEach(([x, y]) => {
      this.ctx.fillStyle = this.colors[color];
      this.ctx.fillRect(x * this.cellSize + 5, y * this.cellSize + 5, 
                       this.cellSize - 10, this.cellSize - 10);
    });
  }

  drawPath() {
    const pathCells = this.getPathCells();
    
    pathCells.forEach(([x, y], index) => {
      this.ctx.fillStyle = index % 2 === 0 ? '#fff' : '#ddd';
      this.ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
      
      // Draw path number
      this.ctx.fillStyle = '#000';
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(index.toString(), 
                       x * this.cellSize + this.cellSize/2, 
                       y * this.cellSize + this.cellSize/2 + 4);
    });
  }

  drawCenter() {
    const centerX = 6 * this.cellSize;
    const centerY = 6 * this.cellSize;
    const centerSize = 3 * this.cellSize;
    
    // Draw center triangle
    this.ctx.fillStyle = '#ffd700';
    this.ctx.beginPath();
    this.ctx.moveTo(centerX + centerSize/2, centerY);
    this.ctx.lineTo(centerX, centerY + centerSize);
    this.ctx.lineTo(centerX + centerSize, centerY + centerSize);
    this.ctx.closePath();
    this.ctx.fill();
    
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  getPathCells() {
    const path = [];
    
    // Bottom row (red start)
    for (let x = 6; x <= 8; x++) path.push([x, 14]);
    for (let y = 13; y >= 9; y--) path.push([8, y]);
    
    // Right column
    for (let x = 9; x <= 14; x++) path.push([x, 8]);
    for (let y = 7; y >= 6; y--) path.push([14, y]);
    for (let y = 5; y >= 0; y--) path.push([14, y]);
    
    // Top row (blue start)
    for (let x = 13; x >= 9; x--) path.push([x, 0]);
    for (let y = 1; y <= 5; y++) path.push([8, y]);
    
    // Top column
    for (let x = 7; x >= 0; x--) path.push([x, 6]);
    for (let y = 7; y <= 8; y++) path.push([0, y]);
    
    // Left row (yellow start)
    for (let y = 9; y <= 14; y++) path.push([0, y]);
    for (let x = 1; x <= 5; x++) path.push([x, 14]);
    
    // Left column
    for (let y = 13; y >= 9; y--) path.push([6, y]);
    
    return path;
  }

  drawAllPieces() {
    Object.keys(this.pieces).forEach(color => {
      this.pieces[color].forEach((piece, index) => {
        this.drawPiece(color, piece.position, index, piece.isHome);
      });
    });
  }

  drawPiece(color, position, pieceIndex, isHome = false) {
    let x, y;
    
    if (isHome) {
      const homePositions = this.getHomePositions(color);
      [x, y] = homePositions[pieceIndex];
    } else {
      const pathCells = this.getPathCells();
      [x, y] = pathCells[position] || [0, 0];
    }
    
    const centerX = x * this.cellSize + this.cellSize / 2;
    const centerY = y * this.cellSize + this.cellSize / 2;
    const radius = this.cellSize / 3;
    
    // Draw piece shadow
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.beginPath();
    this.ctx.arc(centerX + 2, centerY + 2, radius, 0, 2 * Math.PI);
    this.ctx.fill();
    
    // Draw piece
    this.ctx.fillStyle = this.colors[color];
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    this.ctx.fill();
    
    // Draw piece border
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // Draw piece number
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText((pieceIndex + 1).toString(), centerX, centerY + 5);
  }

  getHomePositions(color) {
    const positions = {
      red: [[1, 1], [2, 1], [1, 2], [2, 2]],
      blue: [[10, 1], [11, 1], [10, 2], [11, 2]],
      green: [[10, 10], [11, 10], [10, 11], [11, 11]],
      yellow: [[1, 10], [2, 10], [1, 11], [2, 11]]
    };
    return positions[color];
  }

  setupClickHandler() {
    this.canvas.addEventListener('click', (event) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      const gridX = Math.floor(x / this.cellSize);
      const gridY = Math.floor(y / this.cellSize);
      
      this.handleCellClick(gridX, gridY);
    });
  }

  handleCellClick(gridX, gridY) {
    if (!app.currentRoom || app.currentRoom.gameState !== 'playing') return;
    
    const currentPlayer = app.currentRoom.players[app.currentRoom.currentPlayer];
    if (currentPlayer.socketId !== app.socket.id) return;
    
    // Find if there's a piece at this position
    const pieceIndex = this.findPieceAt(gridX, gridY, currentPlayer.color);
    
    if (pieceIndex !== -1) {
      app.socket.emit('move-piece', {
        roomId: app.currentRoom.id,
        pieceIndex: pieceIndex
      });
    }
  }

  findPieceAt(gridX, gridY, color) {
    const pieces = this.pieces[color];
    
    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i];
      let pieceX, pieceY;
      
      if (piece.isHome) {
        const homePositions = this.getHomePositions(color);
        [pieceX, pieceY] = homePositions[i];
      } else {
        const pathCells = this.getPathCells();
        [pieceX, pieceY] = pathCells[piece.position] || [0, 0];
      }
      
      if (pieceX === gridX && pieceY === gridY) {
        return i;
      }
    }
    
    return -1;
  }

  updatePiecePosition(data) {
    // This method will be called from app.js when a piece is moved
    if (app.currentRoom) {
      const player = app.currentRoom.players.find(p => p.name === data.player);
      if (player) {
        const piece = player.pieces[data.pieceIndex];
        piece.position = data.newPosition;
        
        // Update local pieces array
        this.pieces[player.color] = player.pieces;
        
        // Redraw the board
        this.drawBoard();
      }
    }
  }

  initializePieces(roomData) {
    // Initialize pieces based on room data
    if (roomData && roomData.players) {
      roomData.players.forEach(player => {
        this.pieces[player.color] = player.pieces;
      });
      this.drawBoard();
    }
  }

  highlightMovablePieces(color, movablePieces) {
    // Redraw board first to clear previous highlights
    this.drawBoard();
    
    // Highlight pieces that can be moved
    movablePieces.forEach(pieceIndex => {
      const piece = this.pieces[color][pieceIndex];
      let x, y;
      
      if (piece.isHome) {
        const homePositions = this.getHomePositions(color);
        [x, y] = homePositions[pieceIndex];
      } else {
        const pathCells = this.getPathCells();
        [x, y] = pathCells[piece.position] || [0, 0];
      }
      
      // Draw highlight
      this.ctx.strokeStyle = '#ffff00';
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.arc(x * this.cellSize + this.cellSize/2, 
                  y * this.cellSize + this.cellSize/2, 
                  this.cellSize/3 + 8, 0, 2 * Math.PI);
      this.ctx.stroke();
    });
  }
  
  clearHighlights() {
    this.drawBoard();
  }
}

// Make LudoGame available globally
window.LudoGame = LudoGame;