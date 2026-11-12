import { env } from "cloudflare:workers";
import { log } from "evlog";

interface Email {
  to: string;
  subject: string;
  text: string;
}

const SIGNATURE = "\n\nGarage Cómics";

export const sendEmail = async ({ to, subject, text }: Email) => {
  await env.EMAIL.send({
    from: { name: "Garage Cómics", email: env.EMAIL_FROM },
    to,
    subject,
    text: text + SIGNATURE,
  });
};

// The change it reports is already saved, so a failed send is logged instead of shown as a failed save.
export const sendNotification = async (email: Email) => {
  try {
    await sendEmail(email);
  } catch (error) {
    log.error({
      action: "send_notification",
      subject: email.subject,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const magicLinkEmail = (url: string) => ({
  subject: "Tu link para entrar a Garage Cómics",
  text: `Entra a Garage Cómics con este link:\n\n${url}\n\nFunciona una sola vez y vence en 5 minutos. Si no lo pediste, ignora este correo.`,
});

export const proposalReceivedEmail = (editionName: string) => ({
  subject: `Recibimos tu propuesta para ${editionName}`,
  text: `¡Gracias por mandar tu propuesta para ${editionName}!\n\nLa vamos a revisar y te escribiremos a este correo cuando tengamos una respuesta.`,
});

export const proposalNotAcceptedEmail = (editionName: string) => ({
  subject: `Tu propuesta para ${editionName}`,
  text: `Gracias por mandar tu propuesta para ${editionName}. Esta vez no fue aceptada.\n\nSi quieres, puedes mandar una nueva propuesta mientras la convocatoria siga abierta.`,
});

export const proposalAcceptedEmail = ({
  editionName,
  registrationPrice,
  deadline,
}: {
  editionName: string;
  registrationPrice: string;
  deadline: string;
}) => ({
  subject: `¡Tu propuesta para ${editionName} fue aceptada!`,
  text: `¡Felicidades! Tu propuesta para ${editionName} fue aceptada.\n\nPara asegurar tu lugar, paga tu Inscripción de ${registrationPrice} antes del ${deadline}. Te mandaremos el link de pago en otro correo.\n\nSi no pagas antes de esa fecha, tu lugar se libera.`,
});
