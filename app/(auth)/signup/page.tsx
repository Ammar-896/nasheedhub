'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } },
    })
    if (error) { setError(error.message); setLoading(false) }
    else setDone(true)
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3
  const strengthColors = ['transparent', '#ef4444', '#f59e0b', '#6366f1', '#10b981']
  const strengthLabels = ['', 'Too short', 'Weak', 'Good', 'Strong']

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .su-root {
          min-height: 100vh;
          background: #06060e;
          font-family: 'DM Sans', sans-serif;
          display: flex;
          align-items: stretch;
          overflow: hidden;
        }

        /* LEFT */
        .su-left {
          flex: 1;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 56px;
          overflow: hidden;
        }
        .su-left::before {
          content: '';
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 70% 70% at 20% 30%, rgba(16,185,129,0.2) 0%, transparent 60%),
            radial-gradient(ellipse 60% 60% at 80% 70%, rgba(99,102,241,0.2) 0%, transparent 55%),
            radial-gradient(ellipse 50% 40% at 50% 10%, rgba(139,92,246,0.15) 0%, transparent 50%);
          pointer-events: none;
        }
        .su-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(16,185,129,.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16,185,129,.06) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: radial-gradient(ellipse at 50% 50%, black 30%, transparent 80%);
        }
        .su-brand {
          position: absolute; top: 48px; left: 56px;
          display: flex; align-items: center; gap: 10px;
          font-family: 'Syne', sans-serif; font-weight: 800; font-size: 17px;
          color: #fff; letter-spacing: -.02em; z-index: 5; text-decoration: none;
        }
        .su-brand-icon {
          width: 34px; height: 34px;
          background: linear-gradient(135deg,#6366f1,#8b5cf6);
          border-radius: 9px;
          display: flex; align-items: center; justify-content: center; font-size: 16px;
        }
        .su-headline {
          position: relative; z-index: 5;
        }
        .su-headline h2 {
          font-family: 'Syne', sans-serif;
          font-size: clamp(28px, 3vw, 48px);
          font-weight: 800;
          letter-spacing: -.04em;
          line-height: 1.1;
          color: #fff;
          margin-bottom: 18px;
        }
        .su-headline h2 span {
          background: linear-gradient(135deg, #34d399 0%, #818cf8 60%, #c084fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .su-headline p {
          font-size: 15px;
          color: rgba(255,255,255,.4);
          line-height: 1.7;
          max-width: 340px;
          margin-bottom: 40px;
        }
        .artists-row {
          display: flex; gap: 10px; flex-wrap: wrap;
        }
        .artist-chip {
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 100px;
          padding: 7px 14px;
          font-size: 13px;
          color: rgba(255,255,255,.55);
        }

        /* RIGHT */
        .su-right {
          width: 460px;
          background: rgba(255,255,255,.03);
          border-left: 1px solid rgba(255,255,255,.06);
          display: flex; align-items: center; justify-content: center;
          padding: 48px 44px;
          backdrop-filter: blur(20px);
        }
        .su-form-box { width: 100%; max-width: 340px; }

        .su-title {
          font-family: 'Syne', sans-serif;
          font-size: 28px; font-weight: 800;
          color: #fff; letter-spacing: -.03em;
          margin-bottom: 6px;
        }
        .su-sub {
          font-size: 14px; color: rgba(255,255,255,.38);
          margin-bottom: 32px;
        }

        .f { margin-bottom: 16px; }
        .f label {
          display: block; font-size: 11px; font-weight: 500;
          letter-spacing: .1em; text-transform: uppercase;
          color: rgba(255,255,255,.38); margin-bottom: 7px;
        }
        .f-wrap { position: relative; }
        .f input {
          width: 100%;
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 11px;
          padding: 13px 16px;
          font-family: 'DM Sans', sans-serif; font-size: 15px;
          color: #fff; outline: none;
          transition: border-color .2s, background .2s;
        }
        .f input:focus {
          border-color: rgba(99,102,241,.55);
          background: rgba(99,102,241,.07);
        }
        .f input::placeholder { color: rgba(255,255,255,.18); }
        .toggle {
          position: absolute; right: 12px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          color: rgba(255,255,255,.3); cursor: pointer; font-size: 16px;
          transition: color .2s;
        }
        .toggle:hover { color: rgba(255,255,255,.65); }

        .strength-bar {
          display: flex; gap: 4px; margin-top: 8px;
        }
        .strength-seg {
          height: 3px; flex: 1; border-radius: 2px;
          background: rgba(255,255,255,.08);
          transition: background .3s;
        }
        .strength-label {
          font-size: 11px; margin-top: 5px;
          transition: color .3s;
        }

        .submit-btn {
          width: 100%; margin-top: 8px;
          background: linear-gradient(135deg,#6366f1,#8b5cf6);
          border: none; border-radius: 11px;
          padding: 14px;
          font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700;
          color: #fff; cursor: pointer;
          transition: opacity .2s, transform .15s;
          box-shadow: 0 0 28px rgba(99,102,241,.3);
        }
        .submit-btn:hover { transform: translateY(-1px); }
        .submit-btn:disabled { opacity: .5; cursor: not-allowed; transform: none; }

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

        .terms {
          font-size: 12px; color: rgba(255,255,255,.2);
          text-align: center; margin-top: 20px; line-height: 1.6;
        }
        .terms a { color: rgba(255,255,255,.35); text-decoration: none; }

        .login-link {
          text-align: center; margin-top: 24px;
          font-size: 14px; color: rgba(255,255,255,.3);
        }
        .login-link a { color: #818cf8; text-decoration: none; font-weight: 500; }

        .error-box {
          background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.2);
          border-radius: 10px; padding: 11px 14px; font-size: 13px;
          color: #fca5a5; margin-bottom: 18px;
        }

        .done-box {
          text-align: center; padding: 20px 0;
        }
        .done-icon { font-size: 52px; margin-bottom: 18px; }
        .done-title {
          font-family: 'Syne', sans-serif; font-size: 24px; font-weight: 800;
          color: #fff; margin-bottom: 10px; letter-spacing: -.02em;
        }
        .done-sub { font-size: 14px; color: rgba(255,255,255,.4); line-height: 1.65; }

        @media (max-width: 768px) {
          .su-left { display: none; }
          .su-right { width: 100%; border: none; }
        }
      `}</style>

      <div className="su-root">
        {/* Left */}
        <div className="su-left">
          <div className="su-grid" />
          <Link href="/" className="su-brand">
            <div className="su-brand-icon">♪</div>
            NasheedHub
          </Link>
          <div className="su-headline">
            <h2>Join the<br /><span>community.</span></h2>
            <p>Thousands of nasheeds from artists around the world. Free, halal, and beautiful.</p>
            <div className="artists-row">
              {['Maher Zain', 'Sami Yusuf', 'Mishary Rashid', 'Hamza Namira', 'Native Deen'].map(a => (
                <span key={a} className="artist-chip">{a}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="su-right">
          <div className="su-form-box">
            {done ? (
              <div className="done-box">
                <div className="done-icon">✉️</div>
                <div className="done-title">Check your inbox</div>
                <p className="done-sub">We sent a confirmation link to <strong style={{ color: '#fff' }}>{email}</strong>. Click it to activate your account.</p>
              </div>
            ) : (
              <>
                <h2 className="su-title">Create account</h2>
                <p className="su-sub">Free forever. Start listening in seconds.</p>

                {error && <div className="error-box">{error}</div>}

                <form onSubmit={handleSignup}>
                  <div className="f">
                    <label>Full name</label>
                    <input type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} required />
                  </div>
                  <div className="f">
                    <label>Email address</label>
                    <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                  <div className="f">
                    <label>Password</label>
                    <div className="f-wrap">
                      <input
                        type={showPass ? 'text' : 'password'}
                        placeholder="Create a password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                      />
                      <button type="button" className="toggle" onClick={() => setShowPass(p => !p)}>
                        {showPass ? '○' : '●'}
                      </button>
                    </div>
                    {password.length > 0 && (
                      <>
                        <div className="strength-bar">
                          {[1,2,3,4].map(i => (
                            <div key={i} className="strength-seg" style={{ background: i <= strength ? strengthColors[strength] : undefined }} />
                          ))}
                        </div>
                        <div className="strength-label" style={{ color: strengthColors[strength] }}>
                          {strengthLabels[strength]}
                        </div>
                      </>
                    )}
                  </div>

                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? 'Creating account…' : 'Create Account'}
                  </button>
                </form>

                <div className="divider">
                  <div className="div-line" />
                  <span className="div-txt">OR</span>
                  <div className="div-line" />
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

                <p className="terms">By signing up, you agree to our <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.</p>
                <p className="login-link">Already have an account? <Link href="/login">Sign in</Link></p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}