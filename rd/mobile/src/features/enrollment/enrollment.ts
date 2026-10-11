import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';

import { ACTIVE_ORGANIZATION_STORAGE_KEY } from '@/contexts/organization-context';
import { authClient } from '@/lib/backend';

export type EnrollmentCode = {
  organizationId?: string;
  token: string;
};

// The web lab encodes `flavoneer://enroll?token=…&organizationId=…` in its QR code.
export function parseEnrollmentCode(data: string): EnrollmentCode | null {
  try {
    const { hostname, path, queryParams, scheme } = Linking.parse(data.trim());
    const route = hostname ?? path;
    const token = queryParams?.token;
    const organizationId = queryParams?.organizationId;
    if (scheme !== 'flavoneer' || route !== 'enroll' || typeof token !== 'string' || !token) {
      return null;
    }
    return {
      organizationId:
        typeof organizationId === 'string' && organizationId ? organizationId : undefined,
      token,
    };
  } catch {
    return null;
  }
}

export class EnrollmentError extends Error {}

export async function redeemEnrollmentCode({ organizationId, token }: EnrollmentCode) {
  // Store the workspace first: the session signal remounts the organization
  // provider, which restores the active workspace from storage.
  if (organizationId) {
    await SecureStore.setItemAsync(ACTIVE_ORGANIZATION_STORAGE_KEY, organizationId).catch(
      () => undefined,
    );
  }

  const { error } = await authClient.$fetch('/mobile-enrollment/redeem', {
    body: { token },
    method: 'POST',
  });
  if (error) {
    throw new EnrollmentError(error.message ?? 'Enrollment failed');
  }
}
