/**
 * Shared async request state helpers for Redux slices.
 */

export type RequestStatus = "idle" | "loading" | "succeeded" | "failed";

export interface RequestState {
  status: RequestStatus;
  error: string | null;
}

export const createRequestState = (): RequestState => ({
  status: "idle",
  error: null,
});

export const setPending = (target: RequestState) => {
  target.status = "loading";
  target.error = null;
};

export const setSucceeded = (target: RequestState) => {
  target.status = "succeeded";
  target.error = null;
};

export const setFailed = (target: RequestState, error?: string) => {
  target.status = "failed";
  target.error = error ?? "Request failed.";
};
