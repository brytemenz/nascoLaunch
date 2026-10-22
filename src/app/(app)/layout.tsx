import { Header } from "@/components/Header";
import { TabBar } from "@/components/TabBar";
import { getAdmin, getGuest } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [admin, guest] = await Promise.all([getAdmin(), getGuest()]);
  return (
    <>
      <Header admin={admin} guest={guest} />
      <main className="mx-auto max-w-6xl px-4 pb-[calc(13rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pb-40 sm:pt-14">{children}</main>
      <TabBar admin={!!admin} />
    </>
  );
}
