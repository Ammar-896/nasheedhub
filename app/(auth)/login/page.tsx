'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/')
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .ln-root {
          min-height: 100vh;
          background: #06060e;
          font-family: 'DM Sans', sans-serif;
          display: flex;
          align-items: stretch;
          overflow: hidden;
        }

        .ln-left {
          flex: 1;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 56px;
          overflow: hidden;
        }
        .ln-left::before {
          content: '';
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 80% 60% at 25% 20%, rgba(99,102,241,.32) 0%, transparent 60%),
            radial-gradient(ellipse 60% 60% at 80% 80%, rgba(139,92,246,.22) 0%, transparent 55%),
            radial-gradient(ellipse 45% 40% at 60% 45%, rgba(245,158,11,.1) 0%, transparent 50%);
          pointer-events: none;
        }
        .ln-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(99,102,241,.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,.07) 1px, transparent 1px);
          background-size: 58px 58px;
          mask-image: radial-gradient(ellipse at 45% 50%, black 35%, transparent 78%);
        }
        .ln-orb-1 {
          position: absolute; width: 370px; height: 370px; border-radius: 50%;
          background: radial-gradient(circle, rgba(99,102,241,.38) 0%, transparent 70%);
          top: -90px; left: -90px; filter: blur(2px);
          animation: drift1 9s ease-in-out infinite;
        }
        .ln-orb-2 {
          position: absolute; width: 260px; height: 260px; border-radius: 50%;
          background: radial-gradient(circle, rgba(245,158,11,.22) 0%, transparent 70%);
          bottom: 100px; right: -50px; filter: blur(2px);
          animation: drift1 11s ease-in-out infinite reverse;
        }
        @keyframes drift1 {
          0%,100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(18px,-28px) scale(1.04); }
          66% { transform: translate(-14px,18px) scale(.97); }
        }

        .ln-brand {
          position: absolute; top: 48px; left: 56px;
          display: flex; align-items: center; gap: 10px;
          font-family: 'Syne', sans-serif; font-weight: 800; font-size: 17px;
          color: #fff; letter-spacing: -.02em; z-index: 10; text-decoration: none;
        }
        .ln-brand-icon {
          width: 34px; height: 34px;
          background: linear-gradient(135deg,#6366f1,#8b5cf6);
          border-radius: 9px;
          display: flex; align-items: center; justify-content: center; font-size: 16px;
          box-shadow: 0 0 18px rgba(99,102,241,.4);
        }

        .ln-content { position: relative; z-index: 5; }
        .ln-headline {
          font-family: 'Syne', sans-serif;
          font-size: clamp(32px, 3.2vw, 52px);
          font-weight: 800; line-height: 1.08;
          letter-spacing: -.04em; color: #fff; margin-bottom: 18px;
        }
        .ln-headline span {
          background: linear-gradient(135deg,#818cf8 0%,#c084fc 50%,#f59e0b 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .ln-sub {
          font-size: 16px; color: rgba(255,255,255,.42);
          line-height: 1.65; max-width: 360px; margin-bottom: 44px;
        }
        .ln-stats { display: flex; gap: 36px; }
        .ln-stat-num {
          font-family: 'Syne', sans-serif; font-size: 27px; font-weight: 800;
          color: #fff; letter-spacing: -.02em;
        }
        .ln-stat-lbl { font-size: 12px; color: rgba(255,255,255,.32); margin-top: 3px; }

        .ln-right {
          width: 470px;
          background: rgba(255,255,255,.03);
          border-left: 1px solid rgba(255,255,255,.06);
          display: flex; align-items: center; justify-content: center;
          padding: 52px 44px;
          backdrop-filter: blur(24px);
          position: relative;
        }
        .ln-right::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(99,102,241,.45), transparent);
        }

        .ln-form-box { width: 100%; max-width: 350px; }
        .ln-form-title {
          font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 800;
          color: #fff; letter-spacing: -.03em; margin-bottom: 6px;
        }
        .ln-form-sub { font-size: 14px; color: rgba(255,255,255,.35); margin-bottom: 32px; }

        .f { margin-bottom: 16px; }
        .f label {
          display: block; font-size: 11px; font-weight: 500;
          letter-spacing: .1em; text-transform: uppercase;
          color: rgba(255,255,255,.35); margin-bottom: 7px;
        }
        .fw { position: relative; }
        .f input {
          width: 100%;
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 11px; padding: 13px 16px;
          font-family: 'DM Sans', sans-serif; font-size: 15px;
          color: #fff; outline: none;
          transition: border-color .2s, background .2s;
        }
        .f input:focus {
          border-color: rgba(99,102,241,.55);
          background: rgba(99,102,241,.07);
        }
        .f input::placeholder { color: rgba(255,255,255,.18); }
        .eye-btn {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; color: rgba(255,255,255,.3);
          cursor: pointer; font-size: 16px; transition: color .2s; line-height: 1;
        }
        .eye-btn:hover { color: rgba(255,255,255,.65); }

        .forgot-row {
          display: flex; justify-content: flex-end;
          margin-top: -8px; margin-bottom: 26px;
        }
        .forgot-row a { font-size: 13px; color: #818cf8; text-decoration: none; }
        .forgot-row a:hover { color: #c084fc; }

        .ln-submit {
          width: 100%;
          background: linear-gradient(135deg,#6366f1,#8b5cf6);
          border: none; border-radius: 11px; padding: 14px;
          font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700;
          color: #fff; cursor: pointer;
          transition: transform .15s, box-shadow .15s;
          box-shadow: 0 0 26px rgba(99,102,241,.28);
          position: relative; overflow: hidden;
        }
        .ln-submit::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg,rgba(255,255,255,.15),transparent);
          opacity: 0; transition: opacity .2s;
        }
        .ln-submit:hover::after { opacity: 1; }
        .ln-submit:hover { transform: translateY(-1px); box-shadow: 0 8px 36px rgba(99,102,241,.38); }
        .ln-submit:active { transform: translateY(0); }
        .ln-submit:disabled { opacity: .5; cursor: not-allowed; transform: none; box-shadow: none; }

        .divider {
          display: flex; align-items: center; gap: 12px; margin: 22px 0;
        }
        .div-line { flex: 1; height: 1px; background: rgba(255,255,255,.07); }
        .div-txt { font-size: 12px; color: rgba(255,255,255,.22); letter-spacing: .05em; }

        .google-btn {
          width: 100%;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 11px; padding: 13px;
          font-family: 'DM Sans', sans-serif; font-size: 14px;
          color: rgba(255,255,255,.7); cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          transition: background .2s, border-color .2s;
        }
        .google-btn:hover { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.13); }

        .err-box {
          background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.2);
          border-radius: 10px; padding: 11px 14px; font-size: 13px;
          color: #fca5a5; margin-bottom: 18px;
        }

        .signup-cta {
          text-align: center; margin-top: 26px;
          font-size: 14px; color: rgba(255,255,255,.3);
        }
        .signup-cta a { color: #818cf8; text-decoration: none; font-weight: 500; }
        .signup-cta a:hover { color: #c084fc; }

        @media (max-width: 768px) {
          .ln-left { display: none; }
          .ln-right { width: 100%; border: none; }
        }
      `}</style>

      <div className="ln-root">
        {/* Left panel */}
        <div className="ln-left">
          <div className="ln-grid" />
          <div className="ln-orb-1" />
          <div className="ln-orb-2" />

          <Link href="/" className="ln-brand">
            <div className="ln-brand-icon">♪</div>
            NasheedHub
          </Link>

          <div className="ln-content">
            <h1 className="ln-headline">
              Music for<br /><span>the soul.</span>
            </h1>
            <p className="ln-sub">
              The world's finest collection of nasheeds, curated and streamed beautifully.
            </p>
            <div className="ln-stats">
              {[['10K+','Nasheeds'],['500+','Artists'],['Free','Forever']].map(([n,l]) => (
                <div key={l}>
                  <div className="ln-stat-num">{n}</div>
                  <div className="ln-stat-lbl">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="ln-right">
          <div className="ln-form-box">
            <h2 className="ln-form-title">Welcome back</h2>
            <p className="ln-form-sub">Sign in to your account to continue</p>

            {error && <div className="err-box">{error}</div>}

            <form onSubmit={handleLogin}>
              <div className="f">
                <label>Email address</label>
                <input
                  type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} required
                />
              </div>
              <div className="f">
                <label>Password</label>
                <div className="fw">
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)} required
                  />
                  <button type="button" className="eye-btn" onClick={() => setShowPass(p => !p)}>
                    {showPass ? '○' : '●'}
                  </button>
                </div>
              </div>
              <div className="forgot-row">
                <Link href="/forgot-password">Forgot password?</Link>
              </div>
              <button type="submit" className="ln-submit" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <div className="divider">
              <div className="div-line" /><span className="div-txt">OR</span><div className="div-line" />
            </div>

            <button className="google-btn" onClick={handleGoogle}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <p className="signup-cta">
              Don't have an account? <Link href="/signup">Create one</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}