import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { clearFactoryModelAssetCache } from "./factory-model-assets";

const chunkLoadErrorPattern =
  /dynamically imported module|module script|outdated optimize dep/i;

interface BoundaryProps {
  children: ReactNode;
  detailsLabel: string;
  errorHelp: string;
  errorTitle: string;
  onRetry: (error: Error) => void;
  retryLabel: string;
}

interface BoundaryState {
  error: Error | null;
}

class Factory3DErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Factory3D] View failed", error, info.componentStack);
  }

  render() {
    const {
      children,
      detailsLabel,
      errorHelp,
      errorTitle,
      onRetry,
      retryLabel,
    } = this.props;
    const currentError = this.state.error;
    if (!currentError) {
      return children;
    }

    return (
      <div
        className="grid h-full min-h-[30rem] place-items-center bg-[#102f27] p-6 text-center"
        role="alert"
      >
        <div className="max-w-xl rounded-[1.75rem] border border-white/10 bg-[#173e33] p-6 shadow-2xl">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#ff7738]/15 text-[#ff9b6e]">
            <AlertTriangle size={24} />
          </span>
          <h3 className="mt-4 font-display font-semibold text-[#f7f4df] text-xl">
            {errorTitle}
          </h3>
          <p className="mt-2 text-[#a9cbbb] text-sm leading-6">{errorHelp}</p>
          <details className="mt-4 rounded-xl bg-black/20 p-3 text-start text-white/60 text-xs">
            <summary className="cursor-pointer font-bold text-white/75">
              {detailsLabel}
            </summary>
            <p className="mt-2 break-words font-mono leading-5">
              {currentError.message}
            </p>
          </details>
          <button
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#f5a623] px-5 py-3 font-bold text-[#173e33] text-sm transition hover:-translate-y-0.5"
            onClick={() => onRetry(currentError)}
            type="button"
          >
            <RotateCcw size={17} />
            {retryLabel}
          </button>
        </div>
      </div>
    );
  }
}

export function Factory3DGuard({
  children,
  resetKey,
}: {
  children: ReactNode;
  resetKey: string;
}) {
  const { t } = useTranslation();
  const [retryCount, setRetryCount] = useState(0);

  return (
    <Factory3DErrorBoundary
      detailsLabel={t("factory_3d_error_details")}
      errorHelp={t("factory_3d_error_help")}
      errorTitle={t("factory_3d_error_title")}
      key={`${resetKey}:${retryCount}`}
      onRetry={(error) => {
        clearFactoryModelAssetCache();
        if (chunkLoadErrorPattern.test(error.message)) {
          window.location.reload();
          return;
        }
        setRetryCount((value) => value + 1);
      }}
      retryLabel={t("factory_3d_retry")}
    >
      {children}
    </Factory3DErrorBoundary>
  );
}

export function Factory3DLoadingState() {
  const { t } = useTranslation();
  return (
    <div
      aria-live="polite"
      className="grid h-full min-h-[30rem] place-items-center bg-[#102f27]"
      role="status"
    >
      <div className="text-center">
        <Loader2 className="mx-auto animate-spin text-[#f5a623]" size={26} />
        <p className="mt-3 font-bold text-[#d2f2d4] text-sm">
          {t("factory_3d_loading")}
        </p>
      </div>
    </div>
  );
}
