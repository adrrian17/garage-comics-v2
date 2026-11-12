import { Button, buttonVariants } from "@garage-comics/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@garage-comics/ui/components/dropdown-menu";
import { Link, useRouteContext, useRouter } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, UserRound } from "lucide-react";

import { authClient } from "@/lib/auth-client";

const UserMenu = () => {
  const router = useRouter();
  const { session } = useRouteContext({ from: "__root__" });

  if (!session) {
    return (
      <Link to="/entrar" className={buttonVariants({ variant: "outline" })}>
        Entrar
      </Link>
    );
  }

  const signOut = async () => {
    await authClient.signOut();
    await router.invalidate();
    await router.navigate({ to: "/" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="icon" />}
        aria-label="Mi cuenta"
      >
        <UserRound />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{session.user.email}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {session.user.role === "admin" ? (
            <DropdownMenuItem render={<Link to="/admin" />}>
              <LayoutDashboard />
              Administración
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            onClick={() => {
              void signOut();
            }}
          >
            <LogOut />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
