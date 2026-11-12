import { useLocation } from "@tanstack/react-router";

export const useIsAdminArea = () =>
  useLocation({
    select: (location) => /^\/admin(?:\/|$)/u.test(location.pathname),
  });
