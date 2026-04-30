/**
 * Layout for public pages (register-business, etc.)
 * No header/footer - clean pages for registration flows
 */

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
