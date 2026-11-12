import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

export const useSignOut = () => {
  const router = useRouter();

  return async () => {
    const { error } = await authClient.signOut();

    if (error) {
      toast.error("No pudimos cerrar tu sesión. Intenta de nuevo.");

      return;
    }

    await router.invalidate();
    await router.navigate({ to: "/" });
  };
};
