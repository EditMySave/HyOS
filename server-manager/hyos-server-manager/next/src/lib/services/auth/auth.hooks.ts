import useSWR from "swr";
import { getAuthStatus } from "./auth.service";
import type { AuthStatusResponse } from "./auth.types";

export function useAuthStatus() {
  return useSWR<AuthStatusResponse>("auth-status", getAuthStatus);
}
