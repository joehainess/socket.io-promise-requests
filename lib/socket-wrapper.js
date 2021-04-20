"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var socket_promise_handlers_1 = require("./socket-promise-handlers");
function getInstance(input) {
    if ('id' in input)
        return socket_promise_handlers_1.SocketPromiseClient.getInstance(input);
    else
        return socket_promise_handlers_1.SocketPromiseServer.getInstance(input);
}
exports.default = getInstance;
