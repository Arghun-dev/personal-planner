interface Props {
  value:    string;
  onChange: (value: string) => void;
}

export function NotesCard({ value, onChange }: Props) {
  return (
    <div className="bg-dos-surface border border-dos-border rounded-[4px] p-5">
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="What's the priority for today? What will you conquer?..."
        rows={4}
        className="w-full bg-transparent border-none text-dos-text font-space-mono text-[12px] leading-[1.8] resize-none outline-none min-h-[80px] tracking-[0.03em] placeholder:text-dos-text-muted"
      />
    </div>
  );
}
