import type { OktaClient, PaginatedResponse } from '../client.js';

export interface OktaGroupProfile {
  name?: string;
  description?: string;
  [key: string]: unknown;
}

export interface OktaGroup {
  id: string;
  created?: string;
  lastUpdated?: string;
  lastMembershipUpdated?: string;
  objectClass?: string[];
  type?: string;
  profile?: OktaGroupProfile;
  _links?: Record<string, unknown>;
}

export interface ListOktaGroupsParams {
  /** Free-text search against group name (Okta query param `q`) */
  q?: string;
  /** SCIM-style search expression (Okta query param `search`) */
  search?: string;
  /** Legacy filter expression (Okta query param `filter`) */
  filter?: string;
  /** Pagination cursor (Okta `after` param, usually a group id) */
  after?: string;
  /** Max results per page (Okta limit, max varies; keep <= 200) */
  limit?: number;
}

/**
 * List Okta groups via Okta Core API.
 * Endpoint: GET /api/v1/groups
 */
export async function listGroups(
  client: OktaClient,
  params: ListOktaGroupsParams
): Promise<PaginatedResponse<OktaGroup>> {
  const { q, search, filter, after, limit = 200 } = params;

  return client.paginatedRequest<OktaGroup>({
    method: 'GET',
    path: '/api/v1/groups',
    query: {
      q,
      search,
      filter,
      after,
      limit,
    },
  });
}
