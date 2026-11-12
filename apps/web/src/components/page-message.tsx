import { Button, buttonVariants } from "@garage-comics/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@garage-comics/ui/components/card";
import { Link, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";

const PageMessage = ({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) => (
  <main className="mx-auto w-full max-w-xl px-4 py-12 sm:py-20">
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-2xl font-extrabold">{title}</h1>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {action}
          <Link to="/" className={buttonVariants({ variant: "outline" })}>
            Volver al inicio
          </Link>
        </div>
      </CardContent>
    </Card>
  </main>
);

export const NotFound = () => (
  <PageMessage
    title="No encontramos esta página"
    description="Puede que el link esté mal escrito o que la página ya no exista."
  />
);

export const PageError = () => {
  const router = useRouter();

  return (
    <PageMessage
      title="Algo salió mal"
      description="No pudimos cargar esta página. Intenta de nuevo en un momento."
      action={
        <Button
          onClick={() => {
            void router.invalidate();
          }}
        >
          Intentar de nuevo
        </Button>
      }
    />
  );
};
