"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketPromiseClient = exports.SocketPromiseServer = void 0;
var rate_limiter_1 = __importDefault(require("./rate-limiter"));
;
;
var SocketPromiseServer = /** @class */ (function () {
    function SocketPromiseServer(server) {
        var _this = this;
        this._attachedListeners = new Map();
        this._server = server;
        this._server.use(function (socket, next) {
            var getIp = function () {
                var headers = socket.request.headers;
                return typeof (headers === null || headers === void 0 ? void 0 : headers['cf-connecting-ip']) === 'string'
                    ? headers['cf-connecting-ip']
                    : socket.handshake.address;
            };
            // Server listening for requests from socket
            socket.on('request', function (requestObject) {
                if (_this._attachedListeners.has(requestObject.requestName)) {
                    var requestListener = _this._attachedListeners.get(requestObject.requestName);
                    if (requestListener) {
                        var listener = requestListener.listener, rateLimiter = requestListener.rateLimiter;
                        if (rateLimiter) {
                            var socketIp = getIp();
                            var rateLimitResponse = rateLimiter(socketIp);
                            if (rateLimitResponse.limited === true) {
                                var responseObject = { id: requestObject.id, rateLimit: rateLimitResponse };
                                socket.emit('response', responseObject);
                                return;
                            }
                        }
                        listener(socket, requestObject.payload, function (response) {
                            var responseObject = { id: requestObject.id, data: response };
                            socket.emit('response', responseObject);
                        });
                    }
                }
            });
            next();
        });
    }
    SocketPromiseServer.getInstance = function (server) {
        return new SocketPromiseServer(server);
    };
    // Server attaching request listeners
    SocketPromiseServer.prototype.listen = function (requestName, listener, options) {
        var rateLimiter;
        if (options) {
            var rateLimitOptions = options.rateLimit;
            if (rateLimitOptions)
                rateLimiter = rateLimitOptions ? rate_limiter_1.default(rateLimitOptions) : undefined;
        }
        this._attachedListeners.set(requestName, { listener: listener, rateLimiter: rateLimiter });
    };
    return SocketPromiseServer;
}());
exports.SocketPromiseServer = SocketPromiseServer;
var SocketPromiseClient = /** @class */ (function () {
    function SocketPromiseClient(socket) {
        var _this = this;
        this._requestMap = new Map();
        this._socket = socket;
        SocketPromiseClient._registeredInstances.set(this._socket.id, this);
        // Client listening to responses
        this._socket.on('response', function (responseObject) {
            if (_this._requestMap.has(responseObject.id)) {
                var requestResponse = _this._requestMap.get(responseObject.id);
                if (requestResponse) {
                    var responseCallback = requestResponse.responseCallback, rejectCallback = requestResponse.rejectCallback;
                    if ('data' in responseObject)
                        responseCallback(responseObject.data);
                    else
                        rejectCallback(responseObject.rateLimit);
                }
            }
        });
    }
    SocketPromiseClient.getInstance = function (socket) {
        if (this._registeredInstances.has(socket.id)) {
            var instance = this._registeredInstances.get(socket.id);
            if (instance)
                return instance;
        }
        return new SocketPromiseClient(socket);
    };
    SocketPromiseClient.prototype.getUniqueRequestId = function () {
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
        } while (this._requestMap.has(uniqueString));
        return uniqueString;
    };
    SocketPromiseClient.prototype.request = function (requestName) {
        var _this = this;
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
        var uniqueId = this.getUniqueRequestId();
        // Extract promise resolve function
        var resolvePromise;
        var rejectPromise;
        var promise = new Promise(function (resolve, reject) {
            resolvePromise = resolve;
            rejectPromise = reject;
        });
        // Store the request with the promise functions
        this._requestMap.set(uniqueId, {
            responseCallback: function (data) {
                resolvePromise(data); // resolve promise
                if (callback)
                    callback(data);
                else
                    _this._requestMap.delete(uniqueId); // If there's no callback, it resolves the promise once and deletes the request
            },
            rejectCallback: function (rateLimitResponse) {
                rejectPromise(rateLimitResponse); // reject promise
                if (callback)
                    callback(undefined, rateLimitResponse);
                else
                    _this._requestMap.delete(uniqueId); // If there's no callback, it rejects the promise once and deletes the request
            }
        });
        // Make request
        var requestObject = { requestName: requestName, id: uniqueId, payload: payload };
        this._socket.emit('request', requestObject);
        promise.catch(function () { });
        return promise;
    };
    SocketPromiseClient._registeredInstances = new Map();
    return SocketPromiseClient;
}());
exports.SocketPromiseClient = SocketPromiseClient;
