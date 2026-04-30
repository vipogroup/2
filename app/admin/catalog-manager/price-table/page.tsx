"use client";

import React from "react";
import Link from "next/link";

export default function CatalogPriceTablePage() {
  return (
    <main
      style={{
        position: "relative",
        left: "50%",
        right: "50%",
        width: "100vw",
        maxWidth: "none",
        marginLeft: "-50vw",
        marginRight: "-50vw",
        padding: 0,
        overflowX: "auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 16px", background: "#f8f9fa" }}>
        <Link
          href="/admin"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          חזרה לדשבורד
        </Link>
      </div>
      <iframe
        title="Catalog Manager Price Table"
        src="/_standalone/catalog-manager/index.html"
        style={{
          width: "100%",
          height: "calc(100vh - 140px)",
          border: "0",
          display: "block",
          background: "white",
        }}
        sandbox="allow-scripts allow-same-origin allow-downloads allow-forms allow-popups allow-popups-to-escape-sandbox"
      />
    </main>
  );
}
