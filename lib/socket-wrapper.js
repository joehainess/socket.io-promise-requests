"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var rate_limiter_1 = __importDefault(require("./rate-limiter"));
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
        var resolvePromise;
        var rejectPromise;
        var promise = new Promise(function (resolve, reject) {
            resolvePromise = resolve;
            rejectPromise = reject;
        });
        // Store the request with the promise functions
        requestMap.set(uniqueId, {
            responseCallback: function (data) {
                resolvePromise(data); // resolve promise
                if (callback)
                    callback(data);
                else
                    requestMap.delete(uniqueId); // If there's no callback, it resolves the promise once and deletes the request
            },
            rejectCallback: function (rateLimitResponse) {
                rejectPromise(rateLimitResponse); // reject promise
                if (callback)
                    callback(undefined, rateLimitResponse);
                else
                    requestMap.delete(uniqueId); // If there's no callback, it rejects the promise once and deletes the request
            }
        });
        // Make request
        var requestObject = { requestName: requestName, id: uniqueId, payload: payload };
        socket.emit('request', requestObject);
        promise.catch();
        return promise;
    }
    // Client listening to responses
    socket.on('response', function (responseObject) {
        if (requestMap.has(responseObject.id)) {
            var requestResponse = requestMap.get(responseObject.id);
            if (requestResponse) {
                var responseCallback = requestResponse.responseCallback, rejectCallback = requestResponse.rejectCallback;
                if ('data' in responseObject)
                    responseCallback(responseObject.data);
                else
                    rejectCallback(responseObject.rateLimit);
            }
        }
    });
    // Server attaching request listeners
    var attachedListeners = new Map();
    function listen(requestName, listener, options) {
        var rateLimiter;
        if (options) {
            var rateLimitOptions = options.rateLimit;
            if (rateLimitOptions)
                rateLimiter = rateLimitOptions ? rate_limiter_1.default(rateLimitOptions) : undefined;
        }
        attachedListeners.set(requestName, { listener: listener, rateLimiter: rateLimiter });
    }
    // Server listening for requests
    socket.on('request', function (requestObject) {
        if (attachedListeners.has(requestObject.requestName)) {
            var requestListener = attachedListeners.get(requestObject.requestName);
            if (requestListener) {
                var listener = requestListener.listener, rateLimiter = requestListener.rateLimiter;
                if (rateLimiter) {
                    var rateLimitResponse = rateLimiter();
                    if (rateLimitResponse.limited === true) {
                        var responseObject = { id: requestObject.id, rateLimit: rateLimitResponse };
                        socket.emit('response', responseObject);
                        return;
                    }
                }
                listener(requestObject.payload, function (response) {
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
