type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiErrorResponse {
    status?: string;
    code?: string;
    message?: string;
    error?: string | null;
}

export class HttpRequestError extends Error {
    constructor(
        public readonly statusCode: number,
        message: string,
        public readonly code?: string,
    ) {
        super(message);
        this.name = "HttpRequestError";
    }
}

export async function httpRequest<T, B = unknown>(
    url: string,
    method: HttpMethod = "GET",
    body?: B,
): Promise<T> {
    const response = await fetch(url, {
        method,
        headers: body !== undefined
            ? { "Content-Type": "application/json" }
            : undefined,
        ...(body !== undefined
            ? { body: JSON.stringify(body) }
            : {}),
    });
    if (!response.ok) {
        let errorData: ApiErrorResponse | null = null;

        try {
            errorData = await response.json() as ApiErrorResponse;
        } catch {
            // Response body may be empty or not JSON.
        }

        throw new HttpRequestError(
            response.status,
            errorData?.message
                ?? errorData?.error
                ?? `HTTP ${response.status}: ${response.statusText}`,
            errorData?.code,
        );
    }

    if (response.status === 204) {
        return undefined as T;
    }
    return await response.json() as T;
}
