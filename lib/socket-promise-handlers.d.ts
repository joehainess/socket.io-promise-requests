/// <reference types="socket.io-client" />
import { Payloads, Responses } from '../types/requests';
import { Server, Socket } from 'socket.io';
import { RateLimitOptions, RateLimitResponse } from './rate-limiter';
declare type RequestNames = keyof Payloads | keyof Responses;
declare type PayloadData<T extends RequestNames> = T extends keyof Payloads ? [Payloads[T]] : [any?];
declare type ResponseData<T extends RequestNames> = T extends keyof Responses ? Responses[T] : any;
declare type ListenerCallback<T extends RequestNames> = (socket: Socket, payload: PayloadData<T>[0], send: (response: ResponseData<T>) => void) => void;
interface ListenerOptions {
    rateLimit?: RateLimitOptions;
}
declare class SocketPromiseServer {
    static getInstance(server: Server): SocketPromiseServer;
    private _server;
    private _attachedListeners;
    private constructor();
    listen<T extends RequestNames>(requestName: T, listener: ListenerCallback<T>, options?: ListenerOptions): void;
}
declare type SocketTypes = Socket | SocketIOClient.Socket;
declare type RequestCallback<T extends RequestNames> = (response: ResponseData<T> | void, error: RateLimitResponse | void) => void;
declare class SocketPromiseClient {
    private static _registeredInstances;
    static getInstance(socket: SocketTypes): SocketPromiseClient;
    private _socket;
    private _requestMap;
    private constructor();
    private getUniqueRequestId;
    request<T extends RequestNames>(requestName: T, payload: PayloadData<T>[0], callback: RequestCallback<T>): Promise<ResponseData<T>>;
    request<T extends RequestNames>(requestName: T, ...payload: PayloadData<T>): Promise<ResponseData<T>>;
}
export { SocketPromiseServer, SocketPromiseClient, };
export type { SocketTypes, RequestNames };
