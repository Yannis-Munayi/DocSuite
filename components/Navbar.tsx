"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <header className="h-14 border-b border-gray-200 bg-white px-6 flex items-center justify-between shrink-0">
      {/* Logo */}
      <Link href="/" className="text-lg font-bold text-brand-700 tracking-tight">
        DocSuite
      </Link>

      {/* Nav links */}
      <nav className="flex items-center gap-6 text-sm font-medium">
        <Link
          href="/"
          className={`transition-colors ${pathname === "/" ? "text-brand-600" : "text-gray-500 hover:text-gray-800"}`}
        >
          Agents
        </Link>
        <Link
          href="/files"
          className={`transition-colors ${pathname === "/files" ? "text-brand-600" : "text-gray-500 hover:text-gray-800"}`}
        >
          My Files
        </Link>
      </nav>

      {/* User */}
      {session?.user && (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500">
            {(session.user as { username?: string }).username ?? session.user.name ?? "User"}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}
