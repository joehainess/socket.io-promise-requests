import { SocketPromiseServer, SocketPromiseClient, SocketTypes } from './socket-promise-handlers';
import { Server } from 'socket.io';

function getInstance (server: Server): SocketPromiseServer;
function getInstance (socket: SocketTypes): SocketPromiseClient;
function getInstance (input: Server | SocketTypes): SocketPromiseServer | SocketPromiseClient {
  if (input instanceof Server) return SocketPromiseServer.getInstance(input);
  else return SocketPromiseClient.getInstance(input);
}

export default getInstance;
