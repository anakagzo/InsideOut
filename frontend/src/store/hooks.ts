import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/store";

/**
 * Typed dispatch hook for Redux thunk support.
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();

/**
 * Typed selector hook for strongly-typed state selection.
 */
export const useAppSelector = useSelector.withTypes<RootState>();
