import type { Timestamp } from "firebase/firestore";

// ── Roles & plans ────────────────────────────────────────────────────────────

export type OrgRole = "owner" | "admin" | "coach" | "member";

export type OrgPlan = "enterprise";

export type OrgSubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "cancelled"
  | "incomplete";

export type OrgMemberStatus = "active" | "suspended";

export type OrgInviteStatus = "pending" | "accepted" | "revoked" | "expired";

export type OrgSessionType = "presentation" | "rehearsal" | "meeting";

export type OrgSessionStatus = "scheduled" | "live" | "completed" | "cancelled";

// ── organizations/{orgId} ────────────────────────────────────────────────────

export interface OrgBrandColors {
  primary: string;
  secondary: string;
  accent: string;
}

export interface OrgSettings {
  managerCanViewIndividualSessions: boolean;
  defaultSessionVisibility: "private" | "org";
  allowedEmailDomains: string[];
  feedbackAnonymousDefault: boolean;
  leaderboardEnabled: boolean;
  defaultFeedScope: "org" | "global";
}

export interface OrgSeats {
  purchased: number;
  used: number;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  brandColors?: Partial<OrgBrandColors>;
  createdAt: Timestamp;
  createdBy: string;
  plan: OrgPlan;
  subscriptionStatus: OrgSubscriptionStatus;
  trialEndsAt?: Timestamp | null;
  seats: OrgSeats;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  settings: OrgSettings;
}

// ── organizations/{orgId}/members/{userId} ───────────────────────────────────

export interface OrgMember {
  id: string;
  role: OrgRole;
  email: string;
  displayName: string;
  joinedAt: Timestamp;
  invitedBy?: string | null;
  status: OrgMemberStatus;
}

// ── organizations/{orgId}/invites/{inviteId} ─────────────────────────────────

export interface OrgInvite {
  id: string;
  email: string;
  role: OrgRole;
  token: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  status: OrgInviteStatus;
  createdBy: string;
}

// ── organizations/{orgId}/teams/{teamId} ─────────────────────────────────────

export interface OrgTeam {
  id: string;
  name: string;
  memberIds: string[];
  coachIds: string[];
}

// ── organizations/{orgId}/sessions/{sessionId} ───────────────────────────────

export interface OrgSession {
  id: string;
  title: string;
  type: OrgSessionType;
  presenterId: string;
  scheduledStart: Timestamp;
  scheduledEnd: Timestamp;
  timezone: string;
  feedbackCode: string;
  feedbackUrl: string;
  qrGenerated: boolean;
  status: OrgSessionStatus;
  linkedRecordingId?: string | null;
  calendarEventCreated: boolean;
  orgId: string;
}

// ── organizations/{orgId}/analytics/{period} ─────────────────────────────────

export interface OrgDimensionAverages {
  clarity: number;
  energy: number;
  engagement: number;
  understanding: number;
  connection: number;
}

export interface OrgAnalyticsPeriod {
  period: string; // "YYYY-MM"
  memberCount: number;
  activeMemberCount: number;
  sessionsCount: number;
  feedbackResponsesCount: number;
  dimensionAverages: OrgDimensionAverages;
  updatedAt: Timestamp;
}

// ── feedbackResponses (top-level, enterprise format) ─────────────────────────

export interface EnterpriseFeedbackScores {
  clarity: number;   // 1–10
  energy: number;
  engagement: number;
  understanding: number;
  connection: number;
}

export interface EnterpriseFeedbackResponse {
  id: string;
  orgId: string;
  sessionId: string;
  scores: EnterpriseFeedbackScores;
  comment?: string | null;
  respondentName?: string | null;
  submittedAt: Timestamp;
  fingerprint?: string | null;
}

// ── Presenter doc extension ───────────────────────────────────────────────────
// Extend the existing presenter/{uid} doc with these optional fields.

export interface PresenterOrgFields {
  orgId?: string | null;
  orgRole?: OrgRole | null;
}

// ── Auth context shape ────────────────────────────────────────────────────────

export interface OrgContext {
  orgId: string;
  role: OrgRole;
  org: Organization;
  member: OrgMember;
}
