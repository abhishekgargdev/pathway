"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Code2,
  Home,
  Network,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { PathwayLogo } from "@/components/pathway-logo";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Home",
    icon: Home,
    match: (p) => p.startsWith("/dashboard"),
  },
  {
    href: "/skills",
    label: "Skills",
    icon: Network,
    match: (p) => p.startsWith("/skills"),
  },
  {
    href: "/dashboard",
    label: "Code",
    icon: Code2,
    match: (p) => p.startsWith("/challenges"),
  },
  {
    href: "/manage",
    label: "Manage",
    icon: Settings2,
    match: (p) => p.startsWith("/manage"),
  },
];

function NavLink({
  item,
  active,
  variant,
}: {
  item: NavItem;
  active: boolean;
  variant: "side" | "bottom";
}) {
  const Icon = item.icon;

  if (variant === "side") {
    return (
      <Link
        href={item.href}
        className={cn(
          "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40",
          active
            ? "bg-[#5EEAD4]/12 font-semibold text-[#5EEAD4]"
            : "text-[#8B93B0] hover:bg-white/[0.04] hover:text-[#EDEFF7]",
        )}
      >
        <Icon className="size-5 shrink-0" strokeWidth={1.8} />
        {item.label}
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        "flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 px-2 py-1.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40",
        active ? "text-[#5EEAD4]" : "text-[#8B93B0]",
      )}
    >
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-[10px] transition-colors",
          active && "bg-[#5EEAD4]/12",
        )}
      >
        <Icon className="size-[22px]" strokeWidth={1.8} />
      </span>
      <span
        className={cn(
          "text-[10px] leading-none tracking-[0.2px]",
          active ? "font-semibold" : "font-normal",
        )}
      >
        {item.label}
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full bg-[#0E1220] text-[#EDEFF7]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-[#2A2F4A] bg-[#171B2E] px-3 py-5 md:flex lg:w-60">
        <div className="mb-6 flex items-center gap-2 px-2">
          <PathwayLogo size={28} />
          <span className="font-heading text-base font-bold tracking-tight">
            Pathway
          </span>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={`${item.label}-${item.href}`}
              item={item}
              active={item.match(pathname)}
              variant="side"
            />
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-x-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </div>

        {/* Mobile bottom tab bar */}
        <nav
          className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[#2A2F4A] bg-[#171B2E] pt-2 md:hidden"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
        >
          {navItems.map((item) => (
            <NavLink
              key={`bottom-${item.label}`}
              item={item}
              active={item.match(pathname)}
              variant="bottom"
            />
          ))}
        </nav>
      </div>
    </div>
  );
}
