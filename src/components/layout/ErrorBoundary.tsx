import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  message?: string;
}

/** Evita tela preta: captura erros de render e mostra um fallback amigável. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown) {
    // log para diagnóstico
    console.error("[Ponto Fácil] erro capturado:", error);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: undefined });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-danger/10">
          <AlertTriangle className="size-8 text-danger" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Algo deu errado</h1>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {this.state.message || "Ocorreu um erro inesperado."}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition hover:bg-secondary"
          >
            <RefreshCw className="size-4" /> Tentar de novo
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-float transition hover:bg-primary-dark"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }
}
