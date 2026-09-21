import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/AuthForms";
import { Brand } from "@/components/Brand";
import { createClient, currentUserId } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "登入｜房客簿" };

export default async function LoginPage() {
  if (await currentUserId(await createClient())) redirect("/app/clients");
  return (
    <>
      <header className="topbar">
        <Brand />
      </header>
      <main className="form-page">
        <h1>登入</h1>
        <LoginForm />
      </main>
    </>
  );
}
