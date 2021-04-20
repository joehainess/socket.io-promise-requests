"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var socket_promise_handlers_1 = require("./socket-promise-handlers");
var socket_io_1 = require("socket.io");
function getInstance(input) {
    if (input instanceof socket_io_1.Server)
        return socket_promise_handlers_1.SocketPromiseServer.getInstance(input);
    else
        return socket_promise_handlers_1.SocketPromiseClient.getInstance(input);
}
exports.default = getInstance;
