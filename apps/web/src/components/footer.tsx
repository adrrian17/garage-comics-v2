import { Link } from "@tanstack/react-router";

import { publicLinks } from "./header";

// Evaluated once per Worker isolate; the year only lags until the next deploy or restart.
const currentYear = new Date().getFullYear();

const Footer = () => (
  <footer className="border-t">
    <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-8">
      <div className="flex items-center gap-3">
        <img
          src="/logo.webp"
          alt="Garage Cómics"
          width={56}
          height={24}
          className="h-6 w-auto"
        />
        <p className="text-muted-foreground text-sm">
          © {currentYear} Garage Cómics
        </p>
      </div>
      <nav aria-label="Pie de página" className="flex items-center gap-6">
        {publicLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            activeOptions={{ exact: true }}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 rounded-sm text-sm outline-none focus-visible:ring-3"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  </footer>
);

export default Footer;
