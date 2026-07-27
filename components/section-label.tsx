import { Separator } from "@/components/ui/separator";

interface Props {
  children: React.ReactNode;
}

export function SectionLabel({ children }: Props) {
  return (
    <div className="flex items-center gap-2.5 mb-3 mt-6 first:mt-0 font-mono text-[9px] font-bold tracking-[0.3em] text-muted-foreground uppercase">
      <span className="size-1 rounded-full bg-primary/50 shrink-0" />
      <span className="shrink-0">{children}</span>
      <Separator className="flex-1" />
    </div>
  );
}
