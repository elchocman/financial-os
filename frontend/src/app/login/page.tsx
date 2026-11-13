'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { login, register } from '@/lib/api'
import { setToken } from '@/lib/auth'

export default function AuthPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        const result = await login(email, password)
        setToken({ accessToken: result.access_token, tokenType: result.token_type })
      } else {
        await register(email, password, name)
        const result = await login(email, password)
        setToken({ accessToken: result.access_token, tokenType: result.token_type })
      }
      router.push('/')
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-void)',
      padding: '16px',
      fontFamily: 'var(--font-display)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
      }}>
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-base)',
          borderRadius: 'var(--r-md)',
          padding: '32px',
        }}>
          <h1 style={{
            fontSize: 32,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 8,
            letterSpacing: '-0.02em',
          }}>Financial OS</h1>
          
          <p style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
            marginBottom: 24,
          }}>
            {isLogin ? 'Sign in to your account' : 'Create a new account'}
          </p>

          {error && (
            <div style={{
              marginBottom: 20,
              padding: '12px 16px',
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 'var(--r-sm)',
              color: '#f43f5e',
              fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {!isLogin && (
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  marginBottom: 8,
                  letterSpacing: '0.04em',
                }}>
                  FULL NAME
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-base)',
                    borderRadius: 'var(--r-sm)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    fontFamily: 'var(--font-display)',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                  }}
                  placeholder="John Doe"
                  onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-base)'}
                />
              </div>
            )}

            <div>
              <label style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: 8,
                letterSpacing: '0.04em',
              }}>
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-base)',
                  borderRadius: 'var(--r-sm)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontFamily: 'var(--font-display)',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                }}
                placeholder="you@example.com"
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-base)'}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: 8,
                letterSpacing: '0.04em',
              }}>
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-base)',
                  borderRadius: 'var(--r-sm)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontFamily: 'var(--font-display)',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                }}
                placeholder="••••••••"
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-base)'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 8,
                padding: '10px 16px',
                background: loading ? 'var(--bg-elevated)' : 'var(--accent)',
                color: loading ? 'var(--text-tertiary)' : 'var(--bg-void)',
                border: 'none',
                borderRadius: 'var(--r-sm)',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'var(--font-display)',
                letterSpacing: '0.04em',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,160,32,0.9)'
                  ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)'
                  ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
                }
              }}
            >
              {loading ? 'LOADING...' : isLogin ? 'SIGN IN' : 'SIGN UP'}
            </button>
          </form>

          <div style={{
            marginTop: 24,
            paddingTop: 24,
            borderTop: '1px solid var(--border-dim)',
            textAlign: 'center',
          }}>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: 12,
            }}>
              {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError('')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'none',
                  transition: 'color 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(232,160,32,0.8)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--accent)')}
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
