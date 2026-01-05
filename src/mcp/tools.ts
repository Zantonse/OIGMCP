/**
 * MCP Tool Definitions for Okta IGA
 * Read and write tools for Access Certifications, Access Requests, Entitlements, and Grants
 */

import { z } from 'zod';
import type { OktaClient } from '../okta/client.js';
import * as certifications from '../okta/iga/accessCertifications.js';
import * as requests from '../okta/iga/accessRequests.js';
import * as adminV2 from '../okta/iga/accessRequestsAdminV2.js';
import * as endUserV2 from '../okta/iga/accessRequestsEndUserV2.js';
import * as entitlements from '../okta/iga/entitlements.js';
import * as oktaGroups from '../okta/management/groups.js';

// ============================================================================
// Tool Input Schemas (Zod)
// ============================================================================

export const listCampaignsSchema = z.object({
  status: z.enum(['SCHEDULED', 'ACTIVE', 'CLOSED', 'ARCHIVED']).optional()
    .describe('Filter by campaign status'),
  type: z.enum(['USER', 'RESOURCE']).optional()
    .describe('Filter by campaign type'),
  q: z.string().optional()
    .describe('Search query for campaign name'),
  after: z.string().optional()
    .describe('Pagination cursor from previous response'),
  limit: z.number().int().min(1).max(200).optional()
    .describe('Maximum items to return (default 20)'),
});

export const getCampaignSchema = z.object({
  campaignId: z.string().min(1).describe('The campaign ID'),
});

export const listReviewsSchema = z.object({
  campaignId: z.string().min(1).describe('The campaign ID'),
  reviewerId: z.string().optional().describe('Filter by reviewer user ID'),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).optional()
    .describe('Filter by review status'),
  after: z.string().optional().describe('Pagination cursor'),
  limit: z.number().int().min(1).max(200).optional().describe('Max items'),
});

export const getReviewSchema = z.object({
  reviewId: z.string().min(1).describe('The review ID'),
});

export const listReviewItemsSchema = z.object({
  reviewId: z.string().min(1).describe('The review ID'),
  decision: z.enum(['APPROVED', 'DENIED', 'ABSTAINED', 'REASSIGNED']).optional()
    .describe('Filter by decision'),
  after: z.string().optional().describe('Pagination cursor'),
  limit: z.number().int().min(1).max(200).optional().describe('Max items'),
});

export const listAccessRequestsSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'DENIED', 'CANCELLED', 'FULFILLED', 'FAILED']).optional()
    .describe('Filter by request status'),
  requesterId: z.string().optional().describe('Filter by requester user ID'),
  targetUserId: z.string().optional().describe('Filter by target user ID'),
  requestType: z.enum(['SELF', 'ON_BEHALF']).optional()
    .describe('Filter by request type'),
  q: z.string().optional().describe('Search query'),
  after: z.string().optional().describe('Pagination cursor'),
  limit: z.number().int().min(1).max(200).optional().describe('Max items'),
});

export const getAccessRequestSchema = z.object({
  requestId: z.string().min(1).describe('The access request ID'),
});

export const listRequestEventsSchema = z.object({
  requestId: z.string().min(1).describe('The access request ID'),
  after: z.string().optional().describe('Pagination cursor'),
  limit: z.number().int().min(1).max(200).optional().describe('Max items'),
});

export const listCatalogItemsSchema = z.object({
  type: z.enum(['APP', 'ENTITLEMENT', 'ROLE', 'GROUP', 'PACKAGE']).optional()
    .describe('Filter by item type'),
  category: z.string().optional().describe('Filter by category'),
  q: z.string().optional().describe('Search query'),
  requestable: z.boolean().optional().describe('Filter by requestable status'),
  after: z.string().optional().describe('Pagination cursor'),
  limit: z.number().int().min(1).max(200).optional().describe('Max items'),
});

export const getCatalogItemSchema = z.object({
  itemId: z.string().min(1).describe('The catalog item ID'),
});

export const listPackagesSchema = z.object({
  category: z.string().optional().describe('Filter by category'),
  q: z.string().optional().describe('Search query'),
  requestable: z.boolean().optional().describe('Filter by requestable status'),
  after: z.string().optional().describe('Pagination cursor'),
  limit: z.number().int().min(1).max(200).optional().describe('Max items'),
});

export const getPackageSchema = z.object({
  packageId: z.string().min(1).describe('The package ID'),
});

// Okta Core (Management) schemas
export const oktaGroupsListSchema = z.object({
  q: z.string().optional().describe('Free-text search on group name (Okta q=)'),
  search: z.string().optional().describe('SCIM search expression (Okta search=)'),
  filter: z.string().optional().describe('Filter expression (Okta filter=)'),
  after: z.string().optional().describe('Pagination cursor (Okta after=)'),
  limit: z.number().int().min(1).max(200).optional().describe('Max items'),
});

// ============================================================================
// Write Operation Schemas
// ============================================================================

// Campaign write schemas
export const createCampaignSchema = z.object({
  name: z.string().min(1).describe('Campaign name'),
  description: z.string().optional().describe('Campaign description'),
  type: z.enum(['USER', 'RESOURCE']).describe('Campaign type: USER (review user access) or RESOURCE (review resource assignments)'),
  scheduledStartDate: z.string().optional().describe('ISO 8601 date for scheduled start'),
  scheduledEndDate: z.string().optional().describe('ISO 8601 date for scheduled end'),
  reviewerType: z.enum(['MANAGER', 'APP_OWNER', 'RESOURCE_OWNER', 'SPECIFIC_USERS']).optional()
    .describe('Who reviews: MANAGER, APP_OWNER, RESOURCE_OWNER, or SPECIFIC_USERS'),
  reviewers: z.array(z.string()).optional().describe('User IDs if reviewerType is SPECIFIC_USERS'),
  scope: z.object({
    resourceSets: z.array(z.string()).optional(),
    userFilter: z.string().optional(),
    groupIds: z.array(z.string()).optional(),
    appIds: z.array(z.string()).optional(),
  }).optional().describe('Campaign scope filters'),
  remediationEnabled: z.boolean().optional().describe('Enable automatic remediation'),
  autoRemediate: z.boolean().optional().describe('Auto-remediate denied items'),
});

export const launchCampaignSchema = z.object({
  campaignId: z.string().min(1).describe('The campaign ID to launch'),
});

export const endCampaignSchema = z.object({
  campaignId: z.string().min(1).describe('The campaign ID to end'),
  skipRemediation: z.boolean().optional().describe('Skip remediation when ending'),
});

export const deleteCampaignSchema = z.object({
  campaignId: z.string().min(1).describe('The campaign ID to delete (must be SCHEDULED status)'),
});

// Review item decision schemas
export const decideReviewItemSchema = z.object({
  reviewId: z.string().min(1).describe('The review ID'),
  itemId: z.string().min(1).describe('The review item ID'),
  decision: z.enum(['APPROVED', 'DENIED', 'ABSTAINED']).describe('Decision: APPROVED, DENIED, or ABSTAINED'),
  reason: z.string().optional().describe('Reason for the decision'),
});

export const reassignReviewItemSchema = z.object({
  reviewId: z.string().min(1).describe('The review ID'),
  itemId: z.string().min(1).describe('The review item ID'),
  reassignToUserId: z.string().min(1).describe('User ID to reassign the item to'),
  reason: z.string().optional().describe('Reason for reassignment'),
});

export const bulkDecideSchema = z.object({
  reviewId: z.string().min(1).describe('The review ID'),
  itemIds: z.array(z.string().min(1)).min(1).describe('Array of review item IDs'),
  decision: z.enum(['APPROVED', 'DENIED']).describe('Decision to apply to all items'),
  reason: z.string().optional().describe('Reason for the decisions'),
});

export const completeReviewSchema = z.object({
  reviewId: z.string().min(1).describe('The review ID to complete'),
});

// Access request write schemas
export const createAccessRequestSchema = z.object({
  targetUserId: z.string().min(1).describe('User ID to request access for'),
  justification: z.string().optional().describe('Business justification for the request'),
  requestedItems: z.array(z.object({
    type: z.enum(['APP', 'ENTITLEMENT', 'ROLE', 'GROUP', 'PACKAGE']).describe('Item type'),
    resourceId: z.string().min(1).describe('Resource/app/group ID'),
    entitlementType: z.string().optional().describe('Entitlement type if applicable'),
    entitlementValue: z.string().optional().describe('Entitlement value if applicable'),
  })).min(1).describe('Items to request access to'),
});

export const approveAccessRequestSchema = z.object({
  requestId: z.string().min(1).describe('The request ID to approve'),
  comment: z.string().optional().describe('Approval comment'),
});

export const denyAccessRequestSchema = z.object({
  requestId: z.string().min(1).describe('The request ID to deny'),
  reason: z.string().min(1).describe('Reason for denial (required)'),
});

export const cancelAccessRequestSchema = z.object({
  requestId: z.string().min(1).describe('The request ID to cancel'),
  reason: z.string().optional().describe('Reason for cancellation'),
});

export const reassignAccessRequestSchema = z.object({
  requestId: z.string().min(1).describe('The request ID to reassign'),
  newApproverId: z.string().min(1).describe('User ID of new approver'),
  reason: z.string().optional().describe('Reason for reassignment'),
});

// ============================================================================
// Entitlements & Grants Schemas (Read)
// ============================================================================

export const listEntitlementsSchema = z.object({
  resourceId: z.string().optional().describe('Filter by resource/app ID'),
  resourceType: z.enum(['APP', 'GROUP', 'ROLE']).optional().describe('Filter by resource type'),
  type: z.string().optional().describe('Filter by entitlement type'),
  governed: z.boolean().optional().describe('Filter by governance status'),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().describe('Filter by risk level'),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().describe('Filter by status'),
  q: z.string().optional().describe('Search query'),
  after: z.string().optional().describe('Pagination cursor'),
  limit: z.number().int().min(1).max(200).optional().describe('Max items'),
});

export const getEntitlementSchema = z.object({
  entitlementId: z.string().min(1).describe('The entitlement ID'),
});

export const listGrantsSchema = z.object({
  entitlementId: z.string().optional().describe('Filter by entitlement ID'),
  principalId: z.string().optional().describe('Filter by principal (user/group) ID'),
  principalType: z.enum(['USER', 'GROUP']).optional().describe('Filter by principal type'),
  resourceId: z.string().optional().describe('Filter by resource ID'),
  grantType: z.enum(['DIRECT', 'INHERITED', 'ROLE_BASED']).optional().describe('Filter by grant type'),
  status: z.enum(['ACTIVE', 'PENDING', 'REVOKED', 'EXPIRED']).optional().describe('Filter by status'),
  after: z.string().optional().describe('Pagination cursor'),
  limit: z.number().int().min(1).max(200).optional().describe('Max items'),
});

export const getGrantSchema = z.object({
  grantId: z.string().min(1).describe('The grant ID'),
});

export const listUserGrantsSchema = z.object({
  userId: z.string().min(1).describe('The user ID'),
  entitlementId: z.string().optional().describe('Filter by entitlement ID'),
  resourceId: z.string().optional().describe('Filter by resource ID'),
  grantType: z.enum(['DIRECT', 'INHERITED', 'ROLE_BASED']).optional().describe('Filter by grant type'),
  status: z.enum(['ACTIVE', 'PENDING', 'REVOKED', 'EXPIRED']).optional().describe('Filter by status'),
  after: z.string().optional().describe('Pagination cursor'),
  limit: z.number().int().min(1).max(200).optional().describe('Max items'),
});

export const listEntitlementGrantsSchema = z.object({
  entitlementId: z.string().min(1).describe('The entitlement ID'),
  principalId: z.string().optional().describe('Filter by principal ID'),
  principalType: z.enum(['USER', 'GROUP']).optional().describe('Filter by principal type'),
  resourceId: z.string().optional().describe('Filter by resource ID'),
  grantType: z.enum(['DIRECT', 'INHERITED', 'ROLE_BASED']).optional().describe('Filter by grant type'),
  status: z.enum(['ACTIVE', 'PENDING', 'REVOKED', 'EXPIRED']).optional().describe('Filter by status'),
  after: z.string().optional().describe('Pagination cursor'),
  limit: z.number().int().min(1).max(200).optional().describe('Max items'),
});

export const listBundlesSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().describe('Filter by status'),
  q: z.string().optional().describe('Search query'),
  after: z.string().optional().describe('Pagination cursor'),
  limit: z.number().int().min(1).max(200).optional().describe('Max items'),
});

export const getBundleSchema = z.object({
  bundleId: z.string().min(1).describe('The bundle ID'),
});

export const listGovernedResourcesSchema = z.object({
  type: z.enum(['APP', 'GROUP', 'ROLE']).optional().describe('Filter by resource type'),
  governed: z.boolean().optional().describe('Filter by governance status'),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().describe('Filter by status'),
  q: z.string().optional().describe('Search query'),
  after: z.string().optional().describe('Pagination cursor'),
  limit: z.number().int().min(1).max(200).optional().describe('Max items'),
});

export const getGovernedResourceSchema = z.object({
  resourceId: z.string().min(1).describe('The resource ID'),
});

export const getPrincipalAccessSchema = z.object({
  principalId: z.string().min(1).describe('User or group ID'),
  principalType: z.enum(['USER', 'GROUP']).describe('Principal type'),
  resourceId: z.string().optional().describe('Filter by specific resource'),
  includeInherited: z.boolean().optional().describe('Include inherited access'),
});

export const listResourceEntitlementsSchema = z.object({
  resourceId: z.string().min(1).describe('The resource ID'),
  type: z.string().optional().describe('Filter by entitlement type'),
  governed: z.boolean().optional().describe('Filter by governance status'),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().describe('Filter by risk level'),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().describe('Filter by status'),
  q: z.string().optional().describe('Search query'),
  after: z.string().optional().describe('Pagination cursor'),
  limit: z.number().int().min(1).max(200).optional().describe('Max items'),
});

// ============================================================================
// Admin v2 Schemas - Request Settings, Conditions, Approval Sequences
// ============================================================================

export const getGlobalRequestSettingsSchema = z.object({});

export const updateGlobalRequestSettingsSchema = z.object({
  requestable: z.boolean().optional().describe('Whether requests are enabled globally'),
  approvalRequired: z.boolean().optional().describe('Whether approval is required'),
  justificationRequired: z.boolean().optional().describe('Whether justification is required'),
  requestConditionId: z.string().optional().describe('Request condition ID to apply'),
  approvalSequenceId: z.string().optional().describe('Approval sequence ID to use'),
  timeLimitMinutes: z.number().optional().describe('Time limit for request completion'),
});

export const getResourceRequestSettingsSchema = z.object({
  resourceId: z.string().min(1).describe('The resource ID'),
});

export const upsertResourceRequestSettingsSchema = z.object({
  resourceId: z.string().min(1).describe('The resource ID'),
  requestable: z.boolean().optional().describe('Whether resource is requestable'),
  approvalRequired: z.boolean().optional().describe('Whether approval is required'),
  justificationRequired: z.boolean().optional().describe('Whether justification is required'),
  requestConditionId: z.string().optional().describe('Request condition ID'),
  approvalSequenceId: z.string().optional().describe('Approval sequence ID'),
  timeLimitMinutes: z.number().optional().describe('Time limit for request'),
});

export const deleteResourceRequestSettingsSchema = z.object({
  resourceId: z.string().min(1).describe('The resource ID'),
});

export const listRequestConditionsSchema = z.object({
  limit: z.number().int().min(1).max(200).optional().describe('Max items'),
  after: z.string().optional().describe('Pagination cursor'),
});

export const getRequestConditionSchema = z.object({
  conditionId: z.string().min(1).describe('The condition ID'),
});

export const createRequestConditionSchema = z.object({
  name: z.string().min(1).describe('Condition name'),
  description: z.string().optional().describe('Condition description'),
  type: z.enum(['USER_ATTRIBUTE', 'GROUP_MEMBERSHIP', 'CUSTOM']).describe('Condition type'),
  expression: z.string().optional().describe('Custom expression (for CUSTOM type)'),
  groups: z.array(z.string()).optional().describe('Group IDs (for GROUP_MEMBERSHIP)'),
  userAttributes: z.array(z.object({
    attribute: z.string().describe('Attribute name'),
    operator: z.enum(['EQUALS', 'NOT_EQUALS', 'CONTAINS', 'STARTS_WITH', 'ENDS_WITH']).describe('Comparison operator'),
    value: z.string().describe('Value to compare'),
  })).optional().describe('Attribute conditions (for USER_ATTRIBUTE)'),
});

export const updateRequestConditionSchema = z.object({
  conditionId: z.string().min(1).describe('The condition ID'),
  name: z.string().optional().describe('Condition name'),
  description: z.string().optional().describe('Condition description'),
  type: z.enum(['USER_ATTRIBUTE', 'GROUP_MEMBERSHIP', 'CUSTOM']).optional().describe('Condition type'),
  expression: z.string().optional().describe('Custom expression'),
  groups: z.array(z.string()).optional().describe('Group IDs'),
  userAttributes: z.array(z.object({
    attribute: z.string().describe('Attribute name'),
    operator: z.enum(['EQUALS', 'NOT_EQUALS', 'CONTAINS', 'STARTS_WITH', 'ENDS_WITH']).describe('Operator'),
    value: z.string().describe('Value'),
  })).optional().describe('Attribute conditions'),
});

export const deleteRequestConditionSchema = z.object({
  conditionId: z.string().min(1).describe('The condition ID'),
});

export const listApprovalSequencesSchema = z.object({
  limit: z.number().int().min(1).max(200).optional().describe('Max items'),
  after: z.string().optional().describe('Pagination cursor'),
});

export const getApprovalSequenceSchema = z.object({
  sequenceId: z.string().min(1).describe('The approval sequence ID'),
});

export const createApprovalSequenceSchema = z.object({
  name: z.string().min(1).describe('Sequence name'),
  description: z.string().optional().describe('Sequence description'),
  steps: z.array(z.object({
    stepNumber: z.number().describe('Step order (1-based)'),
    name: z.string().optional().describe('Step name'),
    approverType: z.enum(['USER', 'GROUP', 'MANAGER', 'APP_OWNER', 'RESOURCE_OWNER']).describe('Approver type'),
    approverIds: z.array(z.string()).optional().describe('User/group IDs for USER/GROUP type'),
    escalationMinutes: z.number().optional().describe('Minutes before escalation'),
    escalationApproverType: z.enum(['USER', 'GROUP', 'MANAGER']).optional().describe('Escalation approver type'),
    escalationApproverIds: z.array(z.string()).optional().describe('Escalation approver IDs'),
  })).min(1).describe('Approval steps'),
});

export const updateApprovalSequenceSchema = z.object({
  sequenceId: z.string().min(1).describe('The approval sequence ID'),
  name: z.string().optional().describe('Sequence name'),
  description: z.string().optional().describe('Sequence description'),
  steps: z.array(z.object({
    stepNumber: z.number().describe('Step order'),
    name: z.string().optional().describe('Step name'),
    approverType: z.enum(['USER', 'GROUP', 'MANAGER', 'APP_OWNER', 'RESOURCE_OWNER']).describe('Approver type'),
    approverIds: z.array(z.string()).optional().describe('Approver IDs'),
    escalationMinutes: z.number().optional().describe('Escalation time'),
    escalationApproverType: z.enum(['USER', 'GROUP', 'MANAGER']).optional().describe('Escalation type'),
    escalationApproverIds: z.array(z.string()).optional().describe('Escalation IDs'),
  })).optional().describe('Approval steps'),
});

export const deleteApprovalSequenceSchema = z.object({
  sequenceId: z.string().min(1).describe('The approval sequence ID'),
});

// ============================================================================
// End-User v2 Schemas - My Requests, My Catalog, My Tasks
// ============================================================================

export const listMyRequestsSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'DENIED', 'CANCELLED', 'FULFILLED', 'FAILED']).optional()
    .describe('Filter by request status'),
  limit: z.number().int().min(1).max(200).optional().describe('Max items'),
  after: z.string().optional().describe('Pagination cursor'),
});

export const getMyRequestSchema = z.object({
  requestId: z.string().min(1).describe('The request ID'),
});

export const createMyRequestSchema = z.object({
  targetUserId: z.string().optional().describe('Target user ID (omit for self)'),
  justification: z.string().optional().describe('Business justification'),
  requestedItems: z.array(z.object({
    type: z.enum(['APP', 'ENTITLEMENT', 'ROLE', 'GROUP', 'PACKAGE']).describe('Item type'),
    resourceId: z.string().min(1).describe('Resource/item ID'),
    entitlementId: z.string().optional().describe('Specific entitlement ID'),
  })).min(1).describe('Items to request'),
});

export const cancelMyRequestSchema = z.object({
  requestId: z.string().min(1).describe('The request ID'),
  reason: z.string().optional().describe('Cancellation reason'),
});

export const listMyCatalogsSchema = z.object({
  limit: z.number().int().min(1).max(200).optional().describe('Max items'),
  after: z.string().optional().describe('Pagination cursor'),
});

export const getMyCatalogItemsSchema = z.object({
  catalogId: z.string().min(1).describe('The catalog ID'),
  search: z.string().optional().describe('Search query'),
  type: z.enum(['APP', 'ENTITLEMENT', 'ROLE', 'GROUP', 'PACKAGE']).optional().describe('Filter by type'),
  limit: z.number().int().min(1).max(200).optional().describe('Max items'),
  after: z.string().optional().describe('Pagination cursor'),
});

export const searchMyCatalogItemsSchema = z.object({
  search: z.string().optional().describe('Search query'),
  type: z.enum(['APP', 'ENTITLEMENT', 'ROLE', 'GROUP', 'PACKAGE']).optional().describe('Filter by type'),
  category: z.string().optional().describe('Filter by category'),
  limit: z.number().int().min(1).max(200).optional().describe('Max items'),
  after: z.string().optional().describe('Pagination cursor'),
});

export const listMyTasksSchema = z.object({
  taskType: z.enum(['ACCESS_REQUEST_APPROVAL', 'CERTIFICATION_REVIEW']).optional().describe('Filter by task type'),
  status: z.enum(['PENDING', 'COMPLETED']).optional().describe('Filter by status'),
  limit: z.number().int().min(1).max(200).optional().describe('Max items'),
  after: z.string().optional().describe('Pagination cursor'),
});

export const getMyTaskSchema = z.object({
  taskId: z.string().min(1).describe('The task ID'),
});

export const approveMyTaskSchema = z.object({
  taskId: z.string().min(1).describe('The task ID'),
  comment: z.string().optional().describe('Approval comment'),
});

export const denyMyTaskSchema = z.object({
  taskId: z.string().min(1).describe('The task ID'),
  reason: z.string().min(1).describe('Denial reason (required)'),
});

// ============================================================================
// Tool Definitions
// ============================================================================

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  handler: (client: OktaClient, input: unknown) => Promise<unknown>;
}

export const tools: ToolDefinition[] = [
  // Okta Core (Management) - Groups
  {
    name: 'okta_groups_list',
    description: 'List Okta groups (Core API). Supports free-text name search (q) and advanced SCIM search/filter. Returns paginated results with nextAfter cursor.',
    inputSchema: oktaGroupsListSchema,
    handler: async (client, input) => {
      const params = oktaGroupsListSchema.parse(input);
      return oktaGroups.listGroups(client, params);
    },
  },

  // Access Certifications
  {
    name: 'iga_campaigns_list',
    description: 'List access certification campaigns. Use to find campaigns by status (SCHEDULED, ACTIVE, CLOSED, ARCHIVED), type (USER, RESOURCE), or name. Returns paginated results with nextAfter cursor for continuation.',
    inputSchema: listCampaignsSchema,
    handler: async (client, input) => {
      const params = listCampaignsSchema.parse(input);
      return certifications.listCampaigns(client, params);
    },
  },
  {
    name: 'iga_campaigns_get',
    description: 'Get details of an access certification campaign - a scheduled review of user access rights. Returns id, name, type (USER or RESOURCE), status (SCHEDULED, ACTIVE, CLOSED, ARCHIVED), scope (which users/apps are reviewed), reviewer assignments, remediation settings, and completion statistics. Use iga_campaigns_list to find valid campaign IDs.',
    inputSchema: getCampaignSchema,
    handler: async (client, input) => {
      const { campaignId } = getCampaignSchema.parse(input);
      return certifications.getCampaign(client, campaignId);
    },
  },
  {
    name: 'iga_reviews_list',
    description: 'List reviews within an access certification campaign. Filter by reviewer or status (PENDING, IN_PROGRESS, COMPLETED). Each review represents one reviewer\'s work queue.',
    inputSchema: listReviewsSchema,
    handler: async (client, input) => {
      const params = listReviewsSchema.parse(input);
      return certifications.listReviews(client, params);
    },
  },
  {
    name: 'iga_reviews_get',
    description: 'Get details of a certification review - one reviewers work queue within a campaign. Returns id, reviewer info, status (PENDING, IN_PROGRESS, COMPLETED), total/completed/pending item counts, and dates. Each review contains multiple items (iga_review_items_list) that need approve/deny decisions. Use iga_reviews_list to find valid review IDs.',
    inputSchema: getReviewSchema,
    handler: async (client, input) => {
      const { reviewId } = getReviewSchema.parse(input);
      return certifications.getReview(client, reviewId);
    },
  },
  {
    name: 'iga_review_items_list',
    description: 'List items within a review (access entries to be certified). Each item represents an access grant to approve/deny. Filter by decision status.',
    inputSchema: listReviewItemsSchema,
    handler: async (client, input) => {
      const params = listReviewItemsSchema.parse(input);
      return certifications.listReviewItems(client, params);
    },
  },

  // Access Requests
  {
    name: 'iga_requests_list',
    description: 'List access requests. Filter by status (PENDING, APPROVED, DENIED, CANCELLED, FULFILLED, FAILED), requester, target user, or request type (SELF, ON_BEHALF).',
    inputSchema: listAccessRequestsSchema,
    handler: async (client, input) => {
      const params = listAccessRequestsSchema.parse(input);
      return requests.listAccessRequests(client, params);
    },
  },
  {
    name: 'iga_requests_get',
    description: 'Get details of an access request - a users request for access to apps, entitlements, or packages. Returns id, requester, target user, status (PENDING, APPROVED, DENIED, CANCELLED, FULFILLED, FAILED), requested items with individual statuses, approval steps with approver decisions, and justification. Use iga_requests_list to find valid request IDs.',
    inputSchema: getAccessRequestSchema,
    handler: async (client, input) => {
      const { requestId } = getAccessRequestSchema.parse(input);
      return requests.getAccessRequest(client, requestId);
    },
  },
  {
    name: 'iga_request_events_list',
    description: 'List events/history for an access request. Shows approval actions, provisioning steps, and status changes.',
    inputSchema: listRequestEventsSchema,
    handler: async (client, input) => {
      const params = listRequestEventsSchema.parse(input);
      return requests.listRequestEvents(client, params);
    },
  },

  // Catalog
  {
    name: 'iga_catalog_items_list',
    description: 'List catalog items available for access requests. Filter by type (APP, ENTITLEMENT, ROLE, GROUP, PACKAGE), category, or requestable status.',
    inputSchema: listCatalogItemsSchema,
    handler: async (client, input) => {
      const params = listCatalogItemsSchema.parse(input);
      return requests.listCatalogItems(client, params);
    },
  },
  {
    name: 'iga_catalog_items_get',
    description: 'Get details of a catalog item - a requestable resource (app, entitlement, role, group, or package) that users can request access to. Returns id, name, description, type, category, requestable status, and approval requirements. Use iga_catalog_items_list to find valid item IDs.',
    inputSchema: getCatalogItemSchema,
    handler: async (client, input) => {
      const { itemId } = getCatalogItemSchema.parse(input);
      return requests.getCatalogItem(client, itemId);
    },
  },
  {
    name: 'iga_packages_list',
    description: 'List access request packages (bundles of access). Packages group multiple resources for simplified requesting.',
    inputSchema: listPackagesSchema,
    handler: async (client, input) => {
      const params = listPackagesSchema.parse(input);
      return requests.listPackages(client, params);
    },
  },
  {
    name: 'iga_packages_get',
    description: 'Get details of an access package - a bundle of resources (apps, entitlements, roles) that can be requested together. Returns id, name, description, included items, and approval workflow. Packages simplify access management by grouping related permissions. Use iga_packages_list to find valid package IDs.',
    inputSchema: getPackageSchema,
    handler: async (client, input) => {
      const { packageId } = getPackageSchema.parse(input);
      return requests.getPackage(client, packageId);
    },
  },

  // ============================================================================
  // Write Operations - Access Certifications
  // ============================================================================

  {
    name: 'iga_campaigns_create',
    description: 'Create a new access certification campaign. Specify type (USER/RESOURCE), reviewer type, scope, and schedule. Campaign starts in SCHEDULED status.',
    inputSchema: createCampaignSchema,
    handler: async (client, input) => {
      const params = createCampaignSchema.parse(input);
      return certifications.createCampaign(client, {
        name: params.name,
        description: params.description,
        type: params.type,
        scheduledStartDate: params.scheduledStartDate,
        scheduledEndDate: params.scheduledEndDate,
        reviewerType: params.reviewerType,
        reviewers: params.reviewers,
        scope: params.scope,
        remediationSettings: params.remediationEnabled !== undefined ? {
          enabled: params.remediationEnabled,
          autoRemediate: params.autoRemediate,
        } : undefined,
      });
    },
  },
  {
    name: 'iga_campaigns_launch',
    description: 'Launch a scheduled campaign immediately. Transitions campaign from SCHEDULED to ACTIVE and creates review assignments.',
    inputSchema: launchCampaignSchema,
    handler: async (client, input) => {
      const { campaignId } = launchCampaignSchema.parse(input);
      return certifications.launchCampaign(client, campaignId);
    },
  },
  {
    name: 'iga_campaigns_end',
    description: 'End an active campaign. Optionally skip remediation. Transitions campaign to CLOSED status.',
    inputSchema: endCampaignSchema,
    handler: async (client, input) => {
      const { campaignId, skipRemediation } = endCampaignSchema.parse(input);
      return certifications.endCampaign(client, campaignId, { skipRemediation });
    },
  },
  {
    name: 'iga_campaigns_delete',
    description: 'Delete a campaign. Only SCHEDULED campaigns can be deleted.',
    inputSchema: deleteCampaignSchema,
    handler: async (client, input) => {
      const { campaignId } = deleteCampaignSchema.parse(input);
      await certifications.deleteCampaign(client, campaignId);
      return { success: true, message: `Campaign ${campaignId} deleted` };
    },
  },
  {
    name: 'iga_review_items_decide',
    description: 'Make a decision (APPROVED/DENIED/ABSTAINED) on a review item. Provide reason for audit trail.',
    inputSchema: decideReviewItemSchema,
    handler: async (client, input) => {
      const params = decideReviewItemSchema.parse(input);
      return certifications.decideReviewItem(client, params);
    },
  },
  {
    name: 'iga_review_items_reassign',
    description: 'Reassign a review item to another user. Use when current reviewer cannot make the decision.',
    inputSchema: reassignReviewItemSchema,
    handler: async (client, input) => {
      const params = reassignReviewItemSchema.parse(input);
      return certifications.reassignReviewItem(client, params);
    },
  },
  {
    name: 'iga_review_items_bulk_decide',
    description: 'Make bulk decisions on multiple review items at once. Apply same decision (APPROVED/DENIED) to all specified items.',
    inputSchema: bulkDecideSchema,
    handler: async (client, input) => {
      const params = bulkDecideSchema.parse(input);
      return certifications.bulkDecideReviewItems(client, params);
    },
  },
  {
    name: 'iga_reviews_complete',
    description: 'Mark a review as completed. Call after all items have been decided.',
    inputSchema: completeReviewSchema,
    handler: async (client, input) => {
      const { reviewId } = completeReviewSchema.parse(input);
      return certifications.completeReview(client, reviewId);
    },
  },

  // ============================================================================
  // Write Operations - Access Requests
  // ============================================================================

  {
    name: 'iga_requests_create',
    description: 'Submit a new access request. Specify target user and requested items (apps, entitlements, roles, groups, or packages). Include justification.',
    inputSchema: createAccessRequestSchema,
    handler: async (client, input) => {
      const params = createAccessRequestSchema.parse(input);
      return requests.createAccessRequest(client, params);
    },
  },
  {
    name: 'iga_requests_approve',
    description: 'Approve an access request as an approver. Optionally include a comment.',
    inputSchema: approveAccessRequestSchema,
    handler: async (client, input) => {
      const params = approveAccessRequestSchema.parse(input);
      return requests.approveAccessRequest(client, params);
    },
  },
  {
    name: 'iga_requests_deny',
    description: 'Deny an access request as an approver. Reason is required.',
    inputSchema: denyAccessRequestSchema,
    handler: async (client, input) => {
      const params = denyAccessRequestSchema.parse(input);
      return requests.denyAccessRequest(client, params);
    },
  },
  {
    name: 'iga_requests_cancel',
    description: 'Cancel an access request. Can be done by requester or admin on pending requests.',
    inputSchema: cancelAccessRequestSchema,
    handler: async (client, input) => {
      const { requestId, reason } = cancelAccessRequestSchema.parse(input);
      return requests.cancelAccessRequest(client, requestId, reason);
    },
  },
  {
    name: 'iga_requests_reassign',
    description: 'Reassign an access request to a different approver.',
    inputSchema: reassignAccessRequestSchema,
    handler: async (client, input) => {
      const { requestId, newApproverId, reason } = reassignAccessRequestSchema.parse(input);
      return requests.reassignAccessRequest(client, requestId, newApproverId, reason);
    },
  },

  // ============================================================================
  // Read Operations - Entitlements & Grants
  // ============================================================================

  {
    name: 'iga_entitlements_list',
    description: 'List entitlements (access rights that can be granted). Filter by resource, type, risk level, or governance status.',
    inputSchema: listEntitlementsSchema,
    handler: async (client, input) => {
      const params = listEntitlementsSchema.parse(input);
      return entitlements.listEntitlements(client, params);
    },
  },
  {
    name: 'iga_entitlements_get',
    description: 'Get details of an entitlement - a specific permission or access right within a resource (e.g., Admin role in Salesforce, read access to a group). Returns id, name, type, value, resource info, status, governed flag, riskLevel (LOW, MEDIUM, HIGH, CRITICAL), and owner. Entitlements can be granted to users/groups. Use iga_entitlements_list to find valid entitlement IDs.',
    inputSchema: getEntitlementSchema,
    handler: async (client, input) => {
      const { entitlementId } = getEntitlementSchema.parse(input);
      return entitlements.getEntitlement(client, entitlementId);
    },
  },
  {
    name: 'iga_grants_list',
    description: 'List grants (entitlement assignments). Filter by entitlement, principal, resource, or grant type (DIRECT, INHERITED, ROLE_BASED).',
    inputSchema: listGrantsSchema,
    handler: async (client, input) => {
      const params = listGrantsSchema.parse(input);
      return entitlements.listGrants(client, params);
    },
  },
  {
    name: 'iga_grants_get',
    description: 'Get details of a grant - an assignment of an entitlement to a user or group. Returns id, entitlement info, principal (user/group), grantType (DIRECT, INHERITED, ROLE_BASED), source (how it was granted: MANUAL, ACCESS_REQUEST, PROVISIONING, SYNC), status, and effective/expiration dates. Use iga_grants_list to find valid grant IDs.',
    inputSchema: getGrantSchema,
    handler: async (client, input) => {
      const { grantId } = getGrantSchema.parse(input);
      return entitlements.getGrant(client, grantId);
    },
  },
  {
    name: 'iga_users_grants_list',
    description: 'List all grants for a specific user. Shows what entitlements/access the user has.',
    inputSchema: listUserGrantsSchema,
    handler: async (client, input) => {
      const { userId, ...params } = listUserGrantsSchema.parse(input);
      return entitlements.listUserGrants(client, userId, params);
    },
  },
  {
    name: 'iga_entitlements_grants_list',
    description: 'List all grants for a specific entitlement. Shows who has this access.',
    inputSchema: listEntitlementGrantsSchema,
    handler: async (client, input) => {
      const { entitlementId, ...params } = listEntitlementGrantsSchema.parse(input);
      return entitlements.listEntitlementGrants(client, entitlementId, params);
    },
  },
  {
    name: 'iga_bundles_list',
    description: 'List entitlement bundles (groups of entitlements). Bundles simplify access management.',
    inputSchema: listBundlesSchema,
    handler: async (client, input) => {
      const params = listBundlesSchema.parse(input);
      return entitlements.listBundles(client, params);
    },
  },
  {
    name: 'iga_bundles_get',
    description: 'Get details of an entitlement bundle - a named collection of entitlements that are typically granted together (e.g., Standard Employee bundle with email, calendar, and intranet access). Returns id, name, description, list of included entitlements with resource info, owner, and status. Use iga_bundles_list to find valid bundle IDs.',
    inputSchema: getBundleSchema,
    handler: async (client, input) => {
      const { bundleId } = getBundleSchema.parse(input);
      return entitlements.getBundle(client, bundleId);
    },
  },
  {
    name: 'iga_resources_list',
    description: 'List governed resources (apps, groups, roles under IGA governance).',
    inputSchema: listGovernedResourcesSchema,
    handler: async (client, input) => {
      const params = listGovernedResourcesSchema.parse(input);
      return entitlements.listGovernedResources(client, params);
    },
  },
  {
    name: 'iga_resources_get',
    description: 'Get details of a governed resource - an app, group, or role that is under IGA governance for access certification and request management. Returns id, type, name, governance status, entitlement count, grant count, owner, and risk settings. Use iga_resources_list to find valid resource IDs.',
    inputSchema: getGovernedResourceSchema,
    handler: async (client, input) => {
      const { resourceId } = getGovernedResourceSchema.parse(input);
      return entitlements.getGovernedResource(client, resourceId);
    },
  },
  {
    name: 'iga_principal_access_get',
    description: 'Get effective access for a user or group. Shows all grants and effective entitlements with risk summary.',
    inputSchema: getPrincipalAccessSchema,
    handler: async (client, input) => {
      const params = getPrincipalAccessSchema.parse(input);
      return entitlements.getPrincipalAccess(client, params);
    },
  },
  {
    name: 'iga_resources_entitlements_list',
    description: 'List all entitlements for a specific resource (app, group, or role).',
    inputSchema: listResourceEntitlementsSchema,
    handler: async (client, input) => {
      const { resourceId, ...params } = listResourceEntitlementsSchema.parse(input);
      return entitlements.listResourceEntitlements(client, resourceId, params);
    },
  },

  // ============================================================================
  // Admin v2 - Request Settings
  // ============================================================================

  {
    name: 'iga_admin_v2_request_settings_get_global',
    description: 'Get global (org-level) request settings. Returns default settings for all resources.',
    inputSchema: getGlobalRequestSettingsSchema,
    handler: async (client) => {
      return adminV2.getGlobalRequestSettings(client);
    },
  },
  {
    name: 'iga_admin_v2_request_settings_update_global',
    description: 'Update global request settings. Changes default behavior for all resources.',
    inputSchema: updateGlobalRequestSettingsSchema,
    handler: async (client, input) => {
      const params = updateGlobalRequestSettingsSchema.parse(input);
      return adminV2.updateGlobalRequestSettings(client, params);
    },
  },
  {
    name: 'iga_admin_v2_request_settings_get_resource',
    description: 'Get request settings for a specific resource. Returns resource-specific overrides.',
    inputSchema: getResourceRequestSettingsSchema,
    handler: async (client, input) => {
      const { resourceId } = getResourceRequestSettingsSchema.parse(input);
      return adminV2.getResourceRequestSettings(client, resourceId);
    },
  },
  {
    name: 'iga_admin_v2_request_settings_upsert_resource',
    description: 'Create or update request settings for a specific resource. Overrides global defaults.',
    inputSchema: upsertResourceRequestSettingsSchema,
    handler: async (client, input) => {
      const { resourceId, ...settings } = upsertResourceRequestSettingsSchema.parse(input);
      return adminV2.upsertResourceRequestSettings(client, resourceId, settings);
    },
  },
  {
    name: 'iga_admin_v2_request_settings_delete_resource',
    description: 'Delete request settings for a resource. Resource reverts to global defaults.',
    inputSchema: deleteResourceRequestSettingsSchema,
    handler: async (client, input) => {
      const { resourceId } = deleteResourceRequestSettingsSchema.parse(input);
      return adminV2.deleteResourceRequestSettings(client, resourceId);
    },
  },

  // ============================================================================
  // Admin v2 - Request Conditions
  // ============================================================================

  {
    name: 'iga_admin_v2_conditions_list',
    description: 'List all request conditions. Conditions define who can request access to resources.',
    inputSchema: listRequestConditionsSchema,
    handler: async (client, input) => {
      const params = listRequestConditionsSchema.parse(input);
      return adminV2.listRequestConditions(client, params);
    },
  },
  {
    name: 'iga_admin_v2_conditions_get',
    description: 'Get details of a request condition - a rule that controls who can request access to resources (e.g., only users in certain groups or with specific attributes). Returns id, name, type (USER_ATTRIBUTE, GROUP_MEMBERSHIP, or CUSTOM), expression, and criteria. Conditions are referenced by request settings. Use iga_admin_v2_conditions_list to find valid condition IDs.',
    inputSchema: getRequestConditionSchema,
    handler: async (client, input) => {
      const { conditionId } = getRequestConditionSchema.parse(input);
      return adminV2.getRequestCondition(client, conditionId);
    },
  },
  {
    name: 'iga_admin_v2_conditions_create',
    description: 'Create a new request condition. Define criteria using user attributes, group membership, or custom expressions.',
    inputSchema: createRequestConditionSchema,
    handler: async (client, input) => {
      const params = createRequestConditionSchema.parse(input);
      return adminV2.createRequestCondition(client, params);
    },
  },
  {
    name: 'iga_admin_v2_conditions_update',
    description: 'Update an existing request condition.',
    inputSchema: updateRequestConditionSchema,
    handler: async (client, input) => {
      const { conditionId, ...updates } = updateRequestConditionSchema.parse(input);
      return adminV2.updateRequestCondition(client, conditionId, updates);
    },
  },
  {
    name: 'iga_admin_v2_conditions_delete',
    description: 'Delete a request condition. Cannot delete if in use by request settings.',
    inputSchema: deleteRequestConditionSchema,
    handler: async (client, input) => {
      const { conditionId } = deleteRequestConditionSchema.parse(input);
      return adminV2.deleteRequestCondition(client, conditionId);
    },
  },

  // ============================================================================
  // Admin v2 - Approval Sequences
  // ============================================================================

  {
    name: 'iga_admin_v2_sequences_list',
    description: 'List all approval sequences. Sequences define multi-step approval workflows.',
    inputSchema: listApprovalSequencesSchema,
    handler: async (client, input) => {
      const params = listApprovalSequencesSchema.parse(input);
      return adminV2.listApprovalSequences(client, params);
    },
  },
  {
    name: 'iga_admin_v2_sequences_get',
    description: 'Get details of an approval sequence - a multi-step workflow defining who must approve access requests (e.g., manager then app owner). Returns id, name, steps array with approver types (USER, GROUP, MANAGER, APP_OWNER, RESOURCE_OWNER), and escalation settings. Sequences are referenced by request settings. Use iga_admin_v2_sequences_list to find valid sequence IDs.',
    inputSchema: getApprovalSequenceSchema,
    handler: async (client, input) => {
      const { sequenceId } = getApprovalSequenceSchema.parse(input);
      return adminV2.getApprovalSequence(client, sequenceId);
    },
  },
  {
    name: 'iga_admin_v2_sequences_create',
    description: 'Create a new approval sequence. Define steps with approvers and optional escalation.',
    inputSchema: createApprovalSequenceSchema,
    handler: async (client, input) => {
      const params = createApprovalSequenceSchema.parse(input);
      return adminV2.createApprovalSequence(client, params);
    },
  },
  {
    name: 'iga_admin_v2_sequences_update',
    description: 'Update an existing approval sequence.',
    inputSchema: updateApprovalSequenceSchema,
    handler: async (client, input) => {
      const { sequenceId, ...updates } = updateApprovalSequenceSchema.parse(input);
      return adminV2.updateApprovalSequence(client, sequenceId, updates);
    },
  },
  {
    name: 'iga_admin_v2_sequences_delete',
    description: 'Delete an approval sequence. Cannot delete if in use by request settings.',
    inputSchema: deleteApprovalSequenceSchema,
    handler: async (client, input) => {
      const { sequenceId } = deleteApprovalSequenceSchema.parse(input);
      return adminV2.deleteApprovalSequence(client, sequenceId);
    },
  },

  // ============================================================================
  // End-User v2 - My Requests
  // ============================================================================

  {
    name: 'iga_user_v2_my_requests_list',
    description: 'List my access requests (requests I submitted). Filter by status.',
    inputSchema: listMyRequestsSchema,
    handler: async (client, input) => {
      const params = listMyRequestsSchema.parse(input);
      return endUserV2.listMyRequests(client, params);
    },
  },
  {
    name: 'iga_user_v2_my_requests_get',
    description: 'Get details of a specific request I submitted.',
    inputSchema: getMyRequestSchema,
    handler: async (client, input) => {
      const { requestId } = getMyRequestSchema.parse(input);
      return endUserV2.getMyRequest(client, requestId);
    },
  },
  {
    name: 'iga_user_v2_my_requests_create',
    description: 'Create a new access request (self-service). Request access to apps, entitlements, etc.',
    inputSchema: createMyRequestSchema,
    handler: async (client, input) => {
      const params = createMyRequestSchema.parse(input);
      return endUserV2.createMyRequest(client, params);
    },
  },
  {
    name: 'iga_user_v2_my_requests_cancel',
    description: 'Cancel a pending request I submitted.',
    inputSchema: cancelMyRequestSchema,
    handler: async (client, input) => {
      const { requestId, reason } = cancelMyRequestSchema.parse(input);
      return endUserV2.cancelMyRequest(client, requestId, reason);
    },
  },

  // ============================================================================
  // End-User v2 - My Catalog
  // ============================================================================

  {
    name: 'iga_user_v2_my_catalogs_list',
    description: 'List catalogs available to me for requesting access.',
    inputSchema: listMyCatalogsSchema,
    handler: async (client, input) => {
      const params = listMyCatalogsSchema.parse(input);
      return endUserV2.listMyCatalogs(client, params);
    },
  },
  {
    name: 'iga_user_v2_my_catalog_items_list',
    description: 'List items in a specific catalog. Shows what I can request.',
    inputSchema: getMyCatalogItemsSchema,
    handler: async (client, input) => {
      const { catalogId, ...params } = getMyCatalogItemsSchema.parse(input);
      return endUserV2.getMyCatalogItems(client, catalogId, params);
    },
  },
  {
    name: 'iga_user_v2_my_catalog_items_search',
    description: 'Search across all my catalogs for requestable items.',
    inputSchema: searchMyCatalogItemsSchema,
    handler: async (client, input) => {
      const params = searchMyCatalogItemsSchema.parse(input);
      return endUserV2.searchMyCatalogItems(client, params);
    },
  },

  // ============================================================================
  // End-User v2 - My Tasks
  // ============================================================================

  {
    name: 'iga_user_v2_my_tasks_list',
    description: 'List my pending approval tasks. Shows requests awaiting my approval.',
    inputSchema: listMyTasksSchema,
    handler: async (client, input) => {
      const params = listMyTasksSchema.parse(input);
      return endUserV2.listMyTasks(client, params);
    },
  },
  {
    name: 'iga_user_v2_my_tasks_get',
    description: 'Get details of a task assigned to the current user - either an ACCESS_REQUEST_APPROVAL (pending approval decision) or CERTIFICATION_REVIEW (access review item). Returns id, taskType, status, dueDate, requester info, and requested items. Use this to review task details before approving or denying. Use iga_user_v2_my_tasks_list to find valid task IDs.',
    inputSchema: getMyTaskSchema,
    handler: async (client, input) => {
      const { taskId } = getMyTaskSchema.parse(input);
      return endUserV2.getMyTask(client, taskId);
    },
  },
  {
    name: 'iga_user_v2_my_tasks_approve',
    description: 'Approve a request task assigned to me.',
    inputSchema: approveMyTaskSchema,
    handler: async (client, input) => {
      const { taskId, comment } = approveMyTaskSchema.parse(input);
      return endUserV2.approveMyTask(client, taskId, comment);
    },
  },
  {
    name: 'iga_user_v2_my_tasks_deny',
    description: 'Deny a request task assigned to me. Reason is required.',
    inputSchema: denyMyTaskSchema,
    handler: async (client, input) => {
      const { taskId, reason } = denyMyTaskSchema.parse(input);
      return endUserV2.denyMyTask(client, taskId, reason);
    },
  },
];

/**
 * Convert Zod schema to JSON Schema for MCP
 */
export function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  // Handle primitives first
  if (schema instanceof z.ZodString) {
    const result: Record<string, unknown> = { type: 'string' };
    if (schema.description) result.description = schema.description;
    return result;
  }
  if (schema instanceof z.ZodNumber) {
    const result: Record<string, unknown> = { type: 'number' };
    if (schema.description) result.description = schema.description;
    return result;
  }
  if (schema instanceof z.ZodBoolean) {
    const result: Record<string, unknown> = { type: 'boolean' };
    if (schema.description) result.description = schema.description;
    return result;
  }
  if (schema instanceof z.ZodEnum) {
    const result: Record<string, unknown> = { type: 'string', enum: schema.options };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle arrays
  if (schema instanceof z.ZodArray) {
    const result: Record<string, unknown> = {
      type: 'array',
      items: zodToJsonSchema(schema.element),
    };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle objects
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, z.ZodType>;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      let innerType = value;
      let isOptional = false;

      // Unwrap optional
      if (innerType instanceof z.ZodOptional) {
        isOptional = true;
        innerType = innerType.unwrap();
      }

      // Get description from inner type
      const description = innerType.description;

      // Recursively convert
      const jsonType = zodToJsonSchema(innerType);
      if (description && !jsonType.description) {
        jsonType.description = description;
      }

      properties[key] = jsonType;

      if (!isOptional) {
        required.push(key);
      }
    }

    const result: Record<string, unknown> = {
      type: 'object',
      properties,
    };
    if (required.length > 0) result.required = required;
    if (schema.description) result.description = schema.description;
    return result;
  }

  return { type: 'object' };
}
