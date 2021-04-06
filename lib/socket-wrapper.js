"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (function (socket) {
    var getUniqueRequestId = function () {
        var getRandomString = function () {
            var length = 64;
            var string = '';
            for (var i = 0; i < length; i++)
                string += Math.ceil(Math.random() * 36).toString(36);
            return string;
        };
        var uniqueString;
        do {
            uniqueString = getRandomString();
        } while (requestMap.has(uniqueString));
        return uniqueString;
    };
    // Client making requests
    var requestMap = new Map();
    function request(requestName) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var payload, callback;
        if (args.length === 2) {
            payload = args[0];
            callback = args[1];
        }
        else
            payload = args[0];
        var uniqueId = getUniqueRequestId();
        // Extract promise resolve function
        var resolveRequest;
        var promise = new Promise(function (resolve) { return resolveRequest = resolve; });
        var responseCallback = function (data) {
            resolveRequest(data); // Resolve promise
            if (callback)
                callback(data);
            else
                requestMap.delete(uniqueId); // If there's no callback, it resolves the promise once and deletes the request
        };
        requestMap.set(uniqueId, responseCallback);
        var requestObject = { requestName: requestName, id: uniqueId, payload: payload };
        socket.emit('request', requestObject);
        return promise;
    }
    // Client listening to responses
    socket.on('response', function (responseObject) {
        if (requestMap.has(responseObject.id)) {
            var responseCallback = requestMap.get(responseObject.id);
            if (responseCallback) {
                responseCallback(responseObject.data);
            }
        }
    });
    // Server attaching request listeners
    var attachedListeners = new Map();
    function listen(requestName, listener) {
        attachedListeners.set(requestName, listener);
    }
    // Server listening for requests
    socket.on('request', function (requestObject) {
        if (attachedListeners.has(requestObject.requestName)) {
            var requestListener = attachedListeners.get(requestObject.requestName);
            if (requestListener) {
                requestListener(requestObject.payload, function (response) {
                    var responseObject = { id: requestObject.id, data: response };
                    socket.emit('response', responseObject);
                });
            }
        }
    });
    return {
        request: request,
        listen: listen,
    };
});
