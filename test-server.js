// Simple test to check if all modules load correctly
console.log('Testing server dependencies...');

try {
  const express = require('express');
  console.log('✓ Express loaded');
  
  const http = require('http');
  console.log('✓ HTTP loaded');
  
  const socketIo = require('socket.io');
  console.log('✓ Socket.IO loaded');
  
  const Database = require('./database');
  console.log('✓ Database module loaded');
  
  const GameManager = require('./gameManager');
  console.log('✓ GameManager loaded');
  
  const AuthManager = require('./authManager');
  console.log('✓ AuthManager loaded');
  
  console.log('\n✅ All modules loaded successfully!');
  console.log('Run "npm start" to start the server');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('\nRun "npm install" first to install dependencies');
}