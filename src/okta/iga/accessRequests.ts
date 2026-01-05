/**
 * Okta IGA Access Requests API
 * Read and write operations for access requests and request catalog
 */

import type { OktaClient, PaginatedResponse } from '../client.js';

// ============================================================================
// Types
// ============================================================================

export interface AccessRequest {
  id: string;
  requesterId: string;
  requesterName?: string;
  targetUserId: string;
  targetUserName?: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'CANCELLED' | 'FULFILLED' | 'FAILED';
  requestType: 'SELF' | 'ON_BEHALF';
  created: string;
  lastUpdated: string;
  completedDate?: string;
  justification?: string;
  requestedItems: RequestedItem[];
  approvalSteps?: ApprovalStep[];
  _links?: Record<string, { href: string }>;
}

export interface RequestedItem {
  id: string;
  type: 'APP' | 'ENTITLEMENT' | 'ROLE' | 'GROUP' | 'PACKAGE';
  resourceId: string;
  resourceName?: string;
  entitlementType?: string;
  entitlementValue?: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'FULFILLED' | 'FAILED';
  approvedBy?: string;
  approvedDate?: string;
  deniedBy?: string;
  deniedDate?: string;
  denyReason?: string;
}

export interface ApprovalStep {
  stepNumber: number;
  name?: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'SKIPPED';
  approvers: Approver[];
  approvedBy?: string;
  approvedDate?: string;
  deniedBy?: string;
  deniedDate?: string;
}

export interface Approver {
  userId: string;
  userName?: string;
  type: 'USER' | 'GROUP' | 'MANAGER' | 'APP_OWNER' | 'RESOURCE_OWNER';
}

export interface RequestEvent {
  id: string;
  requestId: string;
  eventType: string;
  actor?: string;
  actorName?: string;
  message?: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface CatalogItem {
  id: string;
  type: 'APP' | 'ENTITLEMENT' | 'ROLE' | 'GROUP' | 'PACKAGE';
  name: string;
  description?: string;
  resourceId: string;
  resourceName?: string;
  entitlementType?: string;
  entitlementValue?: string;
  category?: string;
  requestable: boolean;
  requiresApproval: boolean;
  approvalPolicy?: string;
  _links?: Record<string, { href: string }>;
}

export interface RequestPackage {
  id: string;
  name: string;
  description?: string;
  items: PackageItem[];
  category?: string;
  requestable: boolean;
  requiresApproval: boolean;
  created: string;
  lastUpdated: string;
  _links?: Record<string, { href: string }>;
}

export interface PackageItem {
  type: 'APP' | 'ENTITLEMENT' | 'ROLE' | 'GROUP';
  resourceId: string;
  resourceName?: string;
  entitlementType?: string;
  entitlementValue?: string;
}

// ============================================================================
// Query Parameters
// ============================================================================

export interface ListAccessRequestsParams {
  status?: 'PENDING' | 'APPROVED' | 'DENIED' | 'CANCELLED' | 'FULFILLED' | 'FAILED';
  requesterId?: string;
  targetUserId?: string;
  requestType?: 'SELF' | 'ON_BEHALF';
  q?: string;
  after?: string;
  limit?: number;
}

export interface ListRequestEventsParams {
  requestId: string;
  after?: string;
  limit?: number;
}

export interface ListCatalogItemsParams {
  type?: 'APP' | 'ENTITLEMENT' | 'ROLE' | 'GROUP' | 'PACKAGE';
  category?: string;
  q?: string;
  requestable?: boolean;
  after?: string;
  limit?: number;
}

export interface ListPackagesParams {
  category?: string;
  q?: string;
  requestable?: boolean;
  after?: string;
  limit?: number;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * List access requests
 */
export async function listAccessRequests(
  client: OktaClient,
  params: ListAccessRequestsParams = {}
): Promise<PaginatedResponse<AccessRequest>> {
  const { status, requesterId, targetUserId, requestType, q, after, limit = 20 } = params;

  return client.paginatedRequest<AccessRequest>({
    method: 'GET',
    path: '/governance/api/v1/requests',
    query: {
      status,
      requesterId,
      targetUserId,
      requestType,
      q,
      after,
      limit,
    },
  });
}

/**
 * Get a single access request by ID
 */
export async function getAccessRequest(
  client: OktaClient,
  requestId: string
): Promise<AccessRequest> {
  return client.request<AccessRequest>({
    method: 'GET',
    path: `/governance/api/v1/requests/${requestId}`,
  });
}

/**
 * List events/history for an access request
 */
export async function listRequestEvents(
  client: OktaClient,
  params: ListRequestEventsParams
): Promise<PaginatedResponse<RequestEvent>> {
  const { requestId, after, limit = 50 } = params;

  return client.paginatedRequest<RequestEvent>({
    method: 'GET',
    path: `/governance/api/v1/requests/${requestId}/events`,
    query: {
      after,
      limit,
    },
  });
}

/**
 * List catalog items available for request
 */
export async function listCatalogItems(
  client: OktaClient,
  params: ListCatalogItemsParams = {}
): Promise<PaginatedResponse<CatalogItem>> {
  const { type, category, q, requestable, after, limit = 20 } = params;

  return client.paginatedRequest<CatalogItem>({
    method: 'GET',
    path: '/governance/api/v1/catalog/items',
    query: {
      type,
      category,
      q,
      requestable,
      after,
      limit,
    },
  });
}

/**
 * Get a single catalog item by ID
 */
export async function getCatalogItem(client: OktaClient, itemId: string): Promise<CatalogItem> {
  return client.request<CatalogItem>({
    method: 'GET',
    path: `/governance/api/v1/catalog/items/${itemId}`,
  });
}

/**
 * List request packages (bundles of access)
 */
export async function listPackages(
  client: OktaClient,
  params: ListPackagesParams = {}
): Promise<PaginatedResponse<RequestPackage>> {
  const { category, q, requestable, after, limit = 20 } = params;

  return client.paginatedRequest<RequestPackage>({
    method: 'GET',
    path: '/governance/api/v1/catalog/packages',
    query: {
      category,
      q,
      requestable,
      after,
      limit,
    },
  });
}

/**
 * Get a single package by ID
 */
export async function getPackage(client: OktaClient, packageId: string): Promise<RequestPackage> {
  return client.request<RequestPackage>({
    method: 'GET',
    path: `/governance/api/v1/catalog/packages/${packageId}`,
  });
}

// ============================================================================
// Write Operations - Input Types
// ============================================================================

export interface CreateAccessRequestInput {
  targetUserId: string;
  justification?: string;
  requestedItems: Array<{
    type: 'APP' | 'ENTITLEMENT' | 'ROLE' | 'GROUP' | 'PACKAGE';
    resourceId: string;
    entitlementType?: string;
    entitlementValue?: string;
  }>;
}

export interface ApproveRequestInput {
  requestId: string;
  comment?: string;
}

export interface DenyRequestInput {
  requestId: string;
  reason: string;
}

// ============================================================================
// Write Operations - API Functions
// ============================================================================

/**
 * Submit a new access request
 */
export async function createAccessRequest(
  client: OktaClient,
  input: CreateAccessRequestInput
): Promise<AccessRequest> {
  return client.request<AccessRequest>({
    method: 'POST',
    path: '/governance/api/v1/requests',
    body: input,
  });
}

/**
 * Approve an access request (as an approver)
 */
export async function approveAccessRequest(
  client: OktaClient,
  input: ApproveRequestInput
): Promise<AccessRequest> {
  const { requestId, comment } = input;
  return client.request<AccessRequest>({
    method: 'POST',
    path: `/governance/api/v1/requests/${requestId}/approve`,
    body: { comment },
  });
}

/**
 * Deny an access request (as an approver)
 */
export async function denyAccessRequest(
  client: OktaClient,
  input: DenyRequestInput
): Promise<AccessRequest> {
  const { requestId, reason } = input;
  return client.request<AccessRequest>({
    method: 'POST',
    path: `/governance/api/v1/requests/${requestId}/deny`,
    body: { reason },
  });
}

/**
 * Cancel an access request (as requester or admin)
 */
export async function cancelAccessRequest(
  client: OktaClient,
  requestId: string,
  reason?: string
): Promise<AccessRequest> {
  return client.request<AccessRequest>({
    method: 'POST',
    path: `/governance/api/v1/requests/${requestId}/cancel`,
    body: { reason },
  });
}

/**
 * Reassign an access request to a different approver
 */
export async function reassignAccessRequest(
  client: OktaClient,
  requestId: string,
  newApproverId: string,
  reason?: string
): Promise<AccessRequest> {
  return client.request<AccessRequest>({
    method: 'POST',
    path: `/governance/api/v1/requests/${requestId}/reassign`,
    body: { newApproverId, reason },
  });
}
