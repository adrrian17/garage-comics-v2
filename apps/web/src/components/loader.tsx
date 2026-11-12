import { Loader2 } from "lucide-react";

const Loader = () => (
  <output className="flex h-full items-center justify-center pt-8">
    <Loader2 aria-hidden className="animate-spin" />
    <span className="sr-only">Cargando…</span>
  </output>
);

export default Loader;
