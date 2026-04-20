import React, { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

export default function Timer({ seconds, onTimeUp, running }) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    setRemaining(seconds)
  }, [seconds])

  useEffect(() => {
    if (!running) return
    if (remaining <= 0) {
      onTimeUp?.()
      return
    }
    const id = setInterval(() => setRemaining(r => r - 1), 1000)
    return () => clearInterval(id)
  }, [running, remaining])

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const pct = (remaining / seconds) * 100
  const urgent = remaining < 120

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '8px 16px',
      background: urgent ? 'rgba(255,68,68,0.1)' : 'rgba(0,255,136,0.05)',
      border: `1px solid ${urgent ? 'rgba(255,68,68,0.4)' : 'rgba(0,255,136,0.2)'}`,
      borderRadius: '8px',
      animation: urgent && remaining < 30 ? 'pulse-glow 1s infinite' : 'none',
      transition: 'all 0.3s ease'
    }}>
      <Clock size={16} color={urgent ? '#ff4444' : '#00ff88'} />
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '1.1rem',
        fontWeight: '700',
        color: urgent ? '#ff4444' : '#00ff88',
        letterSpacing: '2px'
      }}>
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </span>
      <div style={{
        width: '60px', height: '4px',
        background: 'var(--bg3)',
        borderRadius: '2px',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: urgent ? '#ff4444' : '#00ff88',
          transition: 'width 1s linear, background 0.3s ease',
          borderRadius: '2px'
        }} />
      </div>
    </div>
  )
}
