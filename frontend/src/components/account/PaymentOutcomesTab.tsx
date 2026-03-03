import { useEffect, useState } from "react";
import { notificationSettingsApi } from "@/api/insideoutApi";
import type { PaymentNotificationOutcome } from "@/api/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAYMENT_OUTCOMES_PAGE_STEP = 20;

export const PaymentOutcomesTab = () => {
  const [rows, setRows] = useState<PaymentNotificationOutcome[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadedCount = rows.length;
  const hasMore = loadedCount < total;

  const load = async (page: number, append: boolean) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await notificationSettingsApi.listPaymentOutcomes({
        page,
        page_size: PAYMENT_OUTCOMES_PAGE_STEP,
        status: statusFilter === "all" ? undefined : statusFilter,
      });
      setRows((previous) => {
        if (!append) {
          return response.data;
        }

        const byId = new Map<number, PaymentNotificationOutcome>();
        previous.forEach((item) => byId.set(item.id, item));
        response.data.forEach((item) => byId.set(item.id, item));
        return [...byId.values()];
      });
      setTotal(response.pagination.total);
    } catch {
      setError("Unable to load payment email outcomes right now.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load(currentPage, currentPage > 1);
  }, [currentPage, statusFilter]);

  if (isLoading && rows.length === 0) {
    return <p className="text-muted-foreground">Loading payment email outcomes...</p>;
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={() => void load(currentPage, currentPage > 1)}>Retry</Button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="space-y-3">
        <div className="w-full sm:w-44">
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-muted-foreground">No payment email outcomes for this filter.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="w-full sm:w-44">
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setCurrentPage(1);
            void load(1, false);
          }}
        >
          Refresh
        </Button>
      </div>
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recipient</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Retry</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="text-sm">{item.to_email}</TableCell>
                <TableCell className="text-sm">{item.subject}</TableCell>
                <TableCell className="text-sm capitalize">{item.status}</TableCell>
                <TableCell className="text-sm">{item.retry_count}</TableCell>
                <TableCell className="text-sm">{new Date(item.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setCurrentPage((current) => current + 1)}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : `Load More (${loadedCount}/${total})`}
          </Button>
        </div>
      )}
    </div>
  );
};
