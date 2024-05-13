import { io } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '../../interface/Socket';

// "undefined" means the URL will be computed from the `window.location` object
// const URL = process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:4000';
const URL = window.location.protocol + "//" + window.location.host.substring(0, window.location.host.length - 4) + "4000";

export const socket = io(URL);