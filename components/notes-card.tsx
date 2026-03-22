import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function NotesCard({ value, onChange }: Props) {
  return (
    <Card className="rounded-[4px] gap-0">
      <CardContent className="p-5">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="What's the priority for today? What will you conquer?..."
          rows={4}
          className="w-full border-none bg-transparent shadow-none resize-none font-mono text-[12px] leading-[1.8] min-h-[80px] tracking-[0.03em] placeholder:text-muted-foreground/60 focus-visible:ring-0 px-0 py-0"
        />
      </CardContent>
    </Card>
  );
}
