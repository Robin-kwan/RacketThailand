import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Reset password | RacketThailand",
};

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <main className="mx-auto flex max-w-lg flex-col gap-4 px-6 pb-20 pt-16 text-center md:px-8">
        <section className="rounded-[32px] border border-slate-800 bg-slate-900/70 p-8 shadow-2xl shadow-black/40 backdrop-blur">
          <p className="text-xs font-semibold uppercase text-slate-400">
            RacketThailand
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white">
            Set a new password
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Enter and confirm a new password for your account. This also lets
            Google sign-in users create a manual login.
          </p>
          <div className="mt-6">
            <ResetPasswordForm />
          </div>
        </section>
      </main>
    </div>
  );
}
