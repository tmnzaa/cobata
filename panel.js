const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { spawn } = require('child_process');
const qrcode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let botProcess = null;

app.use(express.static('.')); // Serve panel.html dan semua file di direktori ini

app.get('/', (_, res) => res.sendFile(__dirname + '/panel.html'));

io.on('connection', socket => {
  socket.on('command', cmd => {
    const run = spawn(cmd.split(" ")[0], cmd.split(" ").slice(1));
    run.stdout.on('data', data => {
      socket.emit('output', data.toString());
    });
    run.stderr.on('data', data => {
      socket.emit('output', data.toString());
    });
  });

  socket.on('startBot', () => {
    if (botProcess) {
      socket.emit('output', '⚠️ Bot sudah berjalan!');
      return;
    }
    botProcess = spawn('node', ['index.js']);
    socket.emit('output', '✅ Bot dimulai...');

    botProcess.stdout.on('data', async data => {
      const text = data.toString();
      socket.emit('output', text);

      if (text.includes('open the link')) {
        const match = text.match(/(?:qr|code|link):\s*(.*)/i);
        if (match) {
          const qrData = match[1];
          const qrImage = await qrcode.toDataURL(qrData);
          socket.emit('qr', qrImage);
        }
      }

      if (text.includes('[QR-B64]')) {
        const base64 = text.match(/\[QR-B64\] (.+)/);
        if (base64) socket.emit('qr', base64[1]);
      }
    });

    botProcess.stderr.on('data', data => {
      socket.emit('output', data.toString());
    });

    botProcess.on('close', () => {
      socket.emit('output', '🛑 Bot dihentikan.');
      botProcess = null;
    });
  });

  socket.on('stopBot', () => {
    if (botProcess) {
      botProcess.kill();
      socket.emit('output', '🛑 Bot dihentikan.');
      botProcess = null;
    } else {
      socket.emit('output', '⚠️ Bot belum berjalan!');
    }
  });
});

server.listen(3001, () => {
  console.log('✅ Panel berjalan di http://localhost:3001');
});
