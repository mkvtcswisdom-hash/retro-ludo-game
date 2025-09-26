const { Pool } = require('pg');

class Database {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/ludo_game',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    this.init();
  }

  async init() {
    try {
      await this.pool.query(`CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      await this.pool.query(`CREATE TABLE IF NOT EXISTS games (
        id SERIAL PRIMARY KEY,
        room_name VARCHAR(255) NOT NULL,
        players JSONB NOT NULL,
        winner_id INTEGER,
        game_state JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        finished_at TIMESTAMP
      )`);

      await this.pool.query(`CREATE TABLE IF NOT EXISTS player_stats (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        games_played INTEGER DEFAULT 0,
        games_won INTEGER DEFAULT 0,
        total_moves INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`);
    } catch (error) {
      console.error('Database initialization error:', error);
    }
  }

  async createUser(userData) {
    const { username, email, password } = userData;
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const userResult = await client.query(
        'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
        [username, email, password]
      );
      
      const user = userResult.rows[0];
      
      await client.query(
        'INSERT INTO player_stats (user_id) VALUES ($1)',
        [user.id]
      );
      
      await client.query('COMMIT');
      return user;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getUserByEmail(email) {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  async getUserByUsername(username) {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0];
  }

  async getUserById(id) {
    const result = await this.pool.query(
      'SELECT id, username, email FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  async getAllPlayers() {
    const result = await this.pool.query(`
      SELECT u.id, u.username, u.email, u.created_at,
             COALESCE(ps.games_played, 0) as games_played,
             COALESCE(ps.games_won, 0) as games_won,
             COALESCE(ps.total_moves, 0) as total_moves
      FROM users u
      LEFT JOIN player_stats ps ON u.id = ps.user_id
      ORDER BY ps.games_won DESC, ps.games_played DESC
    `);
    return result.rows;
  }

  async saveGame(gameData) {
    const { room_name, players, winner_id, game_state } = gameData;
    const result = await this.pool.query(
      'INSERT INTO games (room_name, players, winner_id, game_state, finished_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING id',
      [room_name, JSON.stringify(players), winner_id, JSON.stringify(game_state)]
    );
    return result.rows[0].id;
  }

  async updatePlayerStats(userId, won = false, moves = 0) {
    await this.pool.query(`
      UPDATE player_stats 
      SET games_played = games_played + 1,
          games_won = games_won + $1,
          total_moves = total_moves + $2
      WHERE user_id = $3
    `, [won ? 1 : 0, moves, userId]);
  }

  async getPlayerHistory(userId) {
    const result = await this.pool.query(`
      SELECT g.*, 
             CASE WHEN g.winner_id = $1 THEN 'Won' ELSE 'Lost' END as result
      FROM games g
      WHERE players::jsonb @> '[{"id": $1}]'
      ORDER BY g.finished_at DESC
      LIMIT 50
    `, [userId]);
    return result.rows;
  }
}

module.exports = Database;