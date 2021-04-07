interface RateLimitOptions {
  requests?: number,
  timePeriodMs?: number,
  cooldownMs?: number,
}

type RateLimitResponse = {
  limited: false,
} | {
  limited: true,
  failedRequests: number,
  nextRefreshTimestamp: number,
}

type RateLimiter = (identitier?: string) => RateLimitResponse;

const DEFAULT_OPTIONS: Required<RateLimitOptions> = {
  requests: 60,
  timePeriodMs: 60*1000,
  cooldownMs: 0,
}

export type { RateLimitOptions, RateLimiter, RateLimitResponse };

export default (options: RateLimitOptions) => {

  const { requests, timePeriodMs, cooldownMs } = Object.assign(DEFAULT_OPTIONS, options);
    
  interface LimitObject {
    lastUpdated: number
    lastSuccessfulRequest: number
    remainingRequests: number
    failedRequests: number
  }

  const requestMap: { [identifier: string]: LimitObject } = {}

  const rateLimiter: RateLimiter = (identifier: string = '_default'): RateLimitResponse => {
    const timestamp = Date.now();

    if (!requestMap[identifier]) {
      requestMap[identifier] = {
        lastUpdated: timestamp,
        lastSuccessfulRequest: 0,
        remainingRequests: requests,
        failedRequests: 0,
      }
    }

    if (timestamp - requestMap[identifier].lastUpdated >= timePeriodMs) {
      requestMap[identifier].lastUpdated =  timestamp;
      requestMap[identifier].remainingRequests = requests;
      requestMap[identifier].failedRequests = 0;
    }

    const timeSinceLastRequest = timestamp - requestMap[identifier].lastSuccessfulRequest;

    if (
      requestMap[identifier].remainingRequests === 0
      || (requestMap[identifier].remainingRequests >= 1 && timeSinceLastRequest < cooldownMs)
    ) {
      // If they have no remaining requests, or they still have requests but executed before cooldown expired

      requestMap[identifier].failedRequests++;

      const nextRefresh = requestMap[identifier].remainingRequests === 0
      ? Math.max(
        requestMap[identifier].lastUpdated + timePeriodMs,
        requestMap[identifier].lastSuccessfulRequest + cooldownMs,
      )
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
    
  }

  return rateLimiter;

}
