import { Button } from "@garage-comics/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@garage-comics/ui/components/dropdown-menu";
import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";

import { CartLink } from "@/components/cart-link";

const navLinks = [
  { to: "/catalogo", label: "Catálogo" },
  { to: "/propuesta", label: "Participa" },
  { to: "/reglas", label: "Reglas" },
  { to: "/faqs", label: "Preguntas frecuentes" },
] as const;

const navLinkClass =
  "text-muted-foreground hover:text-foreground data-[status=active]:text-foreground data-[status=active]:decoration-print data-[status=active]:underline data-[status=active]:decoration-2 data-[status=active]:underline-offset-8 focus-visible:ring-ring/50 rounded-sm px-2 py-1 text-sm font-medium outline-none transition-colors focus-visible:ring-3";

// Four links and the cart do not fit beside the logo on a phone, so there they live in a menu.
const MobileMenu = () => (
  <DropdownMenu>
    <DropdownMenuTrigger
      render={<Button variant="outline" size="icon-sm" />}
      aria-label="Menú"
    >
      <Menu />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="min-w-48">
      {navLinks.map((link) => (
        <DropdownMenuItem key={link.to} render={<Link to={link.to} />}>
          {link.label}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);

const SiteHeader = () => (
  <header className="bg-background/85 supports-backdrop-filter:bg-background/70 sticky top-0 z-40 border-b backdrop-blur-md">
    <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
      <Link
        to="/"
        className="focus-visible:ring-ring/50 shrink-0 rounded-sm outline-none focus-visible:ring-3"
      >
        <img
          src="/logo.webp"
          alt="Garage Cómics"
          width={130}
          height={56}
          className="h-10 w-auto"
        />
      </Link>
      <nav aria-label="Principal" className="flex items-center gap-2 md:gap-3">
        <ul className="flex items-center gap-1 max-md:hidden lg:gap-2">
          {navLinks.map((link) => (
            <li key={link.to}>
              <Link to={link.to} className={navLinkClass}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <span aria-hidden className="bg-border mx-1 h-5 w-px max-md:hidden" />
        <CartLink />
        <div className="md:hidden">
          <MobileMenu />
        </div>
      </nav>
    </div>
  </header>
);

export default SiteHeader;
