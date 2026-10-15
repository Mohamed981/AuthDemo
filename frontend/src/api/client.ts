export interface User {
  id: string;
  email: string;
  name: string;
}

/** Status used when the request never got an HTTP response (offline, server down). */
const NETWORK_ERROR_STATUS = 0;

export class ApiError extends Error {
  readonly status: number;
  readonly requestId?: string;

  constructor(status: number, message: string, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.requestId = requestId;
  }

  /** True for failures that are the server's fault or a network problem, not the user's input. */
  get isUnexpected(): boolean {
    return this.status === NETWORK_ERROR_STATUS || this.status >= 500;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...init.headers },
    });
  } catch {
    throw new ApiError(
      NETWORK_ERROR_STATUS,
      'Unable to reach the server. Check your connection and try again.',
    );
  }

  if (!response.ok) {
    throw await toApiError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

interface ErrorBody {
  message?: string | string[];
  requestId?: string;
}

async function toApiError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as ErrorBody | null;
  const requestId = body?.requestId ?? response.headers.get('x-request-id') ?? undefined;
  return new ApiError(response.status, messageFor(response.status, body?.message), requestId);
}

function messageFor(status: number, message: string | string[] | undefined): string {
  if (status >= 500) {
    // Covers our own 500s and proxy errors (502/503/504) when the API is down.
    return 'Something went wrong on our side. Please try again in a moment.';
  }
  if (status === 429) return 'Too many attempts. Please wait a minute and try again.';
  if (Array.isArray(message)) return message.join('. ');
  return message || 'Something went wrong. Please try again.';
}

export interface SignUpRequest {
  email: string;
  name: string;
  password: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export const authApi = {
  signUp: (body: SignUpRequest) =>
    request<{ user: User }>('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  signIn: (body: SignInRequest) =>
    request<{ user: User }>('/auth/signin', { method: 'POST', body: JSON.stringify(body) }),
  signOut: () => request<void>('/auth/signout', { method: 'POST' }),
  /** Never fails for signed-out visitors: resolves to `{ user: null }`. */
  session: () => request<{ user: User | null }>('/auth/session'),
};
