import { api } from "@flavoneer/backend/api";
import type { Id } from "@flavoneer/backend/data-model";
import {
  FACTORY_BASE_KEYS,
  FACTORY_BASE_NAMES,
  isFactoryBaseKey,
} from "@flavoneer/backend/factory-bases";
import { useMutation, useQuery } from "convex/react";
import { Factory, Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface OrganizationOption {
  _id: Id<"organizations">;
  name: string;
}

const cardClass =
  "rounded-[2rem] border border-[#1c4a3c]/10 bg-[#fffdf4]/95 shadow-[0_18px_45px_rgba(16,47,39,0.07)] dark:border-[#d2f2d4]/10 dark:bg-[#143d32]/95";
const selectClass =
  "w-full rounded-xl border border-[#1c4a3c]/12 bg-[#eef8eb]/75 px-3 py-2 text-[#173e33] text-sm outline-none focus:border-[#ff7738]/60 focus:ring-4 focus:ring-[#ff7738]/10 disabled:opacity-60 dark:border-[#d2f2d4]/10 dark:bg-[#102f27] dark:text-[#f7f4df]";

export function FactoryBaseAdminView({
  organizations,
}: {
  organizations: OrganizationOption[];
}) {
  const { t } = useTranslation();
  const assignments = useQuery(api.factoryBases.listForSuperAdmin);
  const assign = useMutation(api.factoryBases.assign);
  const [savingId, setSavingId] = useState<Id<"organizations"> | null>(null);

  const factoryByOrganization = new Map(
    assignments?.map((assignment) => [
      assignment.organizationId,
      assignment.factoryKey,
    ])
  );

  const changeFactory = async (
    organization: OrganizationOption,
    value: string
  ) => {
    const factoryKey = isFactoryBaseKey(value) ? value : null;
    setSavingId(organization._id);
    try {
      await assign({ organizationId: organization._id, factoryKey });
      toast.success(
        factoryKey
          ? t("factory_base_saved", {
              organization: organization.name,
              factory: FACTORY_BASE_NAMES[factoryKey],
            })
          : t("factory_base_removed", { organization: organization.name })
      );
    } catch {
      toast.error(t("factory_base_save_failed"));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className={`${cardClass} overflow-hidden`}>
      <header className="flex items-start gap-3 border-[#1c4a3c]/10 border-b px-6 py-5 dark:border-[#d2f2d4]/10">
        <Factory aria-hidden="true" className="mt-1 text-[#f5a623]" size={20} />
        <div>
          <h2 className="font-bold text-[#173e33] text-lg dark:text-[#f7f4df]">
            {t("factory_base_admin_title")}
          </h2>
          <p className="mt-1 max-w-2xl text-[#527568] text-sm dark:text-[#a9cbbb]">
            {t("factory_base_admin_subtitle")}
          </p>
        </div>
      </header>

      {assignments === undefined ? (
        <div className="flex justify-center p-10">
          <Loader2
            aria-hidden="true"
            className="animate-spin text-[#f5a623]"
            size={24}
          />
        </div>
      ) : (
        <table className="w-full text-start text-sm">
          <thead className="text-[#527568] text-xs dark:text-[#a9cbbb]">
            <tr>
              <th className="px-6 py-3 text-start font-bold" scope="col">
                {t("factory_base_organization")}
              </th>
              <th className="w-72 px-6 py-3 text-start font-bold" scope="col">
                {t("factory_base_factory")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1c4a3c]/8 dark:divide-[#d2f2d4]/8">
            {organizations.map((organization) => (
              <tr key={organization._id}>
                <td className="px-6 py-3 font-bold text-[#173e33] dark:text-[#f7f4df]">
                  {organization.name}
                </td>
                <td className="px-6 py-3">
                  <select
                    aria-label={`${t("factory_base_factory")}: ${organization.name}`}
                    className={selectClass}
                    disabled={savingId === organization._id}
                    onChange={(event) =>
                      changeFactory(organization, event.target.value)
                    }
                    value={factoryByOrganization.get(organization._id) ?? ""}
                  >
                    <option value="">{t("factory_base_none")}</option>
                    {FACTORY_BASE_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {FACTORY_BASE_NAMES[key]}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
