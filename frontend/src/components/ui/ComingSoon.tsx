'use client'

import Card from '@/components/ui/Card'

function ComingSoon({ module }: { module: string }) {
  return (
    <div style={{ maxWidth: 600 }}>
      <Card>
        <div style={{
          padding: '48px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            border: '1px solid var(--border-base)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            color: 'var(--accent)',
          }}>◫</div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 18,
            color: 'var(--text-primary)',
          }}>{module}</div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--text-tertiary)',
            textAlign: 'center',
            maxWidth: 320,
          }}>
            This module is part of the Financial OS roadmap.
            Coming in Phase 4 of the build.
          </div>
          <div style={{
            marginTop: 8,
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.1em',
            color: 'var(--text-muted)',
            background: 'var(--bg-elevated)',
            padding: '4px 12px',
            borderRadius: 4,
          }}>PHASE 4 · PLANNED</div>
        </div>
      </Card>
    </div>
  )
}

export default ComingSoon
