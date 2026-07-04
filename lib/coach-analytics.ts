function fireGtag(event: string, params: Record<string, string | number>) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag === "function") {
    w.gtag("event", event, params);
  }
}

export function trackCoachRosterViewed() {
  fireGtag("coach_roster_viewed", {});
}

export function trackCoachProfileViewed(coachSlug: string) {
  fireGtag("coach_profile_viewed", { coach_slug: coachSlug });
}

export function trackCoachBookingStarted(coachSlug: string) {
  fireGtag("coach_booking_started", { coach_slug: coachSlug });
}

export function trackCoachBookingRequested(coachSlug: string) {
  fireGtag("coach_booking_requested", { coach_slug: coachSlug });
}

export function trackCoachBookingConfirmed(coachSlug: string) {
  fireGtag("coach_booking_confirmed", { coach_slug: coachSlug });
}

export function trackCoachBookingDeclined(coachSlug: string) {
  fireGtag("coach_booking_declined", { coach_slug: coachSlug });
}

export function trackCoachBookingCancelled(coachSlug: string) {
  fireGtag("coach_booking_cancelled", { coach_slug: coachSlug });
}

export function trackCoachApplicationSubmitted() {
  fireGtag("coach_application_submitted", {});
}

export function trackDashboardCoachWidgetClicked() {
  fireGtag("dashboard_coach_widget_clicked", {});
}
