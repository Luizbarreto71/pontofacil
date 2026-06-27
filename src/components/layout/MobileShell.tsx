import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";

/**
 * Container mobile-first centralizado (max-w-md), com a bottom nav fixa.
 * No desktop o conteúdo fica centralizado como num "device frame".
 */
export function MobileShell() {
  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main className="flex-1 pb-28">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
