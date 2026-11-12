import { Button, buttonVariants } from "@garage-comics/ui/components/button";
import { Link, useLocation, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";

const PageMessage = ({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) => {
  // The Admin layout already renders a main landmark and has its own home.
  const isAdminArea = useLocation({
    select: (location) => location.pathname.startsWith("/admin"),
  });

  const Wrapper = isAdminArea ? "div" : "main";

  return (
    <Wrapper
      className={
        isAdminArea
          ? "max-w-2xl"
          : "mx-auto w-full max-w-2xl px-4 py-12 sm:px-6"
      }
    >
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground mt-2">{description}</p>
      <div className="mt-8 flex flex-wrap gap-2">
        {action}
        <Link
          to={isAdminArea ? "/admin" : "/"}
          className={buttonVariants({ variant: "outline" })}
        >
          Volver al inicio
        </Link>
      </div>
    </Wrapper>
  );
};

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
