/**
 * Okta IGA Entitlements & Grants API
 * Read-only operations for entitlements, grants, bundles, and governance policies
 */

import type { OktaClient, PaginatedResponse } from '../client.js';

// ============================================================================
// Types
// ============================================================================

export interface Entitlement {
  id: string;
  name: string;
  description?: string;
  type: string;
  value: string;
  resourceId: string;
  resourceName?: string;
  resourceType: 'APP' | 'GROUP' | 'ROLE';
  status: 'ACTIVE' | 'INACTIVE';
  governed: boolean;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  owner?: {
    userId: string;
    userName?: string;
  };
  metadata?: Record<string, unknown>;
  created: string;
  lastUpdated: string;
  _links?: Record<string, { href: string }>;
}

export interface Grant {
  id: string;
  entitlementId: string;
  entitlementName?: string;
  principalType: 'USER' | 'GROUP';
  principalId: string;
  principalName?: string;
  resourceId: string;
  resourceName?: string;
  grantType: 'DIRECT' | 'INHERITED' | 'ROLE_BASED';
  source?: {
    type: 'MANUAL' | 'ACCESS_REQUEST' | 'PROVISIONING' | 'SYNC';
    requestId?: string;
  };
  status: 'ACTIVE' | 'PENDING' | 'REVOKED' | 'EXPIRED';
  effectiveDate?: string;
  expirationDate?: string;
  created: string;
  lastUpdated: string;
  _links?: Record<string, { href: string }>;
}

export interface EntitlementBundle {
  id: string;
  name: string;
  description?: string;
  entitlements: Array<{
    entitlementId: string;
    entitlementName?: string;
    resourceId: string;
    resourceName?: string;
  }>;
  owner?: {
    userId: string;
    userName?: string;
  };
  status: 'ACTIVE' | 'INACTIVE';
  created: string;
  lastUpdated: string;
  _links?: Record<string, { href: string }>;
}

export interface GovernedResource {
  id: string;
  type: 'APP' | 'GROUP' | 'ROLE';
  name: string;
  description?: string;
  governed: boolean;
  entitlementCount?: number;
  grantCount?: number;
  owner?: {
    userId: string;
    userName?: string;
  };
  status: 'ACTIVE' | 'INACTIVE';
  created: string;
  lastUpdated: string;
  _links?: Record<string, { href: string }>;
}

export interface PrincipalAccess {
  principalId: string;
  principalType: 'USER' | 'GROUP';
  principalName?: string;
  grants: Grant[];
  effectiveEntitlements: Array<{
    entitlementId: string;
    entitlementName?: string;
    resourceId: string;
    resourceName?: string;
    grantType: 'DIRECT' | 'INHERITED' | 'ROLE_BASED';
  }>;
  riskSummary?: {
    totalRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    highRiskCount: number;
    criticalRiskCount: number;
  };
}

// ============================================================================
// Query Parameters
// ============================================================================

export interface ListEntitlementsParams {
  resourceId?: string;
  resourceType?: 'APP' | 'GROUP' | 'ROLE';
  type?: string;
  governed?: boolean;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status?: 'ACTIVE' | 'INACTIVE';
  q?: string;
  after?: string;
  limit?: number;
}

export interface ListGrantsParams {
  entitlementId?: string;
  principalId?: string;
  principalType?: 'USER' | 'GROUP';
  resourceId?: string;
  grantType?: 'DIRECT' | 'INHERITED' | 'ROLE_BASED';
  status?: 'ACTIVE' | 'PENDING' | 'REVOKED' | 'EXPIRED';
  after?: string;
  limit?: number;
}

export interface ListBundlesParams {
  status?: 'ACTIVE' | 'INACTIVE';
  q?: string;
  after?: string;
  limit?: number;
}

export interface ListGovernedResourcesParams {
  type?: 'APP' | 'GROUP' | 'ROLE';
  governed?: boolean;
  status?: 'ACTIVE' | 'INACTIVE';
  q?: string;
  after?: string;
  limit?: number;
}

export interface GetPrincipalAccessParams {
  principalId: string;
  principalType: 'USER' | 'GROUP';
  resourceId?: string;
  includeInherited?: boolean;
}

// ============================================================================
// API Functions - Read Operations
// ============================================================================

/**
 * List entitlements (access rights that can be granted)
 */
export async function listEntitlements(
  client: OktaClient,
  params: ListEntitlementsParams = {}
): Promise<PaginatedResponse<Entitlement>> {
  const { resourceId, resourceType, type, governed, riskLevel, status, q, after, limit = 20 } = params;

  return client.paginatedRequest<Entitlement>({
    method: 'GET',
    path: '/governance/api/v1/entitlements',
    query: {
      resourceId,
      resourceType,
      type,
      governed,
      riskLevel,
      status,
      q,
      after,
      limit,
    },
  });
}

/**
 * Get a single entitlement by ID
 */
export async function getEntitlement(
  client: OktaClient,
  entitlementId: string
): Promise<Entitlement> {
  return client.request<Entitlement>({
    method: 'GET',
    path: `/governance/api/v1/entitlements/${entitlementId}`,
  });
}

/**
 * List grants (entitlement assignments to principals)
 */
export async function listGrants(
  client: OktaClient,
  params: ListGrantsParams = {}
): Promise<PaginatedResponse<Grant>> {
  const { entitlementId, principalId, principalType, resourceId, grantType, status, after, limit = 20 } = params;

  return client.paginatedRequest<Grant>({
    method: 'GET',
    path: '/governance/api/v1/grants',
    query: {
      entitlementId,
      principalId,
      principalType,
      resourceId,
      grantType,
      status,
      after,
      limit,
    },
  });
}

/**
 * Get a single grant by ID
 */
export async function getGrant(client: OktaClient, grantId: string): Promise<Grant> {
  return client.request<Grant>({
    method: 'GET',
    path: `/governance/api/v1/grants/${grantId}`,
  });
}

/**
 * List grants for a specific user
 */
export async function listUserGrants(
  client: OktaClient,
  userId: string,
  params: Omit<ListGrantsParams, 'principalId' | 'principalType'> = {}
): Promise<PaginatedResponse<Grant>> {
  const { entitlementId, resourceId, grantType, status, after, limit = 20 } = params;

  return client.paginatedRequest<Grant>({
    method: 'GET',
    path: `/governance/api/v1/users/${userId}/grants`,
    query: {
      entitlementId,
      resourceId,
      grantType,
      status,
      after,
      limit,
    },
  });
}

/**
 * List grants for a specific entitlement
 */
export async function listEntitlementGrants(
  client: OktaClient,
  entitlementId: string,
  params: Omit<ListGrantsParams, 'entitlementId'> = {}
): Promise<PaginatedResponse<Grant>> {
  const { principalId, principalType, resourceId, grantType, status, after, limit = 20 } = params;

  return client.paginatedRequest<Grant>({
    method: 'GET',
    path: `/governance/api/v1/entitlements/${entitlementId}/grants`,
    query: {
      principalId,
      principalType,
      resourceId,
      grantType,
      status,
      after,
      limit,
    },
  });
}

/**
 * List entitlement bundles
 */
export async function listBundles(
  client: OktaClient,
  params: ListBundlesParams = {}
): Promise<PaginatedResponse<EntitlementBundle>> {
  const { status, q, after, limit = 20 } = params;

  return client.paginatedRequest<EntitlementBundle>({
    method: 'GET',
    path: '/governance/api/v1/bundles',
    query: {
      status,
      q,
      after,
      limit,
    },
  });
}

/**
 * Get a single bundle by ID
 */
export async function getBundle(
  client: OktaClient,
  bundleId: string
): Promise<EntitlementBundle> {
  return client.request<EntitlementBundle>({
    method: 'GET',
    path: `/governance/api/v1/bundles/${bundleId}`,
  });
}

/**
 * List governed resources (apps, groups, roles under governance)
 */
export async function listGovernedResources(
  client: OktaClient,
  params: ListGovernedResourcesParams = {}
): Promise<PaginatedResponse<GovernedResource>> {
  const { type, governed, status, q, after, limit = 20 } = params;

  return client.paginatedRequest<GovernedResource>({
    method: 'GET',
    path: '/governance/api/v1/resources',
    query: {
      type,
      governed,
      status,
      q,
      after,
      limit,
    },
  });
}

/**
 * Get a single governed resource by ID
 */
export async function getGovernedResource(
  client: OktaClient,
  resourceId: string
): Promise<GovernedResource> {
  return client.request<GovernedResource>({
    method: 'GET',
    path: `/governance/api/v1/resources/${resourceId}`,
  });
}

/**
 * Get effective access for a principal (user or group)
 */
export async function getPrincipalAccess(
  client: OktaClient,
  params: GetPrincipalAccessParams
): Promise<PrincipalAccess> {
  const { principalId, principalType, resourceId, includeInherited } = params;

  const path = principalType === 'USER'
    ? `/governance/api/v1/users/${principalId}/access`
    : `/governance/api/v1/groups/${principalId}/access`;

  return client.request<PrincipalAccess>({
    method: 'GET',
    path,
    query: {
      resourceId,
      includeInherited,
    },
  });
}

/**
 * List entitlements for a specific resource
 */
export async function listResourceEntitlements(
  client: OktaClient,
  resourceId: string,
  params: Omit<ListEntitlementsParams, 'resourceId'> = {}
): Promise<PaginatedResponse<Entitlement>> {
  const { resourceType, type, governed, riskLevel, status, q, after, limit = 20 } = params;

  return client.paginatedRequest<Entitlement>({
    method: 'GET',
    path: `/governance/api/v1/resources/${resourceId}/entitlements`,
    query: {
      resourceType,
      type,
      governed,
      riskLevel,
      status,
      q,
      after,
      limit,
    },
  });
}
