/// <reference types="socket.io-client" />
import { Payloads, Responses } from '../types/requests';
import { Socket } from 'socket.io';
import { RateLimitOptions, RateLimitResponse } from './rate-limiter';
declare type RequestNames = keyof Payloads | keyof Responses;
declare type PayloadData<T extends RequestNames> = T extends keyof Payloads ? [Payloads[T]] : [any?];
declare type ResponseData<T extends RequestNames> = T extends keyof Responses ? Responses[T] : any;
declare type RequestCallback<T extends RequestNames> = (response: ResponseData<T> | void, error: RateLimitResponse | void) => void;
declare type ListenerCallback<T extends RequestNames> = (payload: PayloadData<T>[0], send: (response: ResponseData<T>) => void) => void;
interface ListenerOptions {
    rateLimit?: RateLimitOptions;
}
declare const _default: (socket: SocketIO.Socket | SocketIOClient.Socket | Socket) => {
    request: {
        <T extends RequestNames>(requestName: T, payload: PayloadData<T>[0], callback: RequestCallback<T>): Promise<ResponseData<T>>;
        <T_1 extends RequestNames>(requestName: T_1, ...payload: PayloadData<T_1>): Promise<ResponseData<T_1>>;
    };
    listen: <T_2 extends RequestNames>(requestName: T_2, listener: ListenerCallback<T_2>, options?: ListenerOptions | undefined) => void;
};
export default _default;
