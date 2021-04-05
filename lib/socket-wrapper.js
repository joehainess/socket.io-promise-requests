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
    function request(requestName, payload) {
        var uniqueId = getUniqueRequestId();
        var resolveRequest;
        var promise = new Promise(function (resolve) { return resolveRequest = resolve; });
        // @ts-ignore
        requestMap.set(uniqueId, resolveRequest);
        var requestObject = { requestName: requestName, id: uniqueId, payload: payload };
        socket.emit('request', requestObject);
        return promise;
    }
    // Client listening to responses
    socket.on('response', function (responseObject) {
        if (requestMap.has(responseObject.id)) {
            var resolveRequest = requestMap.get(responseObject.id);
            if (resolveRequest) {
                resolveRequest(responseObject.data);
                requestMap.delete(responseObject.id);
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
