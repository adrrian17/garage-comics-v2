import { Link } from "@tanstack/react-router";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

const Header = () => (
  <header className="border-foreground border-b-2">
    <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
      <Link
        to="/"
        className="font-heading text-xl font-extrabold tracking-tight"
      >
        Garage Cómics
      </Link>
      <div className="flex items-center gap-2">
        <ModeToggle />
        <UserMenu />
      </div>
    </div>
  </header>
);

export default Header;
