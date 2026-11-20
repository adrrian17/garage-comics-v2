import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@garage-comics/ui/components/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@garage-comics/ui/components/table";

import type { getMySales } from "@/functions/sales";
import { formatCentavos, formatShortDateTime } from "@/lib/format";

export type Sale = Awaited<ReturnType<typeof getMySales>>[number];

/** The Author's sold comics, shared by the Author area and an Admin's own area. */
export const SalesTable = ({ sales }: { sales: Sale[] }) => {
  if (sales.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Todavía no hay ventas</EmptyTitle>
          <EmptyDescription>
            Aquí verás cada cómic que se compre, con tu parte de la venta.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cómic</TableHead>
          <TableHead>Edición</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Número de compra</TableHead>
          <TableHead>Precio</TableHead>
          <TableHead>Comisión</TableHead>
          <TableHead>Tu parte</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sales.map((sale) => (
          <TableRow key={sale.orderItemId}>
            <TableCell>{sale.title}</TableCell>
            <TableCell>{sale.editionName}</TableCell>
            <TableCell>{formatShortDateTime(sale.paidAt)}</TableCell>
            <TableCell>{sale.orderNumber}</TableCell>
            <TableCell>{formatCentavos(sale.priceCentavos)}</TableCell>
            <TableCell>{formatCentavos(sale.commissionCentavos)}</TableCell>
            <TableCell>{formatCentavos(sale.shareCentavos)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
