import { SocketPromiseServer, SocketPromiseClient, SocketTypes } from './socket-promise-handlers';
import { Server } from 'socket.io';
declare function getInstance(server: Server): SocketPromiseServer;
declare function getInstance(socket: SocketTypes): SocketPromiseClient;
export default getInstance;
