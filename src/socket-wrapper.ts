import { Payloads, Responses } from '../types/requests';
import { Socket } from 'socket.io';

type RequestNames = keyof Payloads | keyof Responses;

type PayloadData<T extends RequestNames> = T extends keyof Payloads ? [ Payloads[T] ] : [ any? ];
type ResponseData<T extends RequestNames> = T extends keyof Responses ? Responses[T] : any;

type RequestListener<T extends RequestNames> = (payload: PayloadData<T>[0], send: (response: ResponseData<T>) => void) => void;

type CallbackFunction<T extends RequestNames> = (response: ResponseData<T>) => void;

interface RequestObject<T extends RequestNames> {
  requestName: T
  id: string
  payload: PayloadData<T>
}

interface ResponseObject<T extends RequestNames> {
  id: string
  data: ResponseData<T>
}

export default (socket: SocketIO.Socket | SocketIOClient.Socket | Socket) => {

  const getUniqueRequestId = (): string => {

    const getRandomString = (): string => {
      const length = 64;
      let string = '';
      for (let i = 0; i < length; i++) string += Math.ceil(Math.random() * 36).toString(36);
      return string;
    }

    let uniqueString: string;
    do {
      uniqueString = getRandomString();
    } while (requestMap.has(uniqueString))

    return uniqueString;
  }
  
  // Client making requests
  const requestMap: Map<string, (data: ResponseData<RequestNames>) => void> = new Map();
  function request <T extends RequestNames>(requestName: T, payload: PayloadData<T>[0], callback: CallbackFunction<T>): Promise<ResponseData<T>> // args length will be exactly 2
  function request <T extends RequestNames>(requestName: T, ...payload: PayloadData<T>): Promise<ResponseData<T>> // spread is used to cheat optional params, but args length will be 1 as PayloadData is a tuple of length 1
  function request <T extends RequestNames>(requestName: T, ...args: PayloadData<T> | [ PayloadData<T>[0], CallbackFunction<T> ]): Promise<ResponseData<T>> {

    let payload: PayloadData<T>[0], callback: CallbackFunction<T>;
    if (args.length === 2) {
      payload = args[0];
      callback = args[1];
    }
    else payload = args[0]

    const uniqueId: string = getUniqueRequestId();
    
    // Extract promise resolve function
    let resolveRequest: (reponse: ResponseData<T>) => void;
    const promise: Promise<ResponseData<T>> = new Promise(resolve => resolveRequest = resolve);

    const responseCallback = (data: ResponseData<T>) => {
      resolveRequest(data); // Resolve promise
      if (callback) callback(data);
      else requestMap.delete(uniqueId) // If there's no callback, it resolves the promise once and deletes the request
    }
    requestMap.set(uniqueId, responseCallback);

    const requestObject: RequestObject<T> = { requestName: requestName, id: uniqueId, payload: payload };
    socket.emit('request', requestObject);

    return promise;
  }

  // Client listening to responses
  socket.on('response', (responseObject: ResponseObject<RequestNames>) => {
    if (requestMap.has(responseObject.id)) {
      const responseCallback = requestMap.get(responseObject.id);
      if (responseCallback) {
        responseCallback(responseObject.data);
      }
    }
  })

  // Server attaching request listeners
  const attachedListeners: Map<RequestNames, RequestListener<RequestNames>> = new Map<RequestNames, RequestListener<RequestNames>>();
  function listen <T extends RequestNames>(requestName: T, listener: RequestListener<T>) {
    attachedListeners.set(requestName, listener);
  }

  // Server listening for requests
  socket.on('request', (requestObject: RequestObject<RequestNames>) => {
    if (attachedListeners.has(requestObject.requestName)) {
      const requestListener = attachedListeners.get(requestObject.requestName);
      if (requestListener) {
        requestListener(requestObject.payload, (response: ResponseData<RequestNames>): void => {
          const responseObject: ResponseObject<RequestNames> = { id: requestObject.id, data: response };
          socket.emit('response', responseObject);
        });
      }
    }
  });

  return {
    request,
    listen,
  }

}
