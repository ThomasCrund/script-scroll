import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import ScrollManager from './ScrollManager.js';
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from '../../interface/Socket';
import { ScrollUpdate } from '../../interface/Scroll';
import ScriptManager from './ScriptManager.js';

const app = express();
const server = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server, {
    cors: {
        origin: ["http://localhost:3000", "http://10.93.131.105:3000", "http://10.93.131.108:3000", "http://10.93.131.113:3000"]
    }
});
const scrollManager = new ScrollManager();
const scriptManager = new ScriptManager(scrollManager);

app.get('/', (req, res) => {
  res.send('<h1>Hello world</h1>');
});

function updateScriptPosition() {
  if (scriptManager.changed) {
    const position = scriptManager.getCurrentPosition();
    io.emit('scriptPosition', scriptManager.getCurrentPosition())
  }
}

io.on('connection', (socket) => {
    console.log('a user connected', socket.id);
    socket.emit('scrollInformation', scrollManager.toScrollInformation());
    socket.emit('scriptBreakup', scriptManager.getScriptBreakup());
    io.emit('scriptPosition', scriptManager.getCurrentPosition())

    socket.on('scrollUpdate', (scrollData: ScrollUpdate) => {
      scrollManager.updateScroll(socket.id, scrollData);
      scriptManager.updateCurrentPosition();
      updateScriptPosition();
      io.emit('scrollInformation', scrollManager.toScrollInformation());
    });
});

server.listen(4000, () => {
  console.log('server running at http://localhost:4000');
});