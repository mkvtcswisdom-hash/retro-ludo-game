const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = new sqlite3.Database('ludo_game.db');
    this.init();
  }

  init() {
    this.db.serialize(() => {
      this.db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      this.db.run(`CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_name TEXT NOT NULL,
        players TEXT NOT NULL,
        winner_id INTEGER,
        game_state TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        finished_at DATETIME
      )`);

      this.db.run(`CREATE TABLE IF NOT EXISTS player_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        games_played INTEGER DEFAULT 0,
        games_won INTEGER DEFAULT 0,
        total_moves INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`);
    });
  }

  createUser(userData) {
    return new Promise((resolve, reject) => {
      const { username, email, password } = userData;
      const db = this.db;
      db.run(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email, password],
        function(err) {
          if (err) reject(err);
          else {
            const userId = this.lastID;
            // Create initial stats
            db.run(
              'INSERT INTO player_stats (user_id) VALUES (?)',
              [userId],
              (statsErr) => {
                if (statsErr) console.warn('Stats creation failed:', statsErr);
                resolve({ id: userId, username, email });
              }
            );
          }
        }
      );
    });
  }

  getUserByEmail(email) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE email = ?',
        [email],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  getUserById(id) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT id, username, email FROM users WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  getAllPlayers() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT u.id, u.username, u.email, u.created_at,
               COALESCE(ps.games_played, 0) as games_played,
               COALESCE(ps.games_won, 0) as games_won,
               COALESCE(ps.total_moves, 0) as total_moves
        FROM users u
        LEFT JOIN player_stats ps ON u.id = ps.user_id
        ORDER BY ps.games_won DESC, ps.games_played DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  saveGame(gameData) {
    return new Promise((resolve, reject) => {
      const { room_name, players, winner_id, game_state } = gameData;
      this.db.run(
        'INSERT INTO games (room_name, players, winner_id, game_state, finished_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [room_name, JSON.stringify(players), winner_id, JSON.stringify(game_state)],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  updatePlayerStats(userId, won = false, moves = 0) {
    return new Promise((resolve, reject) => {
      this.db.run(`
        UPDATE player_stats 
        SET games_played = games_played + 1,
            games_won = games_won + ?,
            total_moves = total_moves + ?
        WHERE user_id = ?
      `, [won ? 1 : 0, moves, userId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  getPlayerHistory(userId) {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT g.*, 
               CASE WHEN g.winner_id = ? THEN 'Won' ELSE 'Lost' END as result
        FROM games g
        WHERE JSON_EXTRACT(g.players, '$[*].id') LIKE '%' || ? || '%'
        ORDER BY g.finished_at DESC
        LIMIT 50
      `, [userId, userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = Database;