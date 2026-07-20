import Sidebar from "@/components/dashboard/Sidebar";
import MobileNav from "@/components/dashboard/MobileNav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-base-100">
      <Sidebar />
      <MobileNav />
      <main className="sm:ml-64 p-4 sm:p-8">
        {children}
      </main>
    </div>
  );
}
