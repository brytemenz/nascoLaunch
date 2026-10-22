import { LoginForms } from "./LoginForms";

export const metadata = { title: "Sign in" };

// /login → staff (phone + PIN). /login?admin → admin email sign-in.
export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return <LoginForms admin={"admin" in params} />;
}
