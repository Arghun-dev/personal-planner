interface Props {
  children: React.ReactNode;
}

export function SectionLabel({ children }: Props) {
  return (
    <div className="flex items-center gap-2 mb-3 font-space-mono text-[9px] tracking-[0.3em] text-dos-text-dim uppercase">
      <span>{children}</span>
      <div className="flex-1 h-px bg-dos-border" />
    </div>
  );
}
