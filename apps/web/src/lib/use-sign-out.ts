import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { logoutConnect } from "@/lib/stripe-connect";

export const useSignOut = () => async () => {
  const { error } = await authClient.signOut();

  if (error) {
    toast.error("No pudimos cerrar tu sesión. Intenta de nuevo.");

    return;
  }

  await logoutConnect();
  // A full page load drops what this tab still holds for the signed-out user: loader data and the Connect.js session, which cannot restart in the same page.
  window.location.assign("/");
};
