"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, House, Radio, ScanLine, UserRound } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/dashboard/telemetry", label: "Scanner", icon: ScanLine },
  { href: "/dashboard/signals", label: "Signals", icon: Radio },
  { href: "/dashboard/account", label: "Account", icon: UserRound }
];

export function DashboardNav() {
  const pathname = usePathname();
  return <nav aria-label="Main navigation" className="dashboard-bottom-nav">
    {items.map(({ href, label, icon: Icon }) => {
      const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
      return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`dashboard-nav-item ${active ? "dashboard-nav-active" : ""}`}>
        <Icon size={22} strokeWidth={active ? 2.3 : 1.9}/><span>{label}</span>
      </Link>;
    })}
  </nav>;
}
