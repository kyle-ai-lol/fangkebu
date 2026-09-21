import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/AuthForms";
import { Brand } from "@/components/Brand";
import { createClient, currentUserId } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "建立後台｜房客簿" };

export default async function SignupPage() {
  if (await currentUserId(await createClient())) redirect("/app/clients");
  return (
    <>
      <header className="topbar">
        <Brand />
      </header>
      <main className="form-page">
        <h1>建立你的後台</h1>
        <p className="fine">填完就能開始用。</p>
        <SignupForm />
      </main>
    </>
  );
}
