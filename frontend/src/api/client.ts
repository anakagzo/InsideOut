import axios, { AxiosError, AxiosHeaders, AxiosInstance } from "axios";

/**
 * Frontend API base URL.
 *
 * Override with VITE_API_BASE_URL in .env files for environment-specific routing.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:5000";

/**
 * Structured error payload surfaced by the backend.
 */
interface ApiErrorResponse {
  message?: string;
  error?: string;
  description?: string;
}

interface RefreshResponse {
  access_token: string;
  refresh_token?: string;
}

interface RetriableRequestConfig {
  _retry?: boolean;
}

const ACCESS_TOKEN_KEY = "insideout_access_token";
const REFRESH_TOKEN_KEY = "insideout_refresh_token";

/**
 * Application-level API error with optional HTTP status.
 */
export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Returns a persisted access token for authenticated requests.
 */
function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY) ?? localStorage.getItem("access_token");
}

function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function setRefreshedTokens(tokens: RefreshResponse): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  if (tokens.refresh_token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  }
}

function clearStoredTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Shared Axios instance used by all endpoint modules.
 *
 * Includes:
 * - sensible timeout defaults
 * - auth token injection
 * - error normalization for consistent UI handling
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessTokenIfPossible(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearStoredTokens();
    return false;
  }

  refreshPromise = axios
    .post<RefreshResponse>(
      `${API_BASE_URL}/auth/refresh`,
      null,
      {
        headers: {
          Authorization: `Bearer ${refreshToken}`,
          "Content-Type": "application/json",
        },
        timeout: 15_000,
      },
    )
    .then(({ data }) => {
      setRefreshedTokens(data);
      return true;
    })
    .catch(() => {
      clearStoredTokens();
      return false;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const status = error.response?.status;
    const payload = error.response?.data;
    const originalRequest = error.config as (typeof error.config & RetriableRequestConfig);

    const shouldAttemptRefresh =
      status === 401 &&
      Boolean(originalRequest) &&
      !originalRequest?._retry &&
      originalRequest?.url !== "/auth/refresh" &&
      (payload?.error === "token_expired" || payload?.message === "The token has expired.");

    if (shouldAttemptRefresh) {
      originalRequest._retry = true;
      const refreshed = await refreshAccessTokenIfPossible();
      const newAccessToken = getAccessToken();

      if (refreshed && newAccessToken) {
        const headers = AxiosHeaders.from(originalRequest.headers);
        headers.set("Authorization", `Bearer ${newAccessToken}`);
        originalRequest.headers = headers;
        return apiClient(originalRequest);
      }
    }

    const message =
      payload?.message ??
      payload?.description ??
      payload?.error ??
      error.message ??
      "An unexpected API error occurred.";

    return Promise.reject(new ApiError(message, status));
  },
);
