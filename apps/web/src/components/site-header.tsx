import { Link } from "@tanstack/react-router";

import { CartLink } from "@/components/cart-link";

const navLinkClass =
  "text-muted-foreground hover:text-foreground data-[status=active]:text-foreground data-[status=active]:decoration-print data-[status=active]:underline data-[status=active]:decoration-2 data-[status=active]:underline-offset-8 focus-visible:ring-ring/50 rounded-sm px-2 py-1 text-sm font-medium outline-none transition-colors focus-visible:ring-3";

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
      <nav aria-label="Principal" className="flex items-center gap-1 sm:gap-3">
        <Link to="/" activeOptions={{ exact: true }} className={navLinkClass}>
          Catálogo
        </Link>
        <Link to="/propuesta" className={navLinkClass}>
          Participa
        </Link>
        <span aria-hidden className="bg-border mx-1 h-5 w-px max-sm:hidden" />
        <CartLink />
      </nav>
    </div>
  </header>
);

export default SiteHeader;
