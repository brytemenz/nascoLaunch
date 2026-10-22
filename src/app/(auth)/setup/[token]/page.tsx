import Link from "next/link";
import { findBySetupToken } from "@/lib/pin";
import { SetPinForm } from "./SetPinForm";

export const metadata = { title: "Set your PIN" };
export const dynamic = "force-dynamic";

export default async function SetupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await findBySetupToken(token);

  if (!user) {
    return (
      <>
        <h2 className="text-3xl font-semibold tracking-tight">Link expired</h2>
        <p className="mt-2 text-muted">
          This link has expired or was already used. You can get a new one from the sign-in page.
        </p>
        <Link href="/login" className="btn-primary mt-8 w-full h-12">Go to sign in</Link>
      </>
    );
  }

  return (
    <>
      <p className="eyebrow">Welcome</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">
        {user.pinHash ? "Set a new PIN" : `Hi ${user.name.split(" ")[0]}, set your PIN`}
      </h2>
      <p className="mt-2 text-muted">
        You&apos;ll sign in with <span className="text-fg">{user.phone}</span> and this PIN.
      </p>
      <SetPinForm token={token} />
    </>
  );
}
