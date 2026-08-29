'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Camera, KeyRound, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    router.replace(user.role === 'ADMIN' ? '/admin' : '/dashboard');
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div className="fixed top-[-15%] left-[-5%] w-[600px] h-[600px] bg-purple-500/15 rounded-full blur-[120px]" />
      <div className="fixed bottom-[-15%] right-[-5%] w-[600px] h-[600px] bg-blue-500/15 rounded-full blur-[120px]" />

      <nav className="relative z-10 max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold">
            W
          </div>
          <span className="font-semibold text-lg">Wave Lens Studio</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-sm font-medium px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md shadow-purple-600/20 hover:shadow-lg transition-shadow"
          >
            Create account
          </Link>
        </div>
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto px-4 pt-16 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl"
        >
          <p className="text-sm font-medium text-primary mb-3">SDK license & filter management</p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
            Your camera filters,{' '}
            <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">
              one studio
            </span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl">
            Register your app, get SDK credentials, and control which real-time filters your users see —
            all from Wave Lens Studio.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 h-11 px-6 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium shadow-lg shadow-purple-600/25 hover:shadow-xl transition-shadow"
            >
              Get started free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 h-11 px-6 rounded-lg border border-border bg-card/80 font-medium hover:bg-accent transition-colors"
            >
              Sign in to dashboard
            </Link>
          </div>
        </motion.div>

        <div className="mt-20 grid sm:grid-cols-3 gap-5">
          {[
            {
              icon: KeyRound,
              title: 'SDK credentials',
              text: 'Client ID, secret, and bundle binding for your Android app.',
            },
            {
              icon: Sparkles,
              title: 'Filter control',
              text: 'Enable or disable entitled color effects for your users.',
            },
            {
              icon: Camera,
              title: 'Live-ready',
              text: 'Built for streaming and camera apps with fail-open licensing.',
            },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.4 }}
              className="rounded-xl border border-border bg-card/70 backdrop-blur p-6"
            >
              <item.icon className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.text}</p>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
