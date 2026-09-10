'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (signInError || !data.user) {
        throw new Error('Invalid email or password.');
      }

      const { data: isAdmin, error: adminError } =
        await supabase.rpc('is_admin');

      if (adminError || !isAdmin) {
        await supabase.auth.signOut();
        throw new Error(
          'This account is not authorised for admin access.'
        );
      }

      router.replace('/dashboard');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to sign in.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-midnight px-6">
      <div className="pointer-events-none fixed inset-0 grid-pattern opacity-40" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <img
            src="/eixpropscorelogo.png"
            alt="EiX Property Score"
            className="h-16 w-auto object-contain"
          />
        </div>

        <div className="glass rounded-3xl p-8">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 ring-1 ring-teal-500/20">
              <ShieldCheck className="h-6 w-6 text-teal-400" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white">
              Admin Sign In
            </h1>

            <p className="mt-2 text-sm text-white/50">
              Secure EiX Property Score dashboard access.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-white/70"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-teal-500/40 focus:ring-2 focus:ring-teal-500/20"
                placeholder="Admin email"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-white/70"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-teal-500/40 focus:ring-2 focus:ring-teal-500/20"
                placeholder="Password"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500 px-4 py-3 text-sm font-semibold text-midnight transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <a
            href="/"
            className="mt-6 block text-center text-xs text-white/40 transition hover:text-white/70"
          >
            ← Back to Property Score
          </a>
        </div>
      </div>
    </main>
  );
}
