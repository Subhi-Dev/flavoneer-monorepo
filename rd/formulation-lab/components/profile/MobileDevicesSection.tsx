import { api } from "@flavoneer/backend/api";
import type { Id } from "@flavoneer/backend/data-model";
import { useMutation, useQuery } from "convex/react";
import { Loader2, LogOut, Smartphone } from "lucide-react";
import { DateTime } from "luxon";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useOrganization } from "../../context/OrganizationContext";
import { usePermissions } from "../../hooks/usePermissions";
import { useToast } from "../../hooks/useToast";

interface DeviceRowData {
  _id: Id<"mobileDevices">;
  appVersion?: string;
  canSignOut?: boolean;
  lastActiveAt: number;
  modelName?: string;
  osVersion?: string;
  platform: "ios" | "android";
  sessionExpiresAt: number;
  userEmail?: string;
  userName?: string;
}

function DeviceList({
  devices,
  emptyLabel,
  organizationId,
}: {
  devices: DeviceRowData[] | undefined;
  emptyLabel: string;
  organizationId?: Id<"organizations">;
}) {
  const { i18n, t } = useTranslation();
  const { toast } = useToast();
  const signOutDevice = useMutation(api.mobileDevices.signOutDevice);
  const [pendingId, setPendingId] = useState<Id<"mobileDevices"> | null>(null);
  const locale = i18n.language === "ar" ? "ar-PS" : "en";

  if (devices === undefined) {
    return (
      <div className="flex justify-center p-6">
        <Loader2
          aria-hidden="true"
          className="animate-spin text-[#f5a623]"
          size={24}
        />
      </div>
    );
  }

  // Sessions can expire without being deleted; those phones are already signed out.
  const now = Date.now();
  const activeDevices = devices.filter(
    (device) => device.sessionExpiresAt > now
  );
  if (activeDevices.length === 0) {
    return (
      <p className="rounded-2xl border border-gray-200 border-dashed p-6 text-center text-gray-500 text-sm dark:border-slate-700 dark:text-slate-400">
        {emptyLabel}
      </p>
    );
  }

  const handleSignOut = async (device: DeviceRowData, name: string) => {
    if (!confirm(t("mobile_devices_sign_out_confirm", { device: name }))) {
      return;
    }
    setPendingId(device._id);
    try {
      await signOutDevice({ deviceId: device._id, organizationId });
      toast.success(t("mobile_devices_signed_out", { device: name }));
    } catch {
      toast.error(t("mobile_devices_sign_out_failed"));
    } finally {
      setPendingId(null);
    }
  };

  return (
    <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-800">
      {activeDevices.map((device) => {
        const name =
          device.modelName ??
          t(
            device.platform === "ios"
              ? "mobile_devices_iphone"
              : "mobile_devices_android"
          );
        const system = [
          device.osVersion
            ? `${device.platform === "ios" ? "iOS" : "Android"} ${device.osVersion}`
            : null,
          device.appVersion
            ? t("mobile_devices_app_version", { version: device.appVersion })
            : null,
        ]
          .filter(Boolean)
          .join(" · ");
        const lastActive = DateTime.fromMillis(
          Math.min(device.lastActiveAt, now)
        )
          .setLocale(locale)
          .toRelative();
        const isPending = pendingId === device._id;
        return (
          <li className="flex items-center gap-4 p-4" key={device._id}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-mint text-brand-primary dark:bg-brand-accent/15 dark:text-brand-accent-hover">
              <Smartphone aria-hidden="true" size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-gray-900 text-sm dark:text-white">
                {device.userName ? `${device.userName} · ${name}` : name}
              </p>
              <p className="truncate text-gray-500 text-xs dark:text-slate-400">
                {[t("mobile_devices_last_active", { time: lastActive }), system]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            {device.canSignOut === false ? null : (
              <button
                className="flex shrink-0 items-center gap-2 rounded-xl bg-red-50 px-3 py-2 font-bold text-red-600 text-xs transition-colors hover:bg-red-100 disabled:cursor-wait disabled:opacity-60 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                disabled={isPending}
                onClick={() => handleSignOut(device, name)}
                type="button"
              >
                {isPending ? (
                  <Loader2
                    aria-hidden="true"
                    className="animate-spin"
                    size={14}
                  />
                ) : (
                  <LogOut aria-hidden="true" size={14} />
                )}
                {t("mobile_devices_sign_out")}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function MobileDevicesSection() {
  const { t } = useTranslation();
  const { activeOrganizationId } = useOrganization();
  const { isOrganizationAdmin } = usePermissions();
  const myDevices = useQuery(api.mobileDevices.listMine, {});
  const workspaceDevices = useQuery(
    api.mobileDevices.listForOrganization,
    isOrganizationAdmin && activeOrganizationId
      ? { organizationId: activeOrganizationId }
      : "skip"
  );

  return (
    <div className="mt-8 grid gap-8">
      <section>
        <h3 className="font-bold text-gray-900 text-lg dark:text-white">
          {t("mobile_devices_title")}
        </h3>
        <p className="mt-1 mb-4 text-gray-500 text-sm dark:text-slate-400">
          {t("mobile_devices_description")}
        </p>
        <DeviceList
          devices={myDevices}
          emptyLabel={t("mobile_devices_empty")}
        />
      </section>

      {isOrganizationAdmin && activeOrganizationId ? (
        <section>
          <h3 className="font-bold text-gray-900 text-lg dark:text-white">
            {t("mobile_devices_workspace_title")}
          </h3>
          <p className="mt-1 mb-4 text-gray-500 text-sm dark:text-slate-400">
            {t("mobile_devices_workspace_description")}
          </p>
          <DeviceList
            devices={workspaceDevices}
            emptyLabel={t("mobile_devices_workspace_empty")}
            organizationId={activeOrganizationId}
          />
        </section>
      ) : null}
    </div>
  );
}
