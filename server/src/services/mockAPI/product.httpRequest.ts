type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export async function httpRequest<T>(
    url: string,
    method: HttpMethod = "GET",
    body?: unknown
): Promise<T> {
    const response = await fetch(url, {
        method,
        headers: {
            "Content-Type": "application/json",
        },
        ...(body !== undefined
            ? { body: JSON.stringify(body) }
            : {}),
    });

    if (!response.ok) {
        throw new Error(
            `HTTP ${response.status}: ${response.statusText}`
        );
    }

    if (response.status === 204 || method === "DELETE") {
        return undefined as T;
    }

    return await response.json() as T;
}