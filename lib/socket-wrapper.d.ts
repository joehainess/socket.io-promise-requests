/// <reference types="socket.io-client" />
import { Payloads, Responses } from '../types/requests';
import { Socket } from 'socket.io';
declare type RequestNames = keyof Payloads | keyof Responses;
declare type PayloadData<T extends RequestNames> = T extends keyof Payloads ? Payloads[T] : any;
declare type ResponseData<T extends RequestNames> = T extends keyof Responses ? Responses[T] : any;
declare type RequestListener<T extends RequestNames> = (payload: PayloadData<T>, send: (response: ResponseData<T>) => void) => void;
declare const _default: (socket: SocketIO.Socket | SocketIOClient.Socket | Socket) => {
    request: <T extends RequestNames>(requestName: T, payload: PayloadData<T>, callback?: ((response: ResponseData<T>) => void) | undefined) => Promise<ResponseData<T>>;
    listen: <T_1 extends RequestNames>(requestName: T_1, listener: RequestListener<T_1>) => void;
};
export default _default;
