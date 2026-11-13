'use client'

import { useEffect, useState } from 'react'
import Card, { CardHeader } from '@/components/ui/Card'
import {
  getIntegrationsStatus,
  getManualHoldings,
  createManualHolding,
  updateManualHolding,
  deleteManualHolding,
} from '@/lib/api'
import type { IntegrationsStatus, ManualHolding } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? 'http://localhost:8000'

// ── Common Chilean stocks/ETFs presets ──────────────────────────────────────
const PRESETS = [
  { name: 'LATAM Airlines',      ticker: 'LTM.SN',      currency: 'CLP', asset_class: 'equity' },
  { name: 'ETF S&P500 Chile',    ticker: 'CFISP500.SN', currency: 'CLP', asset_class: 'etf'    },
  { name: 'Banco de Chile',      ticker: 'CHILE.SN',    currency: 'CLP', asset_class: 'equity' },
  { name: 'Falabella',           ticker: 'FALABELLA.SN',currency: 'CLP', asset_class: 'equity' },
  { name: 'Meta Platforms',      ticker: 'META',        currency: 'USD', asset_class: 'equity' },
  { name: 'Amazon',              ticker: 'AMZN',        currency: 'USD', asset_class: 'equity' },
  { name: 'Microsoft',           ticker: 'MSFT',        currency: 'USD', asset_class: 'equity' },
  { name: 'Apple',               ticker: 'AAPL',        currency: 'USD', asset_class: 'equity' },
  { name: 'Nvidia',              ticker: 'NVDA',        currency: 'USD', asset_class: 'equity' },
  { name: 'S&P 500 ETF (VOO)',   ticker: 'VOO',         currency: 'USD', asset_class: 'etf'    },
]

// ── Helpers ──────────────────────────────────────────────────────────────────
function Dot({ ok }: { ok: boolean }) {
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
      background: ok ? 'var(--gain)' : 'var(--loss)',
      boxShadow: ok ? '0 0 6px var(--gain)' : 'none',
      flexShrink: 0,
    }} />
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', color: 'var(--text-tertiary)', marginBottom: 10 }}>── {title} ──</div>
      {children}
    </div>
  )
}

function Btn({ onClick, children, variant = 'default', disabled }: {
  onClick?: () => void
  children: React.ReactNode
  variant?: 'default' | 'primary' | 'danger'
  disabled?: boolean
}) {
  const bg = variant === 'primary' ? 'var(--accent)' : variant === 'danger' ? 'rgba(239,68,68,0.15)' : 'var(--bg-elevated)'
  const color = variant === 'primary' ? '#fff' : variant === 'danger' ? 'var(--loss)' : 'var(--text-secondary)'
  const border = variant === 'danger' ? '1px solid rgba(239,68,68,0.3)' : '1px solid var(--border-base)'
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '5px 12px', background: bg, border, borderRadius: 'var(--r-sm)',
      color, fontSize: 11, fontFamily: 'var(--font-mono)', cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
    }}>{children}</button>
  )
}

function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string | number
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        padding: '6px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-base)',
        borderRadius: 'var(--r-sm)', color: 'var(--text-primary)', fontSize: 12,
        fontFamily: 'var(--font-mono)', outline: 'none', width: '100%',
      }}
    />
  )
}

// ── Empty form state ─────────────────────────────────────────────────────────
const EMPTY_FORM = { name: '', ticker: '', currency: 'USD', asset_class: 'equity', quantity: '', avg_cost: '' }

// ── Main page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [apiStatus, setApiStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle')
  const [apiVersion, setApiVersion] = useState<string | null>(null)
  const [integrations, setIntegrations] = useState<IntegrationsStatus | null>(null)
  const [holdings, setHoldings] = useState<ManualHolding[]>([])
  const [loadingHoldings, setLoadingHoldings] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function checkAPI() {
    setApiStatus('checking')
    try {
      const r = await fetch(`${API_URL}/health`)
      const d = await r.json()
      setApiVersion(d.app ?? 'ok')
      setApiStatus('ok')
    } catch {
      setApiStatus('error')
    }
  }

  async function loadData() {
    setLoadingHoldings(true)
    try {
      const [status, rows] = await Promise.all([
        getIntegrationsStatus(),
        getManualHoldings('racional'),
      ])
      setIntegrations(status)
      setHoldings(rows)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setLoadingHoldings(false)
    }
  }

  useEffect(() => { loadData() }, [])

  function startAdd() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function startEdit(h: ManualHolding) {
    setEditingId(h.id)
    setForm({
      name: h.name,
      ticker: h.ticker ?? '',
      currency: h.currency,
      asset_class: h.asset_class,
      quantity: String(h.quantity),
      avg_cost: h.avg_cost != null ? String(h.avg_cost) : '',
    })
    setShowForm(true)
  }

  function applyPreset(p: typeof PRESETS[0]) {
    setForm(f => ({ ...f, name: p.name, ticker: p.ticker, currency: p.currency, asset_class: p.asset_class }))
  }

  async function saveHolding() {
    if (!form.name || !form.ticker || !form.quantity) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name: form.name,
        ticker: form.ticker || undefined,
        platform: 'racional' as const,
        asset_class: form.asset_class,
        quantity: parseFloat(form.quantity),
        avg_cost: form.avg_cost ? parseFloat(form.avg_cost) : undefined,
        currency: form.currency,
      }
      if (editingId) {
        const updated = await updateManualHolding(editingId, payload)
        setHoldings(h => h.map(x => x.id === editingId ? updated : x))
      } else {
        const created = await createManualHolding(payload)
        setHoldings(h => [...h, created])
      }
      setShowForm(false)
      setEditingId(null)
      setForm(EMPTY_FORM)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await deleteManualHolding(id)
      setHoldings(h => h.filter(x => x.id !== id))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  const modeLabel: Record<string, string> = { api: 'API', manual: 'manual', db: 'DB', not_set: 'not set' }
  const modeColor: Record<string, string> = { api: 'var(--gain)', manual: 'var(--accent)', db: 'var(--gain)', not_set: 'var(--loss)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 780 }}>

      {/* ── Platform integrations ────────────────────────────────────────── */}
      <Section title="CONNECTED PLATFORMS">
        {integrations ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { key: 'fintual',  label: 'Fintual',  color: '#6366f1', description: 'Fondos mutuos — auth email/password en .env' },
              { key: 'racional', label: 'Racional',  color: '#10b981', description: 'Acciones + ETFs — holdings gestionados en esta página' },
              { key: 'binance',  label: 'Binance',   color: '#f59e0b', description: 'Crypto — API keys en .env o monto manual' },
            ].map(p => {
              const status = integrations[p.key as keyof IntegrationsStatus]
              return (
                <Card key={p.key} style={{ borderLeft: `3px solid ${p.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{p.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{p.description}</div>
                      {status.detail && (
                        <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 3 }}>{status.detail}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <Dot ok={status.configured} />
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: modeColor[status.mode] }}>{modeLabel[status.mode]}</span>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card><div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>Loading...</div></Card>
        )}
      </Section>

      {/* ── Racional Holdings Manager ────────────────────────────────────── */}
      <Section title="RACIONAL — HOLDINGS">
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>Posiciones Racional</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Agrega, edita o elimina tus acciones y ETFs en Racional.</div>
            </div>
            <Btn onClick={startAdd} variant="primary">+ Agregar</Btn>
          </div>

          {error && (
            <div style={{ fontSize: 11, color: 'var(--loss)', fontFamily: 'var(--font-mono)', marginBottom: 10, padding: '6px 10px', background: 'rgba(239,68,68,0.08)', borderRadius: 'var(--r-sm)' }}>
              {error}
            </div>
          )}

          {/* Add / Edit Form */}
          {showForm && (
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-base)', borderRadius: 'var(--r-sm)', padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', marginBottom: 10 }}>
                {editingId ? 'Editar posición' : 'Nueva posición'}
              </div>

              {/* Presets */}
              {!editingId && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 6 }}>ACCESO RÁPIDO</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {PRESETS.map(p => (
                      <button key={p.ticker} onClick={() => applyPreset(p)} style={{
                        padding: '3px 8px', background: 'var(--bg-base)', border: '1px solid var(--border-dim)',
                        borderRadius: 'var(--r-sm)', color: 'var(--text-secondary)', fontSize: 10,
                        fontFamily: 'var(--font-mono)', cursor: 'pointer',
                      }}>{p.ticker}</button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>NOMBRE</div>
                  <Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="ej. Meta Platforms" />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>TICKER</div>
                  <Input value={form.ticker} onChange={v => setForm(f => ({ ...f, ticker: v.toUpperCase() }))} placeholder="ej. META" />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>CANTIDAD (acciones)</div>
                  <Input value={form.quantity} onChange={v => setForm(f => ({ ...f, quantity: v }))} type="number" placeholder="ej. 10" />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>COSTO PROMEDIO (opcional)</div>
                  <Input value={form.avg_cost} onChange={v => setForm(f => ({ ...f, avg_cost: v }))} type="number" placeholder="precio de compra" />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>MONEDA</div>
                  <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} style={{
                    padding: '6px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-base)',
                    borderRadius: 'var(--r-sm)', color: 'var(--text-primary)', fontSize: 12, fontFamily: 'var(--font-mono)',
                    width: '100%', outline: 'none',
                  }}>
                    <option value="USD">USD</option>
                    <option value="CLP">CLP</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>CLASE DE ACTIVO</div>
                  <select value={form.asset_class} onChange={e => setForm(f => ({ ...f, asset_class: e.target.value }))} style={{
                    padding: '6px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-base)',
                    borderRadius: 'var(--r-sm)', color: 'var(--text-primary)', fontSize: 12, fontFamily: 'var(--font-mono)',
                    width: '100%', outline: 'none',
                  }}>
                    <option value="equity">Acción (equity)</option>
                    <option value="etf">ETF</option>
                    <option value="crypto">Crypto</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Btn onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM) }}>Cancelar</Btn>
                <Btn
                  onClick={saveHolding}
                  variant="primary"
                  disabled={saving || !form.name || !form.ticker || !form.quantity}
                >
                  {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Guardar'}
                </Btn>
              </div>
            </div>
          )}

          {/* Holdings table */}
          {loadingHoldings ? (
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', padding: '10px 0' }}>Cargando...</div>
          ) : holdings.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', padding: '16px 0', textAlign: 'center' }}>
              No hay posiciones. Haz clic en "Agregar" para empezar.
            </div>
          ) : (
            <div>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 80px 70px 60px 80px', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border-dim)', marginBottom: 4 }}>
                {['NOMBRE', 'TICKER', 'CANTIDAD', 'MONEDA', 'TIPO', ''].map(h => (
                  <div key={h} style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>{h}</div>
                ))}
              </div>
              {holdings.map(h => (
                <div key={h.id} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 80px 70px 60px 80px', gap: 8, padding: '9px 0', borderBottom: '1px solid var(--border-dim)', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{h.name}</div>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{h.ticker ?? '—'}</div>
                  <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{h.quantity}</div>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>{h.currency}</div>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h.asset_class}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => startEdit(h)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--font-mono)', padding: 0 }}>edit</button>
                    <button
                      onClick={() => handleDelete(h.id)}
                      disabled={deletingId === h.id}
                      style={{ background: 'none', border: 'none', color: 'var(--loss)', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--font-mono)', padding: 0, opacity: deletingId === h.id ? 0.5 : 1 }}
                    >{deletingId === h.id ? '...' : 'del'}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </Section>

      {/* ── Binance configuration instructions ──────────────────────────── */}
      <Section title="BINANCE — CONFIGURACIÓN">
        <Card>
          <CardHeader label="API Keys" />
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.6 }}>
            Para conectar tu cuenta de Binance real, agrega estas variables a <code style={{ background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 3, fontSize: 11, fontFamily: 'var(--font-mono)' }}>backend/.env</code>:
          </div>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-base)', borderRadius: 'var(--r-sm)', padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            <div><span style={{ color: 'var(--text-muted)' }}># Binance API (lectura de saldos)</span></div>
            <div>BINANCE_API_KEY=<span style={{ color: 'var(--accent)' }}>tu_api_key_aquí</span></div>
            <div>BINANCE_API_SECRET=<span style={{ color: 'var(--accent)' }}>tu_api_secret_aquí</span></div>
            <div style={{ marginTop: 8, color: 'var(--text-muted)' }}># Fallback manual si no usas API:</div>
            <div>BINANCE_BTC_AMOUNT=<span style={{ color: 'var(--accent)' }}>0.05</span></div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, fontFamily: 'var(--font-mono)' }}>
            Crea la API key en Binance → Gestión de API → solo necesita permiso de <strong>lectura de cuenta</strong>. Sin permisos de trading.
          </div>
          {integrations && (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Dot ok={integrations.binance.configured} />
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: modeColor[integrations.binance.mode ?? 'not_set'] }}>
                {integrations.binance.detail ?? 'No configurado'}
              </span>
            </div>
          )}
        </Card>
      </Section>

      {/* ── Fintual instructions ─────────────────────────────────────────── */}
      <Section title="FINTUAL — CONFIGURACIÓN">
        <Card>
          <CardHeader label="Credenciales" />
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.6 }}>
            Fintual usa tu email y contraseña del sitio web. Agrega en <code style={{ background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 3, fontSize: 11, fontFamily: 'var(--font-mono)' }}>backend/.env</code>:
          </div>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-base)', borderRadius: 'var(--r-sm)', padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            <div>FINTUAL_EMAIL=<span style={{ color: 'var(--accent)' }}>tu@email.com</span></div>
            <div>FINTUAL_PASSWORD=<span style={{ color: 'var(--accent)' }}>tu_contraseña</span></div>
          </div>
          {integrations && (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Dot ok={integrations.fintual.configured} />
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: integrations.fintual.configured ? 'var(--gain)' : 'var(--loss)' }}>
                {integrations.fintual.configured ? `Configurado (${integrations.fintual.detail})` : 'No configurado'}
              </span>
            </div>
          )}
        </Card>
      </Section>

      {/* ── API Connection ───────────────────────────────────────────────── */}
      <Section title="API CONNECTION">
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 3 }}>Backend API</div>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>{API_URL}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {apiStatus !== 'idle' && (
                <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: apiStatus === 'ok' ? 'var(--gain)' : apiStatus === 'error' ? 'var(--loss)' : 'var(--text-tertiary)' }}>
                  {apiStatus === 'checking' ? '⟳ checking...' : apiStatus === 'ok' ? `✓ ${apiVersion}` : '✗ unreachable'}
                </div>
              )}
              <Btn onClick={checkAPI}>Test Connection</Btn>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <a href={`${API_URL}/docs`} target="_blank" rel="noreferrer" style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent)', textDecoration: 'none' }}>→ API Docs</a>
            <span style={{ color: 'var(--border-base)' }}>·</span>
            <a href={`${API_URL}/redoc`} target="_blank" rel="noreferrer" style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent)', textDecoration: 'none' }}>→ ReDoc</a>
          </div>
        </Card>
      </Section>

      {/* ── Version ──────────────────────────────────────────────────────── */}
      <Card style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>Financial OS · v1.0.0</div>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>FastAPI 0.115 · Next.js 14 · Supabase</div>
        </div>
      </Card>

    </div>
  )
}

