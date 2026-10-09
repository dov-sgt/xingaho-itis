'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, UserSession } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { BrandLogo } from '@/components/BrandLogo';
import { APP_DESCRIPTION } from '@/lib/config';
import { Eye, EyeOff, User2, Lock, LogIn, Loader2, AlertCircle, ShieldCheck, Boxes, Users2, ChartNoAxesColumn } from 'lucide-react';

const HIGHLIGHTS = [
  { icon: Boxes, title: 'Inventaris & Headset', desc: 'Stok, peminjaman, dan pengembalian dalam satu alur.' },
  { icon: ShieldCheck, title: 'Purchase Request & DO', desc: 'Pengajuan, persetujuan, sampai penerimaan barang.' },
  { icon: Users2, title: 'Multi Divisi', desc: 'IT, Ops, QC, dan HR dengan hak akses terpisah.' },
  { icon: ChartNoAxesColumn, title: 'Reporting', desc: 'Rekap per divisi, siap dicetak.' },
];

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) return setError('Username wajib diisi.');
    if (!password) return setError('Password wajib diisi.');

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(result.error || 'Login gagal. Silakan coba lagi.');
        return;
      }

      // Simpan profil sesi asli dari server — BUKAN user default apa pun.
      login(result as UserSession);
      toast('success', `Selamat datang, ${result.name}`);
      router.replace('/dashboard');
    } catch {
      setError('Tidak dapat terhubung ke server. Periksa jaringan Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* ---- Panel branding ---- */}
      <section className="relative hidden overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 22% 18%, hsl(var(--sidebar-primary)) 0, transparent 45%), radial-gradient(circle at 78% 82%, hsl(var(--sidebar-primary)) 0, transparent 40%)',
          }}
          aria-hidden
        />

        <div className="relative">
          <BrandLogo size={44} tone="sidebar" subtitle={APP_DESCRIPTION} />
        </div>

        <div className="relative max-w-lg">
          <h2 className="text-3xl font-bold leading-tight tracking-tight">
            Sistem Informasi IT
            <br />
            &amp; Operasional Terpadu
          </h2>
          <p className="mt-3 text-[13px] leading-relaxed text-sidebar-muted">
            Satu platform untuk mengelola aset, pengadaan, dan operasional lintas divisi dengan kontrol akses
            berbasis peran.
          </p>

          <ul className="mt-8 grid grid-cols-2 gap-3">
            {HIGHLIGHTS.map((h) => (
              <li key={h.title} className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3.5">
                <h.icon className="h-4.5 w-4.5 text-sidebar-primary" />
                <p className="mt-2 text-[12.5px] font-bold">{h.title}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-sidebar-muted">{h.desc}</p>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[10.5px] text-sidebar-muted/70">
          &copy; {new Date().getFullYear()} Xinghao IT Division. Seluruh hak cipta dilindungi.
        </p>
      </section>

      {/* ---- Panel form ---- */}
      <section className="flex items-center justify-center bg-background p-5 sm:p-8">
        <div className="w-full max-w-[400px]">
          <div className="mb-7 flex flex-col items-center text-center lg:hidden">
            <BrandLogo size={52} withWordmark={false} />
            <h1 className="mt-3 text-xl font-bold tracking-tight text-foreground">Xinghao ITIS</h1>
            <p className="mt-1 text-[12px] text-muted-foreground">{APP_DESCRIPTION}</p>
          </div>

          <div className="mb-6 hidden lg:block">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Masuk ke Sistem</h1>
            <p className="mt-1.5 text-[12.5px] text-muted-foreground">
              Gunakan akun yang diberikan SuperAdmin untuk mengakses sistem.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2.5 rounded-lg border border-danger/25 bg-danger-subtle px-3.5 py-2.5 text-[12.5px] font-medium text-danger-subtle-foreground animate-slide-up"
            >
              <AlertCircle className="mt-px h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            <div>
              <label htmlFor="username" className="xh-label">
                Username
              </label>
              <div className="relative">
                <User2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="xh-input h-10 pl-9"
                  aria-invalid={!!error}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="xh-label">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="xh-input h-10 pl-9 pr-10"
                  aria-invalid={!!error}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="xh-btn xh-btn-primary h-10 w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memproses…
                </>
              ) : (
                <>
                  Masuk
                  <LogIn className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 rounded-lg border border-border bg-muted/60 px-3.5 py-3 text-center text-[11.5px] leading-relaxed text-muted-foreground">
            Belum memiliki akun? Hubungi <span className="font-semibold text-foreground">SuperAdmin</span> divisi IT
            untuk permintaan akses.
          </p>
        </div>
      </section>
    </div>
  );
}