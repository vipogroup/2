"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCartContext } from "@/app/context/CartContext";

function HomeIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2 0v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function UserIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function CartIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function BagIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  );
}

function StorefrontDock({ user, loading }) {
  const { totals } = useCartContext();
  const count = totals?.totalQuantity ?? 0;
  const accountHref = user ? "/profile" : "/login";

  return (
    <nav
      className="fixed z-[55] left-2 sm:left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2.5 rounded-2xl py-3.5 px-2 shadow-2xl border border-white/15"
      style={{ background: "linear-gradient(180deg, #1e3a8a 0%, #0e7490 55%, #0891b2 100%)" }}
      aria-label="ניווט מהיר"
    >
      <Link
        href={accountHref}
        className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
        aria-label={user ? "הפרופיל שלי" : "התחברות"}
      >
        <UserIcon />
      </Link>
      <Link
        href="/cart"
        className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
        aria-label="עגלת קניות"
      >
        <CartIcon />
        <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold leading-none text-blue-900 shadow">
          {loading ? "…" : count > 99 ? "99+" : count}
        </span>
      </Link>
      <Link
        href="/my-orders"
        className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
        aria-label="ההזמנות שלי"
      >
        <BagIcon />
      </Link>
    </nav>
  );
}

export default function UserHeader() {
  const pathname = usePathname() || "";
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!ignore && res.ok) {
          const data = await res.json();
          setUser(data?.user || null);
        }
      } catch (_) {
        // ignore
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const isAdmin = user?.role === "admin";
  const isAgent = user?.role === "agent";

  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <>
      <header
        className="sticky top-0 z-[60] flex h-[42px] w-full items-center justify-between border-b border-gray-200/80 bg-white px-3 text-sm shadow-sm sm:px-5"
        dir="rtl"
      >
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-md px-1 py-0.5 text-gray-900 hover:bg-gray-50"
        >
          <HomeIcon className="h-5 w-5 text-blue-800" />
          <Image src="/icons/vipo-icon.svg" alt="" width={28} height={28} className="h-7 w-7" priority />
          <span className="text-lg font-semibold tracking-tight text-blue-900 lowercase">vipo</span>
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-start gap-2 sm:gap-3">
          {loading ? (
            <div className="h-7 w-28 animate-pulse rounded-lg bg-gray-100" aria-hidden />
          ) : !user ? (
            <>
              <Link href="/register" className="hidden text-xs text-gray-600 hover:text-gray-900 sm:inline">
                הרשמה
              </Link>
              <Link
                href="/login"
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 sm:px-4 sm:text-sm"
              >
                התחבר
              </Link>
            </>
          ) : (
            <div className="flex max-w-[55vw] items-center gap-2 overflow-x-auto sm:max-w-none sm:gap-3">
              {isAgent && (
                <Link href="/agent" className="whitespace-nowrap text-xs text-gray-700 hover:text-blue-700 sm:text-sm">
                  דשבורד סוכן
                </Link>
              )}
              {isAdmin && (
                <Link href="/admin" className="whitespace-nowrap text-xs text-gray-700 hover:text-blue-700 sm:text-sm">
                  דשבורד מנהל
                </Link>
              )}
              <Link href="/profile" className="hidden whitespace-nowrap text-xs text-gray-700 hover:text-blue-700 sm:inline sm:text-sm">
                החשבון שלי
              </Link>
              <Link href="/products" className="whitespace-nowrap text-xs text-gray-600 hover:text-gray-900 sm:text-sm">
                מוצרים
              </Link>
              <Link href="/api/auth/logout" className="whitespace-nowrap text-xs text-gray-500 hover:text-red-600">
                התנתקות
              </Link>
            </div>
          )}
        </div>
      </header>

      <StorefrontDock user={user} loading={loading} />
    </>
  );
}
