const fs = require('fs');
const path = require('path');

console.log('🎮 Starting Retro Ludo Game...\n');

// Check if all required files exist
const requiredFiles = [
  'server.js',
  'gameManager.js', 
  'database.js',
  'authManager.js',
  'public/index.html',
  'public/css/style.css',
  'public/js/app.js',
  'public/js/game.js'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    console.error(`❌ Missing file: ${file}`);
    allFilesExist = false;
  } else {
    console.log(`✓ ${file}`);
  }
});

if (!allFilesExist) {
  console.error('\n❌ Some required files are missing!');
  process.exit(1);
}

console.log('\n✅ All files present');

// Check if node_modules exists
if (!fs.existsSync('node_modules')) {
  console.error('\n❌ node_modules not found. Run "npm install" first');
  process.exit(1);
}

console.log('✅ Dependencies installed');

// Start the server
console.log('\n🚀 Starting server...\n');
try {
  require('./server.js');
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}