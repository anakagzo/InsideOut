import { useEffect, useRef } from "react";
import { Navigate, Outlet } from "react-router-dom";
import type { User } from "@/api/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchCurrentUser } from "@/store/thunks";
import { toast } from "sonner";

type ProtectedRouteProps = {
  allowedRoles?: User["role"][];
  redirectTo?: string;
};

type RedirectWithToastProps = {
  to: string;
  message: string;
};

const RedirectWithToast = ({ to, message }: RedirectWithToastProps) => {
  const hasNotifiedRef = useRef(false);

  useEffect(() => {
    if (hasNotifiedRef.current) {
      return;
    }

    toast.error(message);
    hasNotifiedRef.current = true;
  }, [message]);

  return <Navigate to={to} replace />;
};

export const ProtectedRoute = ({ allowedRoles, redirectTo = "/" }: ProtectedRouteProps) => {
  const dispatch = useAppDispatch();

  const accessToken = useAppSelector((state) => state.users.auth.accessToken);
  const currentUser = useAppSelector((state) => state.users.currentUser);
  const fetchMeStatus = useAppSelector((state) => state.users.requests.fetchMe.status);

  const isAuthenticated = Boolean(accessToken);
  const shouldFetchCurrentUser = isAuthenticated && !currentUser && fetchMeStatus === "idle";

  useEffect(() => {
    if (!shouldFetchCurrentUser) {
      return;
    }

    dispatch(fetchCurrentUser());
  }, [dispatch, shouldFetchCurrentUser]);

  if (!isAuthenticated) {
    return <RedirectWithToast to={redirectTo} message="Please sign in to access this page." />;
  }

  if (!currentUser) {
    if (fetchMeStatus === "loading" || fetchMeStatus === "idle") {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-muted-foreground">Loading account...</p>
        </div>
      );
    }

    return (
      <RedirectWithToast
        to={redirectTo}
        message="Unable to verify your account right now. Please sign in again."
      />
    );
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <RedirectWithToast to="/account" message="This page is only available to students." />;
  }

  return <Outlet />;
};
