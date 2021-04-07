interface RateLimitOptions {
    requests?: number;
    timePeriodMs?: number;
    cooldownMs?: number;
}
declare type RateLimitResponse = {
    limited: false;
} | {
    limited: true;
    failedRequests: number;
    nextRefreshTimestamp: number;
};
declare type RateLimiter = (identitier?: string) => RateLimitResponse;
export type { RateLimitOptions, RateLimiter, RateLimitResponse };
declare const _default: (options: RateLimitOptions) => RateLimiter;
export default _default;
