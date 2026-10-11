import { Loader2, RefreshCw, Smartphone } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { encode } from "uqr";
import { useOrganization } from "../../context/OrganizationContext";
import { authClient } from "../../lib/auth-client";

interface Enrollment {
  expiresAt: number;
  token: string;
}

const QR_QUIET_ZONE = 2;

function buildEnrollmentUrl(token: string, organizationId: string | null) {
  const params = new URLSearchParams({ token });
  if (organizationId) {
    params.set("organizationId", organizationId);
  }
  return `flavoneer://enroll?${params.toString()}`;
}

function QrCode({ label, value }: { label: string; value: string }) {
  const { path, size } = useMemo(() => {
    const { data, size: moduleCount } = encode(value, { ecc: "M" });
    let d = "";
    data.forEach((row, y) => {
      row.forEach((dark, x) => {
        if (dark) {
          d += `M${x + QR_QUIET_ZONE} ${y + QR_QUIET_ZONE}h1v1h-1z`;
        }
      });
    });
    return { path: d, size: moduleCount + QR_QUIET_ZONE * 2 };
  }, [value]);

  return (
    <svg
      aria-label={label}
      className="h-64 w-64 rounded-2xl"
      role="img"
      shapeRendering="crispEdges"
      viewBox={`0 0 ${size} ${size}`}
    >
      <rect fill="#ffffff" height={size} width={size} />
      <path d={path} fill="#173e33" />
    </svg>
  );
}

export default function MobileAppTab() {
  const { t } = useTranslation();
  const { activeOrganizationId } = useOrganization();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const createEnrollment = useCallback(async () => {
    setIsLoading(true);
    setError(false);
    try {
      const { data, error: requestError } = await authClient.$fetch<Enrollment>(
        "/mobile-enrollment/create",
        { method: "POST" }
      );
      if (requestError || !data?.token) {
        throw new Error("Unable to create a mobile enrollment code");
      }
      setEnrollment(data);
      setNow(Date.now());
    } catch {
      setEnrollment(null);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    createEnrollment();
  }, [createEnrollment]);

  useEffect(() => {
    if (!enrollment) {
      return;
    }
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [enrollment]);

  const secondsLeft = enrollment
    ? Math.max(0, Math.ceil((enrollment.expiresAt - now) / 1000))
    : 0;
  const isExpired = Boolean(enrollment) && secondsLeft === 0;

  // Codes are single use and short lived; replace an expired one automatically.
  useEffect(() => {
    if (isExpired && !isLoading) {
      createEnrollment();
    }
  }, [createEnrollment, isExpired, isLoading]);

  const countdown = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;

  let qrContent = (
    <Loader2
      aria-hidden="true"
      className="animate-spin text-[#f5a623]"
      size={32}
    />
  );
  if (enrollment && !isExpired) {
    qrContent = (
      <QrCode
        label={t("mobile_enrollment_qr_label")}
        value={buildEnrollmentUrl(enrollment.token, activeOrganizationId)}
      />
    );
  } else if (error) {
    qrContent = (
      <p className="px-6 text-center font-bold text-[#a43434] text-sm dark:text-[#ffb8ad]">
        {t("mobile_enrollment_failed")}
      </p>
    );
  }

  return (
    <div>
      <h3 className="font-bold text-gray-900 text-lg dark:text-white">
        {t("mobile_enrollment_title")}
      </h3>
      <p className="mt-1 text-gray-500 text-sm dark:text-slate-400">
        {t("mobile_enrollment_description")}
      </p>

      <div className="mt-6 flex flex-col items-center gap-6 rounded-[2.5rem] border border-gray-200 bg-white p-6 sm:flex-row sm:items-start dark:border-slate-700 dark:bg-slate-800">
        <div className="flex h-64 w-64 shrink-0 items-center justify-center rounded-2xl bg-brand-mint/40 dark:bg-slate-900">
          {qrContent}
        </div>

        <div className="min-w-0 flex-1">
          <ol className="grid gap-3 text-gray-700 text-sm dark:text-slate-200">
            {(
              [
                "mobile_enrollment_step_open",
                "mobile_enrollment_step_scan",
                "mobile_enrollment_step_done",
              ] as const
            ).map((step, index) => (
              <li className="flex gap-3" key={step}>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-mint font-bold text-brand-primary text-xs dark:bg-brand-accent/15 dark:text-brand-accent-hover">
                  {index + 1}
                </span>
                <span>{t(step)}</span>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {enrollment && !isExpired ? (
              <span
                aria-live="polite"
                className="flex items-center gap-2 text-gray-500 text-sm dark:text-slate-400"
              >
                <Smartphone aria-hidden="true" size={16} />
                {t("mobile_enrollment_expires_in", { time: countdown })}
              </span>
            ) : null}
            <button
              className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-700 text-sm transition-colors hover:bg-brand-mint/40 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
              disabled={isLoading}
              onClick={createEnrollment}
              type="button"
            >
              <RefreshCw
                aria-hidden="true"
                className={isLoading ? "animate-spin" : undefined}
                size={16}
              />
              {t("mobile_enrollment_refresh")}
            </button>
          </div>
          <p className="mt-4 text-gray-500 text-xs dark:text-slate-400">
            {t("mobile_enrollment_security_note")}
          </p>
        </div>
      </div>
    </div>
  );
}
