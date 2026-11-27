import { Link } from "@tanstack/react-router";

const linkGroups = [
  {
    title: "Tienda",
    links: [
      { to: "/catalogo", label: "Catálogo" },
      { to: "/autores", label: "Autores" },
      { to: "/carrito", label: "Carrito" },
    ],
  },
  {
    title: "Autores",
    links: [
      { to: "/propuesta", label: "Manda tu propuesta" },
      { to: "/entrar", label: "Entrar" },
    ],
  },
  {
    title: "Ayuda",
    links: [
      { to: "/faqs", label: "Preguntas frecuentes" },
      { to: "/reglas", label: "Reglas" },
    ],
  },
] as const;

// Evaluated once per Worker isolate; the year only lags until the next deploy or restart.
const currentYear = new Date().getFullYear();

const Footer = () => (
  <footer className="bg-foreground text-background">
    <div aria-hidden className="scallop-edge text-background" />
    <div className="mx-auto grid w-full max-w-6xl gap-x-12 gap-y-8 px-4 pt-10 pb-8 sm:px-6 sm:pt-14 md:grid-cols-[1fr_auto]">
      <p className="font-display max-w-md text-3xl leading-tight font-semibold tracking-tight text-balance max-sm:hidden">
        Cómics digitales de autores mexicanos, una Edición a la vez.
      </p>
      <nav
        aria-label="Pie de página"
        className="grid grid-cols-2 gap-x-16 gap-y-8 max-sm:gap-x-8 sm:grid-cols-3"
      >
        {linkGroups.map((group) => (
          <div key={group.title} className="flex flex-col gap-3">
            <h2 className="text-background/55 text-sm">{group.title}</h2>
            <ul className="flex flex-col gap-2">
              {group.links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="hover:text-print focus-visible:ring-print/60 rounded-sm text-sm transition-colors outline-none focus-visible:ring-3"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-background/15 flex flex-wrap items-center justify-between gap-4 border-t pt-6 md:col-span-2 md:mt-4">
        <img
          src="/logo.webp"
          alt="Garage Cómics"
          width={56}
          height={24}
          className="h-6 w-auto"
        />
        <p className="text-background/55 text-sm">
          © {currentYear} Garage Cómics · Hecho en México
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
