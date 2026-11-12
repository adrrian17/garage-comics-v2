import { env } from "cloudflare:workers";

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
  text: `Gracias por mandar tu propuesta para ${editionName}. Esta vez no fue aceptada.\n\nPuedes volver a intentarlo en la próxima Edición.`,
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
