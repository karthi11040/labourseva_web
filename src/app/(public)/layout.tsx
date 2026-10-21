import Header from "@/components/Header";
import ReceiptHeader from "@/components/ReceiptHeader";
import Footer from "@/components/Footer";
import PublicBreadcrumbs from "@/components/PublicBreadcrumbs";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <ReceiptHeader />
      <PublicBreadcrumbs />
      <main id="main-content" tabIndex={-1} className="outline-none" suppressHydrationWarning>
        {children}
      </main>
      <Footer />
    </>
  );
}
