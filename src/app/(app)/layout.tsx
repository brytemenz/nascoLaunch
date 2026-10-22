import { Header } from "@/components/Header";
import { TabBar } from "@/components/TabBar";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const admin = user.role === "ADMIN";
  return (
    <>
      <Header user={user} />
      <main className="mx-auto max-w-6xl px-4 pb-[calc(13rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pb-40 sm:pt-14">{children}</main>
      <TabBar admin={admin} />
    </>
  );
}
