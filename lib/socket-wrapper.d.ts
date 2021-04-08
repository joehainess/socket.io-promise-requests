/// <reference types="socket.io-client" />
import { Payloads, Responses } from '../types/requests';
import { Socket } from 'socket.io';
import { RateLimitOptions, RateLimiter, RateLimitResponse } from './rate-limiter';
declare type RequestNames = keyof Payloads | keyof Responses;
declare type PayloadData<T extends RequestNames> = T extends keyof Payloads ? [Payloads[T]] : [any?];
declare type ResponseData<T extends RequestNames> = T extends keyof Responses ? Responses[T] : any;
declare type RequestCallback<T extends RequestNames> = (response: ResponseData<T> | void, error: RateLimitResponse | void) => void;
declare type ListenerCallback<T extends RequestNames> = (payload: PayloadData<T>[0], send: (response: ResponseData<T>) => void) => void;
interface ListenerOptions {
    rateLimit?: RateLimitOptions;
}
declare type SocketInstance = SocketIO.Socket | SocketIOClient.Socket | Socket;
declare class SocketPromiseRequests {
    private static _registeredInstances;
    static getInstance(socket: SocketInstance): SocketPromiseRequests;
    private _socket;
    private _requestMap;
    private _attachedListeners;
    private constructor();
    private getUniqueRequestId;
    request<T extends RequestNames>(requestName: T, payload: PayloadData<T>[0], callback: RequestCallback<T>): Promise<ResponseData<T>>;
    request<T extends RequestNames>(requestName: T, ...payload: PayloadData<T>): Promise<ResponseData<T>>;
    listen<T extends RequestNames>(requestName: T, listener: ListenerCallback<T>, options?: ListenerOptions): void;
}
declare const _default: (socket: SocketIO.Socket | SocketIOClient.Socket | Socket) => SocketPromiseRequests;
export default _default;
export type { SocketPromiseRequests, RateLimitOptions, RateLimiter, RateLimitResponse };
