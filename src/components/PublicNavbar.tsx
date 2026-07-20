"use client";

import { useState } from "react";
import Link from "next/link";

type NavLink = {
  href: string;
  label: string;
};

type Props = {
  /** Extra links to show before "Se connecter" (desktop only area) */
  links?: NavLink[];
  /** Back link (e.g. "← La Récolte" on mission detail) */
  backLink?: NavLink;
};

export default function PublicNavbar({ links = [], backLink }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav className="navbar px-4 sm:px-8 py-4 max-w-6xl mx-auto relative z-50">
        <div className="flex-1">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Ship or Die Africa" className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
            <span className="text-lg sm:text-xl font-black tracking-tight">
              <span className="gold-text">Ship or Die</span>
              <span className="text-base-content/60 text-xs sm:text-sm ml-1">Africa</span>
            </span>
          </Link>
        </div>

        {/* Desktop nav */}
        <div className="hidden sm:flex flex-none gap-2">
          {backLink && (
            <Link href={backLink.href} className="btn btn-ghost btn-sm text-base-content/70">
              {backLink.label}
            </Link>
          )}
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="btn btn-ghost btn-sm text-base-content/70">
              {l.label}
            </Link>
          ))}
          <Link href="/login" className="btn btn-gold btn-sm">Se connecter</Link>
        </div>

        {/* Mobile hamburger */}
        <div className="flex sm:hidden flex-none">
          <button
            className="btn btn-ghost btn-square btn-sm"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="sm:hidden px-4 pb-4 max-w-6xl mx-auto">
          <div className="card-glow rounded-2xl p-4 flex flex-col gap-2">
            {backLink && (
              <Link href={backLink.href} className="btn btn-ghost btn-sm text-base-content/70 justify-start" onClick={() => setMenuOpen(false)}>
                {backLink.label}
              </Link>
            )}
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="btn btn-ghost btn-sm text-base-content/70 justify-start" onClick={() => setMenuOpen(false)}>
                {l.label}
              </Link>
            ))}
            <Link href="/login" className="btn btn-gold btn-sm" onClick={() => setMenuOpen(false)}>Se connecter</Link>
          </div>
        </div>
      )}
    </>
  );
}
