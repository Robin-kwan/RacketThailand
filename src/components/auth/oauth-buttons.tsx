import Image from "next/image";

export type AuthOAuthProvider = "google" | "line";

type OAuthButtonsCopy = {
  googleButton: string;
  lineButton: string;
};

type OAuthButtonsProps = {
  copy: OAuthButtonsCopy;
  disabled?: boolean;
  loadingProvider: AuthOAuthProvider | null;
  onProviderClick: (provider: AuthOAuthProvider) => void;
};

function GoogleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      aria-hidden
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.82-.07-1.42-.23-2.05H12v3.87h6.61c-.13.96-.85 2.41-2.45 3.39l-.02.13 3.56 2.4.25.02c2.29-1.84 3.54-4.55 3.54-7.76z"
      />
      <path
        fill="#34A853"
        d="M12 23c3.27 0 6.02-.94 8.03-2.57l-3.83-2.95c-1.03.62-2.4 1.06-4.2 1.06-3.2 0-5.92-1.84-6.89-4.39l-.14.01-3.7 2.48-.05.12C3.2 20.47 7.27 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.11 14.15A6.01 6.01 0 0 1 4.78 12c0-.75.12-1.48.31-2.15l-.01-.14-3.75-2.52-.12.05A10.23 10.23 0 0 0 0 12c0 1.71.47 3.32 1.28 4.76l3.83-2.61z"
      />
      <path
        fill="#EA4335"
        d="M12 5.46c2.27 0 3.8.85 4.67 1.57l3.41-2.89C17.99 2.45 15.27 1.5 12 1.5c-4.73 0-8.8 2.53-10.72 6.24l3.82 2.61C6.08 7.3 8.8 5.46 12 5.46z"
      />
    </svg>
  );
}

function LineIcon() {
  return (
    <Image
      src="/icons/line-brand-icon.png"
      alt=""
      width={20}
      height={20}
      className="h-5 w-5"
      aria-hidden
    />
  );
}

export function OAuthButtons({
  copy,
  disabled = false,
  loadingProvider,
  onProviderClick,
}: OAuthButtonsProps) {
  const hasLoadingProvider = Boolean(loadingProvider);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => onProviderClick("google")}
        disabled={disabled || hasLoadingProvider}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:bg-slate-500 disabled:text-white disabled:border-slate-500 disabled:cursor-not-allowed"
      >
        <span className="flex h-6 w-6 items-center justify-center">
          <GoogleIcon />
        </span>
        <span>
          {loadingProvider === "google"
            ? `${copy.googleButton}...`
            : copy.googleButton}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onProviderClick("line")}
        disabled={disabled || hasLoadingProvider}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:bg-slate-500 disabled:text-white disabled:border-slate-500 disabled:cursor-not-allowed"
      >
        <span className="flex h-6 w-6 items-center justify-center">
          <LineIcon />
        </span>
        <span>
          {loadingProvider === "line"
            ? `${copy.lineButton}...`
            : copy.lineButton}
        </span>
      </button>
    </div>
  );
}
