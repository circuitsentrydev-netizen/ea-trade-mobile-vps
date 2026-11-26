import { DashboardNav } from "@/components/dashboard-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <><div className="dashboard-content">{children}</div><DashboardNav /></>;
}
