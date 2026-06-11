"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BriefcaseBusiness, Download, FileText, Link2, UserRound } from "lucide-react";

const navItems = [
  { href: "/admin/analytics", icon: BarChart3, label: "数据驾驶舱" },
  { href: "/admin/campaigns", icon: Link2, label: "投递追踪链接" },
  { href: "/admin/projects", icon: BriefcaseBusiness, label: "项目管理" },
  { href: "/admin/profile", icon: FileText, label: "经历摘要" },
  { href: "/admin/backups", icon: Download, label: "备份导出" }
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" aria-label="后台导航">
        <div className="admin-brand">
          <span>PM</span>
          <div>
            <strong>Portfolio Admin</strong>
            <small>运营工作台</small>
          </div>
        </div>

        <nav className="admin-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link aria-current={isActive ? "page" : undefined} className="admin-nav__link" href={item.href} key={item.href}>
                <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <Link className="admin-public-link" href="/">
          <UserRound aria-hidden="true" size={17} strokeWidth={1.8} />
          <span>查看面试官页面</span>
        </Link>
      </aside>

      <main className="admin-main">{children}</main>
    </div>
  );
}
