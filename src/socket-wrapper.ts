import { SocketPromiseServer, SocketPromiseClient, SocketTypes } from './socket-promise-handlers';
import { Server } from 'socket.io';

function getInstance (server: Server): SocketPromiseServer;
function getInstance (socket: SocketTypes): SocketPromiseClient;
function getInstance (input: Server | SocketTypes): SocketPromiseServer | SocketPromiseClient {
  if ('id' in input) return SocketPromiseClient.getInstance(input);
  else return SocketPromiseServer.getInstance(input);
}

export default getInstance;
