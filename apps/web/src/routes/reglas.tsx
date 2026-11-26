import { EXCLUSIVE_PAGES } from "@garage-comics/db/schema/comics";
import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { HelpPage, HelpSection, ProposalAction } from "@/components/help-page";
import { getActiveEdition } from "@/functions/editions";
import { COMMISSION_PERCENT } from "@/lib/commission";
import { formatDate, formatDateTime } from "@/lib/format";
import { ACCEPTANCE_TTL_DAYS } from "@/lib/proposal";

type ActiveEdition = Awaited<ReturnType<typeof getActiveEdition>>;

interface Rule {
  id: string;
  text: ReactNode;
}

interface RuleSection {
  title: string;
  rules: Rule[];
}

const proposalWindow = (edition: ActiveEdition): ReactNode => {
  if (
    edition === null ||
    edition.phase === "closed" ||
    edition.phase === "sales"
  ) {
    return "Cada Edición tiene su propia convocatoria. Anunciamos sus fechas en la página de inicio.";
  }

  return (
    <>
      Las propuestas para {edition.name} se reciben del{" "}
      <strong>{formatDate(edition.proposalsOpenAt)}</strong> al{" "}
      <strong>{formatDateTime(edition.proposalsCloseAt)}</strong>.
    </>
  );
};

const ruleSections = (edition: ActiveEdition): RuleSection[] => [
  {
    title: "Convocatoria",
    rules: [
      { id: "window", text: proposalWindow(edition) },
      {
        id: "late",
        text: "No recibimos propuestas después del cierre de la convocatoria.",
      },
      {
        id: "team",
        text: "Puedes participar solo o en equipo, con una sola Inscripción por persona o equipo.",
      },
      {
        id: "registration",
        text: `Si aceptamos tu propuesta, tienes ${ACCEPTANCE_TTL_DAYS} días para pagar tu Inscripción. Si no la pagas a tiempo, tu lugar se libera.`,
      },
    ],
  },
  {
    title: "Tu Exclusivo de la edición",
    rules: [
      {
        id: "unpublished",
        text: "Tiene que ser inédito: no puede haberse publicado antes, ni en digital ni en físico, aunque haya sido meses antes de la Edición.",
      },
      {
        id: "pages",
        text: `Tiene de ${EXCLUSIVE_PAGES.min} a ${EXCLUSIVE_PAGES.max} páginas. La portada y los créditos no cuentan.`,
      },
      {
        id: "technique",
        text: "Puede estar hecho en digital o en tradicional.",
      },
      {
        id: "previous",
        text: "Además puedes vender hasta dos Trabajos previos de cualquier extensión, incluido un Exclusivo de una Edición anterior.",
      },
      {
        id: "hold",
        text: "Al terminar la Edición, te pedimos esperar 3 meses antes de publicar tu Exclusivo en otro lado, para que su venta aquí tenga más fuerza.",
      },
    ],
  },
  {
    title: "Contenido",
    rules: [
      {
        id: "audience",
        text: "Tu cómic puede ser de cualquier género, pero apto para todo público: no aceptamos contenido gráfico, como violencia gráfica o verbal o desnudos.",
      },
      {
        id: "ai",
        text: "No aceptamos cómics hechos con inteligencia artificial, ni en parte ni completos. Un cómic hecho con IA se descalifica, se quita de la venta al momento y reembolsamos a quienes lo compraron.",
      },
      {
        id: "fan-art",
        text: "No aceptamos fan art: todo cómic debe ser original y no derivado de una obra ajena.",
      },
      {
        id: "review",
        text: "Revisamos cada cómic antes de ponerlo a la venta. Si lo rechazamos, te decimos por qué para que puedas corregirlo.",
      },
    ],
  },
];

const terms = [
  {
    id: "share",
    text: `Recibes el ${100 - COMMISSION_PERCENT}% de cada venta. La Comisión del ${COMMISSION_PERCENT}% que se queda Garage Cómics ya cubre las comisiones de pago de Stripe.`,
  },
  {
    id: "payee",
    text: "El dinero de tus ventas llega a la cuenta de quien pagó la Inscripción. Si participan en equipo, repartirlo es responsabilidad del equipo: los Colaboradores no reciben dinero de Garage Cómics.",
  },
  {
    id: "rights",
    text: "Garage Cómics solo tiene permiso de distribuir tu cómic mientras dura la Edición. Los derechos son totalmente tuyos.",
  },
  {
    id: "after",
    text: "Cuando termina la Edición, tus cómics dejan de estar a la venta en el sitio.",
  },
] as const satisfies Rule[];

/** Numbers continue across sections, so each list starts where the previous one ended. */
const withStarts = (sections: RuleSection[]) =>
  sections.map((section, index) => ({
    ...section,
    start:
      1 +
      sections
        .slice(0, index)
        .reduce((total, previous) => total + previous.rules.length, 0),
  }));

const RuleList = ({ rules, start }: { rules: Rule[]; start: number }) => (
  <ol start={start} className="border-t">
    {rules.map((rule, index) => (
      <li
        key={rule.id}
        className="[&_strong]:text-foreground grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-3 border-b py-5 leading-relaxed text-pretty [&_strong]:font-semibold"
      >
        <span
          aria-hidden
          className="font-display text-print text-lg leading-snug font-semibold tabular-nums"
        >
          {String(start + index).padStart(2, "0")}
        </span>
        <span>{rule.text}</span>
      </li>
    ))}
  </ol>
);

const RulesPage = () => {
  const edition = Route.useLoaderData();

  return (
    <HelpPage
      eyebrow="Para Autores"
      title="Reglas para participar"
      lead="Lo que tu cómic necesita para venderse en una Edición de Garage Cómics. Léelas antes de mandar tu propuesta."
      sibling={{ to: "/faqs", label: "Preguntas frecuentes" }}
      action={edition?.phase === "proposals" ? <ProposalAction /> : undefined}
    >
      {withStarts(ruleSections(edition)).map((section) => (
        <HelpSection key={section.title} title={section.title}>
          <RuleList rules={section.rules} start={section.start} />
        </HelpSection>
      ))}
      <section className="bg-paper-deep rounded-3xl p-6 sm:p-10">
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Tu dinero y tus derechos
        </h2>
        <ul className="mt-6 flex flex-col gap-4">
          {terms.map((term) => (
            <li
              key={term.id}
              className="before:bg-print relative pl-6 leading-relaxed text-pretty before:absolute before:top-[0.6em] before:left-0 before:size-2 before:rounded-full"
            >
              {term.text}
            </li>
          ))}
        </ul>
      </section>
    </HelpPage>
  );
};

export const Route = createFileRoute("/reglas")({
  loader: async () => await getActiveEdition(),
  head: () => ({
    meta: [
      { title: "Reglas para participar · Garage Cómics" },
      {
        name: "description",
        content:
          "Las reglas para vender tus cómics en Garage Cómics: convocatoria, Exclusivo de la edición, contenido, Comisión y derechos.",
      },
    ],
  }),
  component: RulesPage,
});
