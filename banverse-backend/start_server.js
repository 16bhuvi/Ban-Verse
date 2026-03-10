const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'server_output.log');
const out = fs.openSync(logFile, 'a');

console.log('Starting server.js...');
console.log('Logging to:', logFile);

const p = spawn('node', ['server.js'], {
    cwd: __dirname,
    stdio: ['ignore', out, out]
});

p.on('error', (err) => {
    fs.appendFileSync(logFile, `Spawn error: ${err.message}\n`);
});

console.log('Server process spawned with PID:', p.pid);
process.exit(0);
