
import type { ApiErrorCode } from "../interfaces/ApiResponse.js";

export class ApiError extends Error {
    constructor(
        public readonly code: ApiErrorCode,
        message: string,
        public readonly details?: unknown,
    ) {
        super(message);
        this.name = "ApiError";
        Object.setPrototypeOf(this, new.target.prototype);
    }
}