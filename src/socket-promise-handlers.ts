import { Payloads, Responses } from '../types/requests';
import { Server, Socket } from 'socket.io';
import createRateLimiter, { RateLimitOptions, RateLimiter, RateLimitResponse } from './rate-limiter';

// Shared Types //
type RequestNames = keyof Payloads | keyof Responses;

type PayloadData<T extends RequestNames> = T extends keyof Payloads ? [ Payloads[T] ] : [ any? ];
interface RawRequestObject<T extends RequestNames> {
  requestName: T
  id: string
  payload: PayloadData<T>
};

type ResponseData<T extends RequestNames> = T extends keyof Responses ? Responses[T] : any;
type RawResponseObject<T extends RequestNames> = { id: string } & (
  { data: ResponseData<T> } | { rateLimit: RateLimitResponse }
);



// Server Types
type ListenerCallback<T extends RequestNames> = (socket: Socket, payload: PayloadData<T>[0], send: (response: ResponseData<T>) => void) => void;
interface ListenerOptions { rateLimit?: RateLimitOptions };

class SocketPromiseServer {

  static getInstance(server: Server): SocketPromiseServer {
    return new SocketPromiseServer(server)
  }

  private _server: Server;
  private _attachedListeners: Map<RequestNames, { listener: ListenerCallback<RequestNames>, rateLimiter?: RateLimiter }> = new Map<RequestNames, { listener: ListenerCallback<RequestNames>, rateLimiter?: RateLimiter }>();

  private constructor(server: Server) {

    this._server = server;

    this._server.use((socket: Socket) => {
            
      const getIp = (): string => {
        const headers = socket.request.headers;
        return typeof headers?.['cf-connecting-ip'] === 'string'
        ? headers['cf-connecting-ip']
        : socket.handshake.address;
      }
      
      // Server listening for requests from socket
      socket.on('request', (requestObject: RawRequestObject<RequestNames>) => {
        if (this._attachedListeners.has(requestObject.requestName)) {
          const requestListener = this._attachedListeners.get(requestObject.requestName);
          if (requestListener) {
  
            const { listener, rateLimiter } = requestListener;
            if (rateLimiter) {
              const socketIp = getIp();
              const rateLimitResponse = rateLimiter(socketIp);
              if (rateLimitResponse.limited === true) {
                const responseObject: RawResponseObject<RequestNames> = { id: requestObject.id, rateLimit: rateLimitResponse };
                socket.emit('response', responseObject);
                return;
              }
            }
            
            listener(socket, requestObject.payload, (response: ResponseData<RequestNames>): void => {
              const responseObject: RawResponseObject<RequestNames> = { id: requestObject.id, data: response };
              socket.emit('response', responseObject);
            });
            
          }
        }
      });

    })

  }
  
  // Server attaching request listeners
  listen<T extends RequestNames>(requestName: T, listener: ListenerCallback<T>, options?: ListenerOptions) {
    let rateLimiter: RateLimiter | undefined;
    if (options) {
      const { rateLimit: rateLimitOptions } = options;
      if (rateLimitOptions) rateLimiter = rateLimitOptions ? createRateLimiter(rateLimitOptions) : undefined;
    }
    this._attachedListeners.set(requestName, { listener, rateLimiter });
  }

}



// Client Types
type SocketTypes = Socket | SocketIOClient.Socket;
type RequestCallback<T extends RequestNames> = (response: ResponseData<T> | void, error: RateLimitResponse | void) => void;

class SocketPromiseClient {

  private static _registeredInstances: Map<SocketTypes['id'], SocketPromiseClient> = new Map();

  static getInstance(socket: SocketTypes): SocketPromiseClient {
    if (this._registeredInstances.has(socket.id)) {
      const instance = this._registeredInstances.get(socket.id);
      if (instance) return instance;
    }
    return new SocketPromiseClient(socket)
  }

  private _socket: SocketTypes;
  private _requestMap: Map<string, { responseCallback: (data: ResponseData<RequestNames>) => void, rejectCallback: (rateLimitResponse: RateLimitResponse) => void }> = new Map();

  private constructor(socket: SocketTypes) {

    this._socket = socket;
    SocketPromiseClient._registeredInstances.set(this._socket.id, this);

    // Client listening to responses
    this._socket.on('response', (responseObject: RawResponseObject<RequestNames>) => {
      if (this._requestMap.has(responseObject.id)) {
        const requestResponse = this._requestMap.get(responseObject.id);
        if (requestResponse) {
          const { responseCallback, rejectCallback } = requestResponse;
          if ('data' in responseObject) responseCallback(responseObject.data);
          else rejectCallback(responseObject.rateLimit);
        }
      }
    })

  }

  private getUniqueRequestId(): string {

    const getRandomString = (): string => {
      const length = 64;
      let string = '';
      for (let i = 0; i < length; i++) string += Math.ceil(Math.random() * 36).toString(36);
      return string;
    }

    let uniqueString: string;
    do {
      uniqueString = getRandomString();
    } while (this._requestMap.has(uniqueString))

    return uniqueString;

  }

  // Client making requests
  request<T extends RequestNames>(requestName: T, payload: PayloadData<T>[0], callback: RequestCallback<T>): Promise<ResponseData<T>> // args length will be exactly 2
  request<T extends RequestNames>(requestName: T, ...payload: PayloadData<T>): Promise<ResponseData<T>> // spread is used to cheat optional params, but args length will be 1 as PayloadData is a tuple of length 1
  request<T extends RequestNames>(requestName: T, ...args: PayloadData<T> | [ PayloadData<T>[0], RequestCallback<T> ]): Promise<ResponseData<T>> {

    let payload: PayloadData<T>[0], callback: RequestCallback<T>;
    if (args.length === 2) {
      payload = args[0];
      callback = args[1];
    }
    else payload = args[0]

    const uniqueId: string = this.getUniqueRequestId();
    
    // Extract promise resolve function
    let resolvePromise: (reponse: ResponseData<T>) => void;
    let rejectPromise: (response: RateLimitResponse) => void;
    const promise: Promise<ResponseData<T>> = new Promise((resolve, reject) => {
      resolvePromise = resolve
      rejectPromise = reject
    });
    
    // Store the request with the promise functions
    this._requestMap.set(uniqueId, {
      responseCallback: (data: ResponseData<T>) => {
        resolvePromise(data); // resolve promise
        if (callback) callback(data);
        else this._requestMap.delete(uniqueId) // If there's no callback, it resolves the promise once and deletes the request
      },
      rejectCallback: (rateLimitResponse: RateLimitResponse) => {
        rejectPromise(rateLimitResponse); // reject promise
        if (callback) callback(undefined, rateLimitResponse);
        else this._requestMap.delete(uniqueId) // If there's no callback, it rejects the promise once and deletes the request
      }
    });

    // Make request
    const requestObject: RawRequestObject<T> = { requestName: requestName, id: uniqueId, payload: payload };
    this._socket.emit('request', requestObject);

    promise.catch(() => {});

    return promise;
  }

}



export {
  SocketPromiseServer,
  SocketPromiseClient,
}

export type { SocketTypes, RequestNames }