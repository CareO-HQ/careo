/**
 * Session interface representing the authentication session state
 * Contains all session-related data including user information, tokens, and metadata
 */
export interface Session {
  /** Unique identifier for the session */
  id: string;

  /** Authentication token for the session */
  token: string;

  /** Date when the session expires */
  expiresAt: Date;

  /** Date when the session was created */
  createdAt: Date;

  /** Date when the session was last updated */
  updatedAt: Date;

  /** IP address from which the session was created (may be null) */
  ipAddress?: string | null;

  /** User agent string of the client that created the session (may be null) */
  userAgent?: string | null;

  /** ID of the user associated with this session */
  userId: string;

  /** ID of the currently active organization for this session (optional) */
  activeOrganizationId?: string;

  /** Optional ID of the currently active team for this session */
  activeTeamId?: string | null;
}

/**
 * Extended Session interface with the full data structure as received from your JSON
 * This represents the complete session state with all metadata
 */
export interface SessionWithMetadata {
  /** Unique identifier for the session */
  id: string;

  /** Authentication token for the session */
  token: string;

  /** Timestamp when the session expires (in milliseconds) */
  expiresAt: number;

  /** Timestamp when the session was created (in milliseconds) */
  createdAt: number;

  /** Timestamp when the session was last updated (in milliseconds) */
  updatedAt: number;

  /** IP address from which the session was created */
  ipAddress: string;

  /** User agent string of the client that created the session */
  userAgent: string;

  /** ID of the user associated with this session */
  userId: string;

  /** ID of the currently active organization for this session */
  activeOrganizationId: string;

  /** Optional ID of the currently active team for this session */
  activeTeamId?: string | null;
}

/**
 * Location information from IP geolocation service
 */
export interface LocationInfo {
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  loc?: string; // latitude,longitude
  org?: string; // ISP/Organization
  timezone?: string;
}

/**
 * Session with location information
 */
export interface SessionWithLocation extends Session {
  location?: LocationInfo | null;
}

/**
 * Type for session list responses from the API
 */
export interface SessionListResponse {
  sessions: Session[];
  total?: number;
  hasMore?: boolean;
}

/**
 * Minimal session information for displaying in lists
 */
export interface SessionSummary {
  id: string;
  ipAddress: string;
  userAgent: string;
  createdAt: number;
  expiresAt: number;
  isActive?: boolean;
}
