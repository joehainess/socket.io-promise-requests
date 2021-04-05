import { Payloads, Responses } from '../types/requests';

type RequestNames = keyof Payloads | keyof Responses | string;

type PayloadData<T extends RequestNames> = T extends keyof Payloads ? Payloads[T] : any;
type ResponseData<T extends RequestNames> = T extends keyof Responses ? Responses[T] : any;

type RequestListener<T extends RequestNames> = (payload: PayloadData<T>, send: (response: ResponseData<T>) => void) => void;

interface RequestObject<T extends RequestNames> {
  requestName: T
  id: string
  payload: PayloadData<RequestNames>
}

interface ResponseObject<T extends RequestNames> {
  id: string
  data: ResponseData<T>
}

export default (socket: SocketIO.Socket | SocketIOClient.Socket) => {

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
  const requestMap: Map<string, (reponse: ResponseData<RequestNames>) => void> = new Map();
  function request <T extends RequestNames>(requestName: T, payload: PayloadData<T>): Promise<ResponseData<T>> {

    const uniqueId: string = getUniqueRequestId();
    
    let resolveRequest: (reponse: ResponseData<T>) => void;
    const promise: Promise<ResponseData<T>> = new Promise(resolve => resolveRequest = resolve);
    // @ts-ignore
    requestMap.set(uniqueId, resolveRequest);

    const requestObject: RequestObject<T> = { requestName: requestName, id: uniqueId, payload: payload };
    socket.emit('request', requestObject);

    return promise;
  }

  // Client listening to responses
  socket.on('response', (responseObject: ResponseObject<RequestNames>) => {
    if (requestMap.has(responseObject.id)) {
      const resolveRequest = requestMap.get(responseObject.id);
      if (resolveRequest) {
        resolveRequest(responseObject.data);
        requestMap.delete(responseObject.id);
      }
    }
  })

  // Server attaching request listeners
  const attachedListeners: Map<RequestNames, RequestListener<RequestNames>> = new Map();
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
