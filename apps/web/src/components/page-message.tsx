import { Button, buttonVariants } from "@garage-comics/ui/components/button";
import { Link, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";

import {
  SinglePage,
  pageHeadingClass,
  pageLeadClass,
} from "@/components/page-intro";
import { useDashboardHome } from "@/lib/use-dashboard-home";

export const PageMessage = ({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) => {
  // A dashboard layout already renders a main landmark and has its own home.
  const dashboardHome = useDashboardHome();

  const actions = (
    <div className="mt-10 flex flex-wrap gap-2">
      {action}
      <Link
        to={dashboardHome ?? "/"}
        className={buttonVariants({ variant: "outline" })}
      >
        Volver al inicio
      </Link>
    </div>
  );

  if (dashboardHome !== undefined) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-2">{description}</p>
        {actions}
      </div>
    );
  }

  return (
    <SinglePage>
      <h1 className={pageHeadingClass}>{title}</h1>
      <p className={pageLeadClass}>{description}</p>
      {actions}
    </SinglePage>
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
