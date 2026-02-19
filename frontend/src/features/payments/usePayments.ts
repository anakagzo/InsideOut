import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectCreateStripeCheckoutError,
  selectCreateStripeCheckoutStatus,
  selectFinalizeStripeSessionError,
  selectFinalizeStripeSessionStatus,
  selectOnboardingTokenValidation,
  selectStripeFinalizeResult,
  selectValidateOnboardingTokenError,
  selectValidateOnboardingTokenStatus,
} from "@/store/selectors/paymentsSelectors";
import {
  createStripeCheckoutSession,
  finalizeStripeSession,
  validateOnboardingToken,
} from "@/store/thunks";

/**
 * Payment state and actions hook.
 *
 * Keeps payment-related store wiring out of page components.
 */
export function usePayments() {
  const dispatch = useAppDispatch();

  const createCheckoutStatus = useAppSelector(selectCreateStripeCheckoutStatus);
  const createCheckoutError = useAppSelector(selectCreateStripeCheckoutError);
  const finalizeCheckoutStatus = useAppSelector(selectFinalizeStripeSessionStatus);
  const finalizeCheckoutError = useAppSelector(selectFinalizeStripeSessionError);
  const stripeFinalizeResult = useAppSelector(selectStripeFinalizeResult);
  const tokenValidationStatus = useAppSelector(selectValidateOnboardingTokenStatus);
  const tokenValidationError = useAppSelector(selectValidateOnboardingTokenError);
  const tokenValidationResponse = useAppSelector(selectOnboardingTokenValidation);

  const startStripeCheckout = useCallback(
    (courseId: number) => dispatch(createStripeCheckoutSession({ course_id: courseId })).unwrap(),
    [dispatch],
  );

  const finalizeStripePayment = useCallback(
    (sessionId: string) => dispatch(finalizeStripeSession({ session_id: sessionId })).unwrap(),
    [dispatch],
  );

  const validateToken = useCallback(
    (token: string, courseId: number) => dispatch(validateOnboardingToken({ token, course_id: courseId })),
    [dispatch],
  );

  return {
    createCheckoutStatus,
    createCheckoutError,
    finalizeCheckoutStatus,
    finalizeCheckoutError,
    stripeFinalizeResult,
    tokenValidationStatus,
    tokenValidationError,
    tokenValidationResponse,
    startStripeCheckout,
    finalizeStripePayment,
    validateToken,
  };
}