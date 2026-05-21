import { CheckCircle2, CircleDot, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { CUSTOMER_TIMELINE, PROCESSING_TOTAL, customerTimelineIndex } from "@/portal/lib/orderStatus";

interface Props {
  status: string;
  processingStep?: number | null;
  className?: string;
}

export function OrderTimeline({ status, processingStep, className }: Props) {
  if (status === "cancelled") return null;
  const activeIdx = customerTimelineIndex(status);
  const step6 = Math.min(Math.max(processingStep ?? 1, 1), PROCESSING_TOTAL);

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3", className)}>
      {CUSTOMER_TIMELINE.map((step, i) => {
        const done = i < activeIdx;
        const current = i === activeIdx;
        const isProcessing = step.key === "processing" && current;
        return (
          <div key={step.key} className="flex items-start gap-2">
            <div className={cn("shrink-0 mt-0.5", done || current ? "text-primary" : "text-muted-foreground/40")}>
              {done ? <CheckCircle2 className="h-5 w-5" /> : current ? <CircleDot className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className={cn("text-sm font-medium", !done && !current && "text-muted-foreground")}>{step.label}</div>
              <div className="text-xs text-muted-foreground">
                {isProcessing ? `Etapa ${step6} de ${PROCESSING_TOTAL}` : step.desc}
              </div>
              {isProcessing && (
                <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${(step6 / PROCESSING_TOTAL) * 100}%` }} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
