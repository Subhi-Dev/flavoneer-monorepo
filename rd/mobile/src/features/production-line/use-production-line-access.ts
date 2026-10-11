import { useQuery } from 'convex/react';
import { useOrganization } from '@/contexts/organization-context';
import { api } from '@/lib/backend';

/**
 * Production-line permissions for the active workspace. UI-only check; the Convex
 * queries and mutations enforce the same permissions.
 */
export function useProductionLineAccess() {
  const { activeOrganizationId, organizationsLoading } = useOrganization();
  const currentUser = useQuery(
    api.users.getCurrentUserRole,
    activeOrganizationId ? { organizationId: activeOrganizationId } : 'skip',
  );
  const permissions = currentUser?.effectivePermissions ?? [];
  const hasPermission = (permissionKey: string) =>
    permissions.includes('full_access') || permissions.includes(permissionKey);

  return {
    canRecord: hasPermission('record_production_checks'),
    canReview: hasPermission('review_production_checks'),
    isLoading: organizationsLoading || (activeOrganizationId !== null && currentUser === undefined),
  };
}
