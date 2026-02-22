import { UmamiProvider } from "@/components/analytics/umami-provider";
import { SubNav } from "@/components/layout/sub-nav";
import { TopNav } from "@/components/layout/top-nav";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <UmamiProvider />
      <TopNav />
      <SubNav />
      <main>{children}</main>
    </>
  );
}
