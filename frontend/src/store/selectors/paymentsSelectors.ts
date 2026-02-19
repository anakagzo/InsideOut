import type { RootState } from "@/store";

export const selectCreateStripeCheckoutStatus = (state: RootState) =>
  state.payments.requests.createStripeCheckoutSession.status;

export const selectCreateStripeCheckoutError = (state: RootState) =>
  state.payments.requests.createStripeCheckoutSession.error;

export const selectFinalizeStripeSessionStatus = (state: RootState) =>
  state.payments.requests.finalizeStripeSession.status;

export const selectFinalizeStripeSessionError = (state: RootState) =>
  state.payments.requests.finalizeStripeSession.error;

export const selectStripeFinalizeResult = (state: RootState) => state.payments.stripeFinalizeResult;

export const selectValidateOnboardingTokenStatus = (state: RootState) =>
  state.payments.requests.validateOnboardingToken.status;

export const selectValidateOnboardingTokenError = (state: RootState) =>
  state.payments.requests.validateOnboardingToken.error;

export const selectOnboardingTokenValidation = (state: RootState) => state.payments.onboardingTokenValidation;