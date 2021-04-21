import { SocketPromiseServer, SocketPromiseClient, SocketTypes } from './socket-promise-handlers';
import { Server } from 'socket.io';

const isServer = (input: any): input is Server => input.constructor.name === 'Server';

function getInstance (server: Server): SocketPromiseServer;
function getInstance (socket: SocketTypes): SocketPromiseClient;
function getInstance (input: Server | SocketTypes): SocketPromiseServer | SocketPromiseClient {
  if (isServer(input)) return SocketPromiseServer.getInstance(input);
  else return SocketPromiseClient.getInstance(input);
}

export default getInstance;
