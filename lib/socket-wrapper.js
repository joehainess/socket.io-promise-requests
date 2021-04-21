"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var socket_promise_handlers_1 = require("./socket-promise-handlers");
var isServer = function (input) { return input.constructor.name === 'Server'; };
function getInstance(input) {
    if (isServer(input))
        return socket_promise_handlers_1.SocketPromiseServer.getInstance(input);
    else
        return socket_promise_handlers_1.SocketPromiseClient.getInstance(input);
}
exports.default = getInstance;
