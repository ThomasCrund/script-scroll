import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import ScrollManager from './ScrollManager.js';
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from '../../interface/Socket';
import { ScrollUpdate } from '../../interface/Scroll';
import ScriptManager from './ScriptManager.js';

const app = express();
const server = createServer(app);
const hosts = Array.apply(null, Array(254)).map((a, index) => `http://10.93.131.${index}:3000`);
console.log(hosts);
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server, {
    cors: {
        origin: ["http://localhost:3000", ...hosts]
    }
});
const scrollManager = new ScrollManager();
const scriptManager = new ScriptManager(scrollManager);

app.get('/', (req, res) => {
  res.send('<h1>Hello world</h1>');
});

io.on('connection', (socket) => {
    console.log('a user connected', socket.id);
    socket.emit('scrollInformation', scrollManager.toScrollInformation());
    scriptManager.registerEvents(io, socket);

    socket.on('scrollUpdate', (scrollData: ScrollUpdate) => {
      scrollManager.updateScroll(socket.id, scrollData);
      io.volatile.emit('scrollInformation', scrollManager.toScrollInformation());
    });
});

server.listen(4000, () => {
  console.log('server running at http://localhost:4000');
});

let interval = setInterval(() => scriptManager.loop(io), 500);