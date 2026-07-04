"use client";

import { useState } from "react";
import { useParams, usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  BarChart2,
  Brain,
  MessageSquare,
  BookOpen,
  CalendarDays,
  Users,
  CreditCard,
  Settings,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface OrgSidebarProps {
  orgName?: string;
  myRole?: string | null;
}

const MEMBER_NAV = [
  { segment: "dashboard",   label: "Dashboard",           icon: LayoutDashboard },
  { segment: "my-sessions", label: "Analytics",           icon: BarChart2 },
  { segment: "rehearse",    label: "AI Analysis",         icon: Brain },
  { segment: "community",   label: "Team Coaching Feed",  icon: MessageSquare },
  { segment: "resources",   label: "Resource Hub",        icon: BookOpen },
];

const ADMIN_NAV = [
  { segment: "sessions", label: "Sessions",  icon: CalendarDays },
  { segment: "members",  label: "Members",   icon: Users },
  { segment: "billing",  label: "Billing",   icon: CreditCard },
  { segment: "settings", label: "Settings",  icon: Settings },
];

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        active
          ? "bg-violet-500/15 text-violet-300"
          : "text-slate-400 hover:text-white hover:bg-white/5"
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
    </a>
  );
}

function SidebarContent({
  orgId,
  orgName,
  myRole,
  onNavClick,
}: {
  orgId: string;
  orgName?: string;
  myRole?: string | null;
  onNavClick?: () => void;
}) {
  const pathname = usePathname();
  const isAdmin = myRole === "owner" || myRole === "admin" || myRole === "coach";

  function isActive(segment: string) {
    return pathname === `/${orgId}/${segment}`;
  }

  async function handleSignOut() {
    await signOut(auth);
    window.location.href = "/";
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo + org name */}
      <div className="px-5 py-5 border-b border-[#1e293b]">
        <div className="flex items-center gap-2 mb-3">
          <Image src="/icon-mark.png" alt="LearnFast" width={26} height={19} />
          <span className="text-sm font-bold tracking-tight" style={{ color: "#5bb8f5" }}>
            LEARN<span className="font-light">FAST</span>
            <sup className="text-[0.5em] font-normal ml-0.5 align-super">™</sup>
          </span>
        </div>
        {orgName && (
          <p className="text-xs font-semibold text-slate-300 truncate leading-tight">{orgName}</p>
        )}
      </div>

      {/* Member nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {MEMBER_NAV.map(({ segment, label, icon }) => (
          <NavItem
            key={segment}
            href={`/${orgId}/${segment}`}
            label={label}
            icon={icon}
            active={isActive(segment)}
            onClick={onNavClick}
          />
        ))}

        {isAdmin && (
          <>
            <div className="pt-5 pb-2 px-3">
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
                Admin
              </p>
            </div>
            {ADMIN_NAV.map(({ segment, label, icon }) => (
              <NavItem
                key={segment}
                href={`/${orgId}/${segment}`}
                label={label}
                icon={icon}
                active={isActive(segment)}
                onClick={onNavClick}
              />
            ))}
          </>
        )}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-[#1e293b]">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function OrgSidebar({ orgName, myRole }: OrgSidebarProps) {
  const params = useParams();
  const orgId = params?.orgId as string;
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col bg-[#080c14] border-r border-[#1e293b] z-40">
        <SidebarContent orgId={orgId} orgName={orgName} myRole={myRole} />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-[#080c14] border-b border-[#1e293b]">
        <div className="flex items-center gap-2">
          <Image src="/icon-mark.png" alt="LearnFast" width={22} height={16} />
          <span className="text-sm font-bold tracking-tight" style={{ color: "#5bb8f5" }}>
            LEARN<span className="font-light">FAST</span>™
          </span>
        </div>
        {orgName && <p className="text-xs text-slate-400 truncate mx-3 flex-1">{orgName}</p>}
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1.5 text-slate-400 hover:text-white transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/60 z-50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="md:hidden fixed inset-y-0 left-0 w-72 bg-[#080c14] border-r border-[#1e293b] z-50 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e293b]">
              <span className="text-sm font-bold" style={{ color: "#5bb8f5" }}>Menu</span>
              <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarContent
                orgId={orgId}
                orgName={orgName}
                myRole={myRole}
                onNavClick={() => setMobileOpen(false)}
              />
            </div>
          </aside>
        </>
      )}
    </>
  );
}
