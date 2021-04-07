"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var DEFAULT_OPTIONS = {
    requests: 60,
    timePeriodMs: 60 * 1000,
    cooldownMs: 0,
};
exports.default = (function (options) {
    var _a = Object.assign(DEFAULT_OPTIONS, options), requests = _a.requests, timePeriodMs = _a.timePeriodMs, cooldownMs = _a.cooldownMs;
    var requestMap = {};
    var rateLimiter = function (identifier) {
        if (identifier === void 0) { identifier = '_default'; }
        var timestamp = Date.now();
        if (!requestMap[identifier]) {
            requestMap[identifier] = {
                lastUpdated: timestamp,
                lastSuccessfulRequest: 0,
                remainingRequests: requests,
                failedRequests: 0,
            };
        }
        if (timestamp - requestMap[identifier].lastUpdated >= timePeriodMs) {
            requestMap[identifier].lastUpdated = timestamp;
            requestMap[identifier].remainingRequests = requests;
            requestMap[identifier].failedRequests = 0;
        }
        var timeSinceLastRequest = timestamp - requestMap[identifier].lastSuccessfulRequest;
        if (requestMap[identifier].remainingRequests === 0
            || (requestMap[identifier].remainingRequests >= 1 && timeSinceLastRequest < cooldownMs)) {
            // If they have no remaining requests, or they still have requests but executed before cooldown expired
            requestMap[identifier].failedRequests++;
            var nextRefresh = requestMap[identifier].remainingRequests === 0
                ? Math.max(requestMap[identifier].lastUpdated + timePeriodMs, requestMap[identifier].lastSuccessfulRequest + cooldownMs)
                : requestMap[identifier].lastSuccessfulRequest + cooldownMs;
            return {
                limited: true,
                failedRequests: requestMap[identifier].failedRequests,
                nextRefreshTimestamp: nextRefresh,
            };
        }
        else {
            requestMap[identifier].remainingRequests--;
            requestMap[identifier].lastSuccessfulRequest = timestamp;
            return { limited: false };
        }
    };
    return rateLimiter;
});
