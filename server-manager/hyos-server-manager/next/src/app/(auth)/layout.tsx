export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      {children}
    </main>
  );
}
