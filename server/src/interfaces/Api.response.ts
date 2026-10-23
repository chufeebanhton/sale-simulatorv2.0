export interface ApiResponse<T> {
    status: "success" | "error";
    message: string;
    data: T | null;
    error: {
        code: string;
        details?: unknown;
    } | null;
    meta: {
        timestamp: string;
        count?: number;
    };
}

export type ResponseMeta = {
    count?: number;
};