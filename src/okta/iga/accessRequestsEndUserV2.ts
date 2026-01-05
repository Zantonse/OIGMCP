/**
 * Okta IGA Access Requests End-User v2 API
 * Self-service operations for end users (my-requests, my-catalogs)
 * Base path: /governance/api/v2/...
 */

import type { OktaClient, PaginatedResponse } from '../client.js';

// ============================================================================
// Types - My Requests
// ============================================================================

export interface MyRequest {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'CANCELLED' | 'FULFILLED' | 'FAILED';
  requestType: 'SELF' | 'ON_BEHALF';
  targetUserId: string;
  targetUserName?: string;
  created: string;
  lastUpdated: string;
  completedDate?: string;
  justification?: string;
  requestedItems: MyRequestedItem[];
  currentStep?: MyApprovalStep;
  _links?: Record<string, { href: string }>;
}

export interface MyRequestedItem {
  id: string;
  type: 'APP' | 'ENTITLEMENT' | 'ROLE' | 'GROUP' | 'PACKAGE';
  resourceId: string;
  resourceName?: string;
  resourceDescription?: string;
  entitlementType?: string;
  entitlementValue?: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'FULFILLED' | 'FAILED';
}

export interface MyApprovalStep {
  stepNumber: number;
  name?: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'SKIPPED';
  approverNames?: string[];
}

export interface CreateMyRequestPayload {
  targetUserId?: string;  // Omit or set to self for self-service
  justification?: string;
  requestedItems: Array<{
    type: 'APP' | 'ENTITLEMENT' | 'ROLE' | 'GROUP' | 'PACKAGE';
    resourceId: string;
    entitlementId?: string;
  }>;
}

// ============================================================================
// Types - My Catalog
// ============================================================================

export interface MyCatalogItem {
  id: string;
  type: 'APP' | 'ENTITLEMENT' | 'ROLE' | 'GROUP' | 'PACKAGE';
  resourceId: string;
  resourceName: string;
  resourceDescription?: string;
  resourceLogoUrl?: string;
  category?: string;
  requestable: boolean;
  alreadyHasAccess: boolean;
  pendingRequest?: boolean;
  entitlementType?: string;
  entitlementValue?: string;
  _links?: Record<string, { href: string }>;
}

export interface MyCatalog {
  id: string;
  name: string;
  description?: string;
  itemCount: number;
  _links?: Record<string, { href: string }>;
}

// ============================================================================
// Types - My Tasks (Pending Approvals)
// ============================================================================

export interface MyTask {
  id: string;
  taskType: 'ACCESS_REQUEST_APPROVAL' | 'CERTIFICATION_REVIEW';
  status: 'PENDING' | 'COMPLETED';
  created: string;
  dueDate?: string;
  requestId?: string;
  requesterName?: string;
  requestedItems?: MyRequestedItem[];
  _links?: Record<string, { href: string }>;
}

// ============================================================================
// My Requests API Functions
// ============================================================================

/**
 * List my access requests (requests I submitted)
 */
export async function listMyRequests(
  client: OktaClient,
  options?: {
    status?: 'PENDING' | 'APPROVED' | 'DENIED' | 'CANCELLED' | 'FULFILLED' | 'FAILED';
    limit?: number;
    after?: string;
  }
): Promise<PaginatedResponse<MyRequest>> {
  return client.paginatedRequest<MyRequest>({
    method: 'GET',
    path: '/governance/api/v2/my-requests',
    query: {
      status: options?.status,
      limit: options?.limit,
      after: options?.after,
    },
  });
}

/**
 * Get a specific request I submitted
 */
export async function getMyRequest(
  client: OktaClient,
  requestId: string
): Promise<MyRequest> {
  return client.request<MyRequest>({
    method: 'GET',
    path: `/governance/api/v2/my-requests/${requestId}`,
  });
}

/**
 * Create a new access request (self-service)
 */
export async function createMyRequest(
  client: OktaClient,
  payload: CreateMyRequestPayload
): Promise<MyRequest> {
  return client.request<MyRequest>({
    method: 'POST',
    path: '/governance/api/v2/my-requests',
    body: payload,
  });
}

/**
 * Cancel a pending request I submitted
 */
export async function cancelMyRequest(
  client: OktaClient,
  requestId: string,
  reason?: string
): Promise<MyRequest> {
  return client.request<MyRequest>({
    method: 'POST',
    path: `/governance/api/v2/my-requests/${requestId}/cancel`,
    body: reason ? { reason } : undefined,
  });
}

// ============================================================================
// My Catalog API Functions
// ============================================================================

/**
 * List all catalogs available to me
 */
export async function listMyCatalogs(
  client: OktaClient,
  options?: { limit?: number; after?: string }
): Promise<PaginatedResponse<MyCatalog>> {
  return client.paginatedRequest<MyCatalog>({
    method: 'GET',
    path: '/governance/api/v2/my-catalogs',
    query: {
      limit: options?.limit,
      after: options?.after,
    },
  });
}

/**
 * Get items from a specific catalog available to me
 */
export async function getMyCatalogItems(
  client: OktaClient,
  catalogId: string,
  options?: {
    search?: string;
    type?: 'APP' | 'ENTITLEMENT' | 'ROLE' | 'GROUP' | 'PACKAGE';
    limit?: number;
    after?: string;
  }
): Promise<PaginatedResponse<MyCatalogItem>> {
  return client.paginatedRequest<MyCatalogItem>({
    method: 'GET',
    path: `/governance/api/v2/my-catalogs/${catalogId}/items`,
    query: {
      search: options?.search,
      type: options?.type,
      limit: options?.limit,
      after: options?.after,
    },
  });
}

/**
 * Search all requestable items across all my catalogs
 */
export async function searchMyCatalogItems(
  client: OktaClient,
  options?: {
    search?: string;
    type?: 'APP' | 'ENTITLEMENT' | 'ROLE' | 'GROUP' | 'PACKAGE';
    category?: string;
    limit?: number;
    after?: string;
  }
): Promise<PaginatedResponse<MyCatalogItem>> {
  return client.paginatedRequest<MyCatalogItem>({
    method: 'GET',
    path: '/governance/api/v2/my-catalog-items',
    query: {
      search: options?.search,
      type: options?.type,
      category: options?.category,
      limit: options?.limit,
      after: options?.after,
    },
  });
}

// ============================================================================
// My Tasks API Functions
// ============================================================================

/**
 * List my pending approval tasks
 */
export async function listMyTasks(
  client: OktaClient,
  options?: {
    taskType?: 'ACCESS_REQUEST_APPROVAL' | 'CERTIFICATION_REVIEW';
    status?: 'PENDING' | 'COMPLETED';
    limit?: number;
    after?: string;
  }
): Promise<PaginatedResponse<MyTask>> {
  return client.paginatedRequest<MyTask>({
    method: 'GET',
    path: '/governance/api/v2/my-tasks',
    query: {
      taskType: options?.taskType,
      status: options?.status,
      limit: options?.limit,
      after: options?.after,
    },
  });
}

/**
 * Get a specific task assigned to me
 */
export async function getMyTask(
  client: OktaClient,
  taskId: string
): Promise<MyTask> {
  return client.request<MyTask>({
    method: 'GET',
    path: `/governance/api/v2/my-tasks/${taskId}`,
  });
}

/**
 * Approve a request task assigned to me
 */
export async function approveMyTask(
  client: OktaClient,
  taskId: string,
  comment?: string
): Promise<MyTask> {
  return client.request<MyTask>({
    method: 'POST',
    path: `/governance/api/v2/my-tasks/${taskId}/approve`,
    body: comment ? { comment } : undefined,
  });
}

/**
 * Deny a request task assigned to me
 */
export async function denyMyTask(
  client: OktaClient,
  taskId: string,
  reason: string
): Promise<MyTask> {
  return client.request<MyTask>({
    method: 'POST',
    path: `/governance/api/v2/my-tasks/${taskId}/deny`,
    body: { reason },
  });
}
