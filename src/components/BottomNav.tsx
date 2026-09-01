"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Pulse", icon: "◎" },
  { href: "/explore", label: "Explorar", icon: "✦" },
  { href: "/following", label: "Sigues", icon: "◈" },
  { href: "/saved", label: "Guardado", icon: "▤" },
  { href: "/profile", label: "Perfil", icon: "●" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur">
      <ul className="flex justify-between px-2 py-2">
        {ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] transition-colors ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
