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
