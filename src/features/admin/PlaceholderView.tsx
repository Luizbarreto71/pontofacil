import { Construction } from "lucide-react";

export function PlaceholderView({ title }: { title: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Construction className="size-8" />
      </span>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="max-w-sm text-[14px] text-muted-foreground">
        Este módulo está em desenvolvimento e ficará disponível em breve.
      </p>
    </div>
  );
}
