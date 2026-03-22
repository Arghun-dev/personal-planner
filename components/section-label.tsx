import { Separator } from "@/components/ui/separator";

interface Props {
  children: React.ReactNode;
}

export function SectionLabel({ children }: Props) {
  return (
    <div className="flex items-center gap-2 mb-3 font-mono text-[9px] tracking-[0.3em] text-muted-foreground uppercase">
      <span className="shrink-0">{children}</span>
      <Separator className="flex-1" />
    </div>
  );
}
