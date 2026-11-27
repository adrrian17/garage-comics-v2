import { COMIC_MIN_PRICE_MXN } from "@garage-comics/db/schema/comics";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import type { ReactNode } from "react";

import {
  ContactEmail,
  HelpPage,
  HelpSection,
  ProposalAction,
  inlineLinkClass,
} from "@/components/help-page";
import { getActiveEdition } from "@/functions/editions";
import { OXXO_VOUCHER_DAYS } from "@/lib/checkout";
import { COMMISSION_PERCENT } from "@/lib/commission";
import { DOWNLOAD_LINK_HOURS } from "@/lib/download-link";
import { formatDateTime, formatMxn } from "@/lib/format";
import { ACCEPTANCE_TTL_DAYS } from "@/lib/proposal";

type ActiveEdition = Awaited<ReturnType<typeof getActiveEdition>>;

interface Question {
  question: string;
  answer: ReactNode;
}

const salesWindow = (edition: ActiveEdition): ReactNode => {
  if (edition === null || edition.phase === "closed") {
    return "Garage Cómics abre por tiempo limitado, una Edición a la vez. Anunciamos las fechas de la próxima en la página de inicio.";
  }

  if (edition.phase === "sales") {
    return (
      <>
        Ahora mismo: {edition.name} está a la venta hasta el{" "}
        <strong>{formatDateTime(edition.salesCloseAt)}</strong>.
      </>
    );
  }

  return (
    <>
      La venta de {edition.name} abre el{" "}
      <strong>{formatDateTime(edition.salesOpenAt)}</strong> y cierra el{" "}
      <strong>{formatDateTime(edition.salesCloseAt)}</strong>.
    </>
  );
};

const customerQuestions = (edition: ActiveEdition): Question[] => [
  {
    question: "¿Recibo mis cómics en físico?",
    answer:
      "No. Todos los cómics de Garage Cómics son digitales: los descargas en PDF, con tu correo y tu Número de compra en el pie de cada página.",
  },
  {
    question: "¿Cuándo puedo comprar?",
    answer: salesWindow(edition),
  },
  {
    question: "¿Necesito una cuenta para comprar?",
    answer:
      "No. Al pagar solo nos das tu correo, y ahí te llegan tu Número de compra y tu Link de descarga.",
  },
  {
    question: "¿Cómo puedo pagar?",
    answer: `Con tarjeta o en efectivo en OXXO. Si eliges OXXO, recibes una ficha que vence en ${OXXO_VOUCHER_DAYS} días y tu Compra se confirma cuando pagas en la tienda. Si no pagas a tiempo, la Compra se cancela y no se te cobra nada.`,
  },
  {
    question: "¿Cómo descargo mis cómics?",
    answer: `En cuanto se confirma tu pago, te mandamos un correo con tu Número de compra y tu Link de descarga. El link funciona durante ${DOWNLOAD_LINK_HOURS} horas y puedes descargar tus cómics las veces que quieras en ese tiempo, así que bájalos en cuanto te llegue.`,
  },
  {
    question: "Se me venció mi Link de descarga, ¿qué hago?",
    answer: (
      <>
        Escríbenos a <ContactEmail /> con tu Número de compra y te mandamos un
        Link de descarga nuevo.
      </>
    ),
  },
  {
    question: "La descarga de mis cómics va muy lenta",
    answer:
      "Te pedimos paciencia: un cómic puede pesar cientos de MB y durante la venta mucha gente descarga al mismo tiempo. Te recomendamos descargar desde una computadora con buena conexión, en lugar del teléfono o la tableta.",
  },
  {
    question: "¿Se puede cancelar una Compra o pedir un reembolso?",
    answer:
      "Garage Cómics no cancela Compras ni hace reembolsos, así que revisa tu carrito antes de pagar. La única excepción es que un cómic que compraste resulte hecho con inteligencia artificial: revisamos cada cómic antes de venderlo para evitarlo, pero si llega a pasar, te devolvemos tu dinero.",
  },
];

const authorQuestions: Question[] = [
  {
    question: "¿Cómo participo con mi cómic?",
    answer: (
      <>
        Manda una Propuesta mientras la convocatoria esté abierta: no necesitas
        cuenta y no cuesta nada. Si la aceptamos, te mandamos un link para pagar
        tu Inscripción, válido por {ACCEPTANCE_TTL_DAYS} días, y al pagarla se
        crea tu cuenta de Autor. Antes de mandarla, lee las{" "}
        <Link to="/reglas" className={inlineLinkClass}>
          reglas
        </Link>
        .
      </>
    ),
  },
  {
    question: "¿Qué cómics puedo vender?",
    answer:
      "En cada Edición vendes un Exclusivo de la edición, un cómic inédito hecho para ella, y hasta dos Trabajos previos que ya hayas publicado, incluido un Exclusivo de una Edición anterior.",
  },
  {
    question: "¿Cuánto dinero me toca de cada venta?",
    answer: `El ${100 - COMMISSION_PERCENT}% del precio de cada cómic vendido. Garage Cómics se queda con una Comisión del ${COMMISSION_PERCENT}%, que ya cubre las tarifas de pago de Stripe. Tú pones el precio, en pesos enteros y desde ${formatMxn(COMIC_MIN_PRICE_MXN)}.`,
  },
  {
    question: "¿Cuándo recibo mi dinero?",
    answer:
      "Por cada cómic vendido te hacemos un Envío de fondos a tu saldo de Stripe, que llega cuando el pago de esa Compra está disponible. Cada lunes, Stripe hace una Transferencia a tu banco con el saldo que tengas disponible.",
  },
  {
    question: "¿Garage Cómics se queda con los derechos de mi cómic?",
    answer:
      "No. Tu obra es tuya. Solo tenemos permiso de venderla mientras dura la Edición; cuando cierra la venta, tus cómics dejan de estar a la venta en el sitio.",
  },
];

const QuestionItem = ({ question, answer }: Question) => (
  <details className="group border-b [&_summary::-webkit-details-marker]:hidden">
    <summary className="focus-visible:ring-ring/50 flex cursor-pointer list-none items-start justify-between gap-6 rounded-sm py-5 text-lg font-semibold outline-none focus-visible:ring-3">
      {question}
      <Plus
        aria-hidden
        className="text-print mt-1 size-5 shrink-0 transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
      />
    </summary>
    <div className="text-muted-foreground [&_strong]:text-foreground -mt-1 max-w-2xl pb-6 leading-relaxed text-pretty [&_strong]:font-semibold">
      {answer}
    </div>
  </details>
);

const QuestionList = ({ questions }: { questions: Question[] }) => (
  <div className="border-t">
    {questions.map((item) => (
      <QuestionItem key={item.question} {...item} />
    ))}
  </div>
);

const FaqPage = () => {
  const edition = Route.useLoaderData();

  return (
    <HelpPage
      eyebrow="Ayuda"
      title="Preguntas frecuentes"
      lead="Lo que más nos preguntan sobre comprar en Garage Cómics y sobre vender tus cómics en una Edición."
      sibling={{ to: "/reglas", label: "Reglas para participar" }}
      action={edition?.phase === "proposals" ? <ProposalAction /> : undefined}
    >
      <HelpSection title="Comprar">
        <QuestionList questions={customerQuestions(edition)} />
      </HelpSection>
      <HelpSection title="Vender tus cómics">
        <QuestionList questions={authorQuestions} />
      </HelpSection>
    </HelpPage>
  );
};

export const Route = createFileRoute("/faqs")({
  loader: async () => await getActiveEdition(),
  head: () => ({
    meta: [
      { title: "Preguntas frecuentes · Garage Cómics" },
      {
        name: "description",
        content:
          "Cómo comprar y descargar cómics digitales en Garage Cómics, cómo pagar con tarjeta u OXXO y cómo vender tus cómics en una Edición.",
      },
    ],
  }),
  component: FaqPage,
});
