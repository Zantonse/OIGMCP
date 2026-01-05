/**
 * Okta IGA Access Requests Admin v2 API
 * Administrative configuration for request settings, conditions, and sequences
 * Base path: /governance/api/v2/...
 */

import type { OktaClient, PaginatedResponse } from '../client.js';

// ============================================================================
// Types - Request Settings
// ============================================================================

export interface RequestSettings {
  id: string;
  resourceId?: string;
  requestable: boolean;
  approvalRequired: boolean;
  justificationRequired: boolean;
  requestConditionId?: string;
  approvalSequenceId?: string;
  timeLimitMinutes?: number;
  created: string;
  lastUpdated: string;
  _links?: Record<string, { href: string }>;
}

export interface CreateRequestSettingsPayload {
  requestable?: boolean;
  approvalRequired?: boolean;
  justificationRequired?: boolean;
  requestConditionId?: string;
  approvalSequenceId?: string;
  timeLimitMinutes?: number;
}

export interface UpdateRequestSettingsPayload {
  requestable?: boolean;
  approvalRequired?: boolean;
  justificationRequired?: boolean;
  requestConditionId?: string;
  approvalSequenceId?: string;
  timeLimitMinutes?: number;
}

// ============================================================================
// Types - Request Conditions
// ============================================================================

export interface RequestCondition {
  id: string;
  name: string;
  description?: string;
  type: 'USER_ATTRIBUTE' | 'GROUP_MEMBERSHIP' | 'CUSTOM';
  expression?: string;
  groups?: string[];
  userAttributes?: UserAttributeCondition[];
  created: string;
  lastUpdated: string;
  _links?: Record<string, { href: string }>;
}

export interface UserAttributeCondition {
  attribute: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH';
  value: string;
}

export interface CreateRequestConditionPayload {
  name: string;
  description?: string;
  type: 'USER_ATTRIBUTE' | 'GROUP_MEMBERSHIP' | 'CUSTOM';
  expression?: string;
  groups?: string[];
  userAttributes?: UserAttributeCondition[];
}

export interface UpdateRequestConditionPayload {
  name?: string;
  description?: string;
  type?: 'USER_ATTRIBUTE' | 'GROUP_MEMBERSHIP' | 'CUSTOM';
  expression?: string;
  groups?: string[];
  userAttributes?: UserAttributeCondition[];
}

// ============================================================================
// Types - Approval Sequences
// ============================================================================

export interface ApprovalSequence {
  id: string;
  name: string;
  description?: string;
  steps: ApprovalSequenceStep[];
  created: string;
  lastUpdated: string;
  _links?: Record<string, { href: string }>;
}

export interface ApprovalSequenceStep {
  stepNumber: number;
  name?: string;
  approverType: 'USER' | 'GROUP' | 'MANAGER' | 'APP_OWNER' | 'RESOURCE_OWNER';
  approverIds?: string[];
  escalationMinutes?: number;
  escalationApproverType?: 'USER' | 'GROUP' | 'MANAGER';
  escalationApproverIds?: string[];
}

export interface CreateApprovalSequencePayload {
  name: string;
  description?: string;
  steps: ApprovalSequenceStep[];
}

export interface UpdateApprovalSequencePayload {
  name?: string;
  description?: string;
  steps?: ApprovalSequenceStep[];
}

// ============================================================================
// Request Settings API Functions
// ============================================================================

/**
 * Get global request settings (org-level defaults)
 */
export async function getGlobalRequestSettings(
  client: OktaClient
): Promise<RequestSettings> {
  return client.request<RequestSettings>({
    method: 'GET',
    path: '/governance/api/v2/request-settings',
  });
}

/**
 * Update global request settings
 */
export async function updateGlobalRequestSettings(
  client: OktaClient,
  payload: UpdateRequestSettingsPayload
): Promise<RequestSettings> {
  return client.request<RequestSettings>({
    method: 'PUT',
    path: '/governance/api/v2/request-settings',
    body: payload,
  });
}

/**
 * Get request settings for a specific resource (app, entitlement, etc.)
 */
export async function getResourceRequestSettings(
  client: OktaClient,
  resourceId: string
): Promise<RequestSettings> {
  return client.request<RequestSettings>({
    method: 'GET',
    path: `/governance/api/v2/resources/${resourceId}/request-settings`,
  });
}

/**
 * Create or update request settings for a specific resource
 */
export async function upsertResourceRequestSettings(
  client: OktaClient,
  resourceId: string,
  payload: CreateRequestSettingsPayload
): Promise<RequestSettings> {
  return client.request<RequestSettings>({
    method: 'PUT',
    path: `/governance/api/v2/resources/${resourceId}/request-settings`,
    body: payload,
  });
}

/**
 * Delete request settings for a specific resource (reverts to global defaults)
 */
export async function deleteResourceRequestSettings(
  client: OktaClient,
  resourceId: string
): Promise<void> {
  return client.request<void>({
    method: 'DELETE',
    path: `/governance/api/v2/resources/${resourceId}/request-settings`,
  });
}

// ============================================================================
// Request Conditions API Functions
// ============================================================================

/**
 * List all request conditions
 */
export async function listRequestConditions(
  client: OktaClient,
  options?: { limit?: number; after?: string }
): Promise<PaginatedResponse<RequestCondition>> {
  return client.paginatedRequest<RequestCondition>({
    method: 'GET',
    path: '/governance/api/v2/request-conditions',
    query: {
      limit: options?.limit,
      after: options?.after,
    },
  });
}

/**
 * Get a specific request condition
 */
export async function getRequestCondition(
  client: OktaClient,
  conditionId: string
): Promise<RequestCondition> {
  return client.request<RequestCondition>({
    method: 'GET',
    path: `/governance/api/v2/request-conditions/${conditionId}`,
  });
}

/**
 * Create a new request condition
 */
export async function createRequestCondition(
  client: OktaClient,
  payload: CreateRequestConditionPayload
): Promise<RequestCondition> {
  return client.request<RequestCondition>({
    method: 'POST',
    path: '/governance/api/v2/request-conditions',
    body: payload,
  });
}

/**
 * Update a request condition
 */
export async function updateRequestCondition(
  client: OktaClient,
  conditionId: string,
  payload: UpdateRequestConditionPayload
): Promise<RequestCondition> {
  return client.request<RequestCondition>({
    method: 'PUT',
    path: `/governance/api/v2/request-conditions/${conditionId}`,
    body: payload,
  });
}

/**
 * Delete a request condition
 */
export async function deleteRequestCondition(
  client: OktaClient,
  conditionId: string
): Promise<void> {
  return client.request<void>({
    method: 'DELETE',
    path: `/governance/api/v2/request-conditions/${conditionId}`,
  });
}

// ============================================================================
// Approval Sequences API Functions
// ============================================================================

/**
 * List all approval sequences
 */
export async function listApprovalSequences(
  client: OktaClient,
  options?: { limit?: number; after?: string }
): Promise<PaginatedResponse<ApprovalSequence>> {
  return client.paginatedRequest<ApprovalSequence>({
    method: 'GET',
    path: '/governance/api/v2/approval-sequences',
    query: {
      limit: options?.limit,
      after: options?.after,
    },
  });
}

/**
 * Get a specific approval sequence
 */
export async function getApprovalSequence(
  client: OktaClient,
  sequenceId: string
): Promise<ApprovalSequence> {
  return client.request<ApprovalSequence>({
    method: 'GET',
    path: `/governance/api/v2/approval-sequences/${sequenceId}`,
  });
}

/**
 * Create a new approval sequence
 */
export async function createApprovalSequence(
  client: OktaClient,
  payload: CreateApprovalSequencePayload
): Promise<ApprovalSequence> {
  return client.request<ApprovalSequence>({
    method: 'POST',
    path: '/governance/api/v2/approval-sequences',
    body: payload,
  });
}

/**
 * Update an approval sequence
 */
export async function updateApprovalSequence(
  client: OktaClient,
  sequenceId: string,
  payload: UpdateApprovalSequencePayload
): Promise<ApprovalSequence> {
  return client.request<ApprovalSequence>({
    method: 'PUT',
    path: `/governance/api/v2/approval-sequences/${sequenceId}`,
    body: payload,
  });
}

/**
 * Delete an approval sequence
 */
export async function deleteApprovalSequence(
  client: OktaClient,
  sequenceId: string
): Promise<void> {
  return client.request<void>({
    method: 'DELETE',
    path: `/governance/api/v2/approval-sequences/${sequenceId}`,
  });
}
