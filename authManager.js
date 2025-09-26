const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthManager {
  constructor(database) {
    this.db = database;
    this.jwtSecret = 'ludo-game-secret-key';
  }

  async register({ username, email, password }) {
    if (!username || !email || !password) {
      throw new Error('All fields are required');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const existingUser = await this.db.getUserByEmail(email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.db.createUser({
      username,
      email,
      password: hashedPassword
    });

    const token = jwt.sign({ userId: user.id }, this.jwtSecret);
    return {
      success: true,
      user: { id: user.id, username: user.username, email: user.email },
      token
    };
  }

  async login({ email, password }) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const user = await this.db.getUserByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    const token = jwt.sign({ userId: user.id }, this.jwtSecret);
    return {
      success: true,
      user: { id: user.id, username: user.username, email: user.email },
      token
    };
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}

module.exports = AuthManager;