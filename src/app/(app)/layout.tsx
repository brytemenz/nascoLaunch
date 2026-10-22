import { Header } from "@/components/Header";
import { getAdmin, getGuest } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [admin, guest] = await Promise.all([getAdmin(), getGuest()]);
  return (
    <>
      <Header admin={admin} guest={guest} />
      <main className="mx-auto max-w-6xl px-4 pb-40 pt-10 sm:px-6 sm:pt-14">{children}</main>
    </>
  );
}
