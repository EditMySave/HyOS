import { SubNav } from "@/components/layout/sub-nav";
import { TopNav } from "@/components/layout/top-nav";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <TopNav />
      <SubNav />
      <main>{children}</main>
    </>
  );
}
