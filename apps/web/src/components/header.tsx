import { Link } from "@tanstack/react-router";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export const publicLinks = [
  { to: "/", label: "Inicio" },
  { to: "/propuesta", label: "Participa" },
] as const;

const Header = () => (
  <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
    <div className="mx-auto grid h-16 w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 sm:gap-4 sm:px-6">
      <Link
        to="/"
        aria-label="Garage Cómics, inicio"
        className="focus-visible:ring-ring/50 w-fit rounded-md outline-none focus-visible:ring-3"
      >
        <img
          src="/logo.webp"
          alt="Garage Cómics"
          width={93}
          height={40}
          className="h-10 w-auto max-w-none"
        />
      </Link>
      <nav aria-label="Principal" className="flex items-center gap-4 sm:gap-6">
        {publicLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            activeOptions={{ exact: true }}
            className="text-muted-foreground hover:text-foreground data-[status=active]:text-foreground focus-visible:ring-ring/50 rounded-sm text-sm font-medium outline-none focus-visible:ring-3"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="col-start-3 flex items-center justify-end gap-2">
        <div className="hidden sm:block">
          <ModeToggle />
        </div>
        <UserMenu />
      </div>
    </div>
  </header>
);

export default Header;
