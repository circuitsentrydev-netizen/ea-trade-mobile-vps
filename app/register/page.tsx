import Link from "next/link";
import { signUpAction } from "@/app/auth-actions";
import { Command, ShieldCheck } from "lucide-react";

export default function RegisterPage({ searchParams }: { searchParams: { error?: string } }) {
  return <main className="auth-wrap">
    <section className="auth-card">
      <Link href="/" className="auth-brand"><span className="brand-mark"><Command size={21}/></span><span><strong>EA Trade</strong><small>MOBILE VPS CONSOLE</small></span></Link>
      <p className="eyebrow mt-9">GET STARTED</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Create your workspace</h1><p className="mt-2 text-sm leading-6 text-slate-400">Set up your account. Mentor access is reviewed before mentor tools are enabled.</p>
      {searchParams.error && <p role="alert" className="auth-alert">{searchParams.error}</p>}
      <form action={signUpAction} className="mt-7 space-y-4">
        <label className="auth-label">Full name<input name="displayName" autoComplete="name" placeholder="Your name" required/></label>
        <label className="auth-label">Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required/></label>
        <label className="auth-label">Account type<select name="accountType" defaultValue="CLIENT"><option value="CLIENT">Trader / Client</option><option value="MENTOR_ADMIN">Mentor (approval required)</option></select></label>
        <label className="auth-label">Password<input name="password" type="password" autoComplete="new-password" minLength={8} placeholder="At least 8 characters" required/></label>
        <button className="auth-submit" type="submit">Create account</button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-400">Already registered? <Link href="/login" className="font-semibold text-blue-300 hover:text-blue-200">Sign in</Link></p>
      <div className="auth-security"><ShieldCheck size={15}/> Mentor privileges require administrator approval</div>
    </section>
  </main>;
}
