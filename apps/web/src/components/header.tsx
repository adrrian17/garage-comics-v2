import { Link } from "@tanstack/react-router";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

const Header = () => (
  <header className="bg-background border-foreground border-b-2">
    <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
      <Link
        to="/"
        className="font-heading flex items-center gap-2 text-lg font-extrabold tracking-tight sm:text-xl"
      >
        <span
          aria-hidden
          className="panel bg-secondary text-secondary-foreground grid size-8 place-items-center text-sm"
        >
          GC
        </span>
        Garage Cómics
      </Link>
      <div className="flex items-center gap-2">
        {/* The landing page carries the same call to action on narrow screens. */}
        <nav aria-label="Principal" className="hidden sm:block">
          <Link
            to="/propuesta"
            className="hover:text-primary data-[status=active]:text-primary focus-visible:ring-ring/50 rounded-sm px-2 text-sm font-semibold outline-none focus-visible:ring-3"
          >
            Manda tu propuesta
          </Link>
        </nav>
        <ModeToggle />
        <UserMenu />
      </div>
    </div>
  </header>
);

export default Header;
