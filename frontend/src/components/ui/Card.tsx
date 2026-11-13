import { CSSProperties, ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  style?: CSSProperties
  className?: string
  delay?: number
}

export default function Card({ children, style, className, delay = 0 }: CardProps) {
  return (
    <div
      className={`animate-fade-up ${className ?? ''}`}
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,252,247,0.88) 100%)',
        border: '1px solid rgba(255,255,255,0.65)',
        borderRadius: 'var(--r-lg)',
        padding: '20px 22px',
        position: 'relative',
        overflow: 'hidden',
        animationDelay: `${delay}ms`,
        boxShadow: '0 18px 44px rgba(64, 52, 40, 0.08), 0 2px 8px rgba(64, 52, 40, 0.04)',
        backdropFilter: 'blur(14px)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  label: string
  action?: ReactNode
}

export function CardHeader({ label, action }: CardHeaderProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    }}>
      <span style={{
        fontSize: 10,
        fontFamily: 'var(--font-mono)',
        fontWeight: 500,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--text-tertiary)',
      }}>{label}</span>
      {action}
    </div>
  )
}
