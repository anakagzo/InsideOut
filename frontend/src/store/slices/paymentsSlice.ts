import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { paymentsApi } from "@/api/insideoutApi";
import type {
  OnboardingTokenValidatePayload,
  OnboardingTokenValidateResponse,
  StripeCheckoutSessionPayload,
  StripeCheckoutSessionResponse,
  StripeFinalizePayload,
  StripeFinalizeResponse,
} from "@/api/types";
import { createRequestState, setFailed, setPending, setSucceeded } from "@/store/slices/requestState";

export const createStripeCheckoutSession = createAsyncThunk(
  "payments/createStripeCheckoutSession",
  async (payload: StripeCheckoutSessionPayload) => paymentsApi.createStripeCheckoutSession(payload),
);

export const finalizeStripeSession = createAsyncThunk(
  "payments/finalizeStripeSession",
  async (payload: StripeFinalizePayload) => paymentsApi.finalizeStripeSession(payload),
);

export const validateOnboardingToken = createAsyncThunk(
  "payments/validateOnboardingToken",
  async (payload: OnboardingTokenValidatePayload) => paymentsApi.validateOnboardingToken(payload),
);

interface PaymentsState {
  stripeCheckoutSession: StripeCheckoutSessionResponse | null;
  stripeFinalizeResult: StripeFinalizeResponse | null;
  onboardingTokenValidation: OnboardingTokenValidateResponse | null;
  requests: {
    createStripeCheckoutSession: ReturnType<typeof createRequestState>;
    finalizeStripeSession: ReturnType<typeof createRequestState>;
    validateOnboardingToken: ReturnType<typeof createRequestState>;
  };
}

const initialState: PaymentsState = {
  stripeCheckoutSession: null,
  stripeFinalizeResult: null,
  onboardingTokenValidation: null,
  requests: {
    createStripeCheckoutSession: createRequestState(),
    finalizeStripeSession: createRequestState(),
    validateOnboardingToken: createRequestState(),
  },
};

const paymentsSlice = createSlice({
  name: "payments",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(createStripeCheckoutSession.pending, (state) => {
        state.stripeCheckoutSession = null;
        setPending(state.requests.createStripeCheckoutSession);
      })
      .addCase(createStripeCheckoutSession.fulfilled, (state, action) => {
        state.stripeCheckoutSession = action.payload;
        setSucceeded(state.requests.createStripeCheckoutSession);
      })
      .addCase(createStripeCheckoutSession.rejected, (state, action) => {
        state.stripeCheckoutSession = null;
        setFailed(state.requests.createStripeCheckoutSession, action.error.message);
      })
      .addCase(finalizeStripeSession.pending, (state) => {
        state.stripeFinalizeResult = null;
        setPending(state.requests.finalizeStripeSession);
      })
      .addCase(finalizeStripeSession.fulfilled, (state, action) => {
        state.stripeFinalizeResult = action.payload;
        setSucceeded(state.requests.finalizeStripeSession);
      })
      .addCase(finalizeStripeSession.rejected, (state, action) => {
        state.stripeFinalizeResult = null;
        setFailed(state.requests.finalizeStripeSession, action.error.message);
      })
      .addCase(validateOnboardingToken.pending, (state) => {
        state.onboardingTokenValidation = null;
        setPending(state.requests.validateOnboardingToken);
      })
      .addCase(validateOnboardingToken.fulfilled, (state, action) => {
        state.onboardingTokenValidation = action.payload;
        setSucceeded(state.requests.validateOnboardingToken);
      })
      .addCase(validateOnboardingToken.rejected, (state, action) => {
        state.onboardingTokenValidation = null;
        setFailed(state.requests.validateOnboardingToken, action.error.message);
      });
  },
});

export default paymentsSlice.reducer;