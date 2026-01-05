/**
 * Okta IGA Access Certifications API
 * Read and write operations for campaigns and reviews
 */

import type { OktaClient, PaginatedResponse } from '../client.js';

// ============================================================================
// Types
// ============================================================================

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
  type: 'USER' | 'RESOURCE';
  created: string;
  lastUpdated: string;
  scheduledStartDate?: string;
  actualStartDate?: string;
  scheduledEndDate?: string;
  actualEndDate?: string;
  reviewerType?: string;
  scope?: CampaignScope;
  remediationSettings?: RemediationSettings;
  statistics?: CampaignStatistics;
  _links?: Record<string, { href: string }>;
}

export interface CampaignScope {
  resourceSets?: string[];
  userFilter?: string;
  groupIds?: string[];
  appIds?: string[];
}

export interface RemediationSettings {
  enabled: boolean;
  autoRemediate?: boolean;
  removeAccess?: boolean;
}

export interface CampaignStatistics {
  totalReviews: number;
  completedReviews: number;
  pendingReviews: number;
  itemsApproved: number;
  itemsDenied: number;
  itemsReassigned: number;
}

export interface Review {
  id: string;
  campaignId: string;
  reviewerId: string;
  reviewerName?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  created: string;
  lastUpdated: string;
  completedDate?: string;
  itemCount?: number;
  completedItemCount?: number;
  _links?: Record<string, { href: string }>;
}

export interface ReviewItem {
  id: string;
  reviewId: string;
  resourceType: string;
  resourceId: string;
  resourceName?: string;
  principalType: string;
  principalId: string;
  principalName?: string;
  entitlementType?: string;
  entitlementValue?: string;
  decision?: 'APPROVED' | 'DENIED' | 'ABSTAINED' | 'REASSIGNED';
  decisionDate?: string;
  decisionReason?: string;
  reassignedTo?: string;
  created: string;
  lastUpdated: string;
  _links?: Record<string, { href: string }>;
}

// ============================================================================
// Query Parameters
// ============================================================================

export interface ListCampaignsParams {
  status?: 'SCHEDULED' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
  type?: 'USER' | 'RESOURCE';
  q?: string;
  after?: string;
  limit?: number;
}

export interface ListReviewsParams {
  campaignId: string;
  reviewerId?: string;
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  after?: string;
  limit?: number;
}

export interface ListReviewItemsParams {
  reviewId: string;
  decision?: 'APPROVED' | 'DENIED' | 'ABSTAINED' | 'REASSIGNED';
  after?: string;
  limit?: number;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * List access certification campaigns
 */
export async function listCampaigns(
  client: OktaClient,
  params: ListCampaignsParams = {}
): Promise<PaginatedResponse<Campaign>> {
  const { status, type, q, after, limit = 20 } = params;

  return client.paginatedRequest<Campaign>({
    method: 'GET',
    path: '/governance/api/v1/campaigns',
    query: {
      status,
      type,
      q,
      after,
      limit,
    },
  });
}

/**
 * Get a single campaign by ID
 */
export async function getCampaign(client: OktaClient, campaignId: string): Promise<Campaign> {
  return client.request<Campaign>({
    method: 'GET',
    path: `/governance/api/v1/campaigns/${campaignId}`,
  });
}

/**
 * List reviews for a campaign
 */
export async function listReviews(
  client: OktaClient,
  params: ListReviewsParams
): Promise<PaginatedResponse<Review>> {
  const { campaignId, reviewerId, status, after, limit = 20 } = params;

  return client.paginatedRequest<Review>({
    method: 'GET',
    path: `/governance/api/v1/campaigns/${campaignId}/reviews`,
    query: {
      reviewerId,
      status,
      after,
      limit,
    },
  });
}

/**
 * Get a single review by ID
 */
export async function getReview(client: OktaClient, reviewId: string): Promise<Review> {
  return client.request<Review>({
    method: 'GET',
    path: `/governance/api/v1/reviews/${reviewId}`,
  });
}

/**
 * List items within a review
 */
export async function listReviewItems(
  client: OktaClient,
  params: ListReviewItemsParams
): Promise<PaginatedResponse<ReviewItem>> {
  const { reviewId, decision, after, limit = 50 } = params;

  return client.paginatedRequest<ReviewItem>({
    method: 'GET',
    path: `/governance/api/v1/reviews/${reviewId}/items`,
    query: {
      decision,
      after,
      limit,
    },
  });
}

// ============================================================================
// Write Operations - Input Types
// ============================================================================

export interface CreateCampaignInput {
  name: string;
  description?: string;
  type: 'USER' | 'RESOURCE';
  scheduledStartDate?: string;
  scheduledEndDate?: string;
  reviewerType?: 'MANAGER' | 'APP_OWNER' | 'RESOURCE_OWNER' | 'SPECIFIC_USERS';
  reviewers?: string[];
  scope?: CampaignScope;
  remediationSettings?: RemediationSettings;
  notificationSettings?: {
    sendLaunchNotification?: boolean;
    sendReminderNotification?: boolean;
    reminderFrequencyDays?: number;
  };
}

export interface ReviewItemDecisionInput {
  reviewId: string;
  itemId: string;
  decision: 'APPROVED' | 'DENIED' | 'ABSTAINED';
  reason?: string;
}

export interface ReassignReviewItemInput {
  reviewId: string;
  itemId: string;
  reassignToUserId: string;
  reason?: string;
}

export interface BulkDecisionInput {
  reviewId: string;
  itemIds: string[];
  decision: 'APPROVED' | 'DENIED';
  reason?: string;
}

// ============================================================================
// Write Operations - API Functions
// ============================================================================

/**
 * Create a new access certification campaign
 */
export async function createCampaign(
  client: OktaClient,
  input: CreateCampaignInput
): Promise<Campaign> {
  return client.request<Campaign>({
    method: 'POST',
    path: '/governance/api/v1/campaigns',
    body: input,
  });
}

/**
 * Launch a scheduled campaign immediately
 */
export async function launchCampaign(
  client: OktaClient,
  campaignId: string
): Promise<Campaign> {
  return client.request<Campaign>({
    method: 'POST',
    path: `/governance/api/v1/campaigns/${campaignId}/launch`,
  });
}

/**
 * End an active campaign
 */
export async function endCampaign(
  client: OktaClient,
  campaignId: string,
  options?: { skipRemediation?: boolean }
): Promise<Campaign> {
  return client.request<Campaign>({
    method: 'POST',
    path: `/governance/api/v1/campaigns/${campaignId}/end`,
    body: options,
  });
}

/**
 * Delete a campaign (only SCHEDULED campaigns can be deleted)
 */
export async function deleteCampaign(
  client: OktaClient,
  campaignId: string
): Promise<void> {
  return client.request<void>({
    method: 'DELETE',
    path: `/governance/api/v1/campaigns/${campaignId}`,
  });
}

/**
 * Make a decision on a review item (approve/deny/abstain)
 */
export async function decideReviewItem(
  client: OktaClient,
  input: ReviewItemDecisionInput
): Promise<ReviewItem> {
  const { reviewId, itemId, decision, reason } = input;
  return client.request<ReviewItem>({
    method: 'POST',
    path: `/governance/api/v1/reviews/${reviewId}/items/${itemId}/decide`,
    body: { decision, reason },
  });
}

/**
 * Reassign a review item to another user
 */
export async function reassignReviewItem(
  client: OktaClient,
  input: ReassignReviewItemInput
): Promise<ReviewItem> {
  const { reviewId, itemId, reassignToUserId, reason } = input;
  return client.request<ReviewItem>({
    method: 'POST',
    path: `/governance/api/v1/reviews/${reviewId}/items/${itemId}/reassign`,
    body: { reassignToUserId, reason },
  });
}

/**
 * Make bulk decisions on multiple review items
 */
export async function bulkDecideReviewItems(
  client: OktaClient,
  input: BulkDecisionInput
): Promise<{ succeeded: string[]; failed: Array<{ itemId: string; error: string }> }> {
  const { reviewId, itemIds, decision, reason } = input;
  return client.request({
    method: 'POST',
    path: `/governance/api/v1/reviews/${reviewId}/items/bulk-decide`,
    body: { itemIds, decision, reason },
  });
}

/**
 * Complete a review (mark as finished)
 */
export async function completeReview(
  client: OktaClient,
  reviewId: string
): Promise<Review> {
  return client.request<Review>({
    method: 'POST',
    path: `/governance/api/v1/reviews/${reviewId}/complete`,
  });
}
