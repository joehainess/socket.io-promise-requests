import { Payloads, Responses } from '../types/requests';
import { Socket } from 'socket.io';
import createRateLimiter, { RateLimitOptions, RateLimiter, RateLimitResponse } from './rate-limiter';

type RequestNames = keyof Payloads | keyof Responses;

type PayloadData<T extends RequestNames> = T extends keyof Payloads ? [ Payloads[T] ] : [ any? ];
type ResponseData<T extends RequestNames> = T extends keyof Responses ? Responses[T] : any;

type RequestCallback<T extends RequestNames> = (response: ResponseData<T> | void, error: RateLimitResponse | void) => void;
type ListenerCallback<T extends RequestNames> = (payload: PayloadData<T>[0], send: (response: ResponseData<T>) => void) => void;

interface ListenerOptions {
  rateLimit?: RateLimitOptions
}

interface RawRequestObject<T extends RequestNames> {
  requestName: T
  id: string
  payload: PayloadData<T>
}

type RawResponseObject<T extends RequestNames> ={ id: string } & (
  { data: ResponseData<T> } | { rateLimit: RateLimitResponse }
)

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
  const requestMap: Map<string, { responseCallback: (data: ResponseData<RequestNames>) => void, rejectCallback: (rateLimitResponse: RateLimitResponse) => void }> = new Map();
  function request <T extends RequestNames>(requestName: T, payload: PayloadData<T>[0], callback: RequestCallback<T>): Promise<ResponseData<T>> // args length will be exactly 2
  function request <T extends RequestNames>(requestName: T, ...payload: PayloadData<T>): Promise<ResponseData<T>> // spread is used to cheat optional params, but args length will be 1 as PayloadData is a tuple of length 1
  function request <T extends RequestNames>(requestName: T, ...args: PayloadData<T> | [ PayloadData<T>[0], RequestCallback<T> ]): Promise<ResponseData<T>> {

    let payload: PayloadData<T>[0], callback: RequestCallback<T>;
    if (args.length === 2) {
      payload = args[0];
      callback = args[1];
    }
    else payload = args[0]

    const uniqueId: string = getUniqueRequestId();
    
    // Extract promise resolve function
    let resolvePromise: (reponse: ResponseData<T>) => void;
    let rejectPromise: (response: RateLimitResponse) => void;
    const promise: Promise<ResponseData<T>> = new Promise((resolve, reject) => {
      resolvePromise = resolve
      rejectPromise = reject
    });
    
    // Store the request with the promise functions
    requestMap.set(uniqueId, {
      responseCallback: (data: ResponseData<T>) => {
        resolvePromise(data); // resolve promise
        if (callback) callback(data);
        else requestMap.delete(uniqueId) // If there's no callback, it resolves the promise once and deletes the request
      },
      rejectCallback: (rateLimitResponse: RateLimitResponse) => {
        rejectPromise(rateLimitResponse); // reject promise
        if (callback) callback(undefined, rateLimitResponse);
        else requestMap.delete(uniqueId) // If there's no callback, it rejects the promise once and deletes the request
      }
    });

    // Make request
    const requestObject: RawRequestObject<T> = { requestName: requestName, id: uniqueId, payload: payload };
    socket.emit('request', requestObject);

    promise.catch();

    return promise;
  }

  // Client listening to responses
  socket.on('response', (responseObject: RawResponseObject<RequestNames>) => {
    if (requestMap.has(responseObject.id)) {
      const requestResponse = requestMap.get(responseObject.id);
      if (requestResponse) {
        const { responseCallback, rejectCallback } = requestResponse;
        if ('data' in responseObject) responseCallback(responseObject.data);
        else rejectCallback(responseObject.rateLimit);
      }
    }
  })

  // Server attaching request listeners
  const attachedListeners: Map<RequestNames, { listener: ListenerCallback<RequestNames>, rateLimiter?: RateLimiter }> = new Map<RequestNames, { listener: ListenerCallback<RequestNames>, rateLimiter?: RateLimiter }>();
  function listen <T extends RequestNames>(requestName: T, listener: ListenerCallback<T>, options?: ListenerOptions) {
    let rateLimiter: RateLimiter | undefined;
    if (options) {
      const { rateLimit: rateLimitOptions } = options;
      if (rateLimitOptions) rateLimiter = rateLimitOptions ? createRateLimiter(rateLimitOptions) : undefined;
    }
    attachedListeners.set(requestName, { listener, rateLimiter });
  }

  // Server listening for requests
  socket.on('request', (requestObject: RawRequestObject<RequestNames>) => {
    if (attachedListeners.has(requestObject.requestName)) {
      const requestListener = attachedListeners.get(requestObject.requestName);
      if (requestListener) {

        const { listener, rateLimiter } = requestListener;
        if (rateLimiter) {
          const rateLimitResponse = rateLimiter();
          if (rateLimitResponse.limited === true) {
            const responseObject: RawResponseObject<RequestNames> = { id: requestObject.id, rateLimit: rateLimitResponse };
            socket.emit('response', responseObject);
            return;
          }
        }
        
        listener(requestObject.payload, (response: ResponseData<RequestNames>): void => {
          const responseObject: RawResponseObject<RequestNames> = { id: requestObject.id, data: response };
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
