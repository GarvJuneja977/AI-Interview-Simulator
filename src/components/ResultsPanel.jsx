import React from 'react'
import { CheckCircle, XCircle, AlertCircle, TrendingUp, Zap, Star, ArrowRight } from 'lucide-react'

const verdictConfig = {
  'Accepted': { icon: CheckCircle, color: '#00ff88', bg: 'rgba(0,255,136,0.1)' },
  'Wrong Answer': { icon: XCircle, color: '#ff4444', bg: 'rgba(255,68,68,0.1)' },
  'Time Limit Exceeded': { icon: AlertCircle, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  'Runtime Error': { icon: XCircle, color: '#ff4444', bg: 'rgba(255,68,68,0.1)' },
  'Incomplete': { icon: AlertCircle, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
}

export default function ResultsPanel({ result, timeTaken, onRetry, onNext }) {
  if (!result) return null

  const config = verdictConfig[result.verdict] || verdictConfig['Wrong Answer']
  const Icon = config.icon

  const formatTime = (s) => {
    const m = Math.floor(s / 60), sec = s % 60
    return `${m}m ${sec}s`
  }

  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      {/* Verdict Banner */}
      <div style={{
        padding: '20px 24px',
        background: config.bg,
        border: `1px solid ${config.color}33`,
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Icon size={28} color={config.color} />
          <div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: config.color }}>
              {result.verdict}
            </div>
            <div style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>
              Time taken: {formatTime(timeTaken)}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: '800', color: config.color, lineHeight: 1 }}>
            {result.score}
          </div>
          <div style={{ color: 'var(--text2)', fontSize: '0.8rem' }}>/ 100</div>
        </div>
      </div>

      {/* Complexity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Time Complexity', value: result.timeComplexity, icon: '⏱️' },
          { label: 'Space Complexity', value: result.spaceComplexity, icon: '💾' },
        ].map(item => (
          <div key={item.label} style={{
            padding: '14px', background: 'var(--bg3)',
            border: '1px solid var(--border)', borderRadius: '10px', textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{item.icon}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', color: '#7c3aed', fontWeight: '700' }}>
              {item.value}
            </div>
            <div style={{ color: 'var(--text2)', fontSize: '0.75rem', marginTop: '2px' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Assessment */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Correctness', value: result.correctness },
          { label: 'Efficiency', value: result.efficiency },
          { label: 'Code Quality', value: result.codeQuality },
        ].map(item => (
          <div key={item.label} style={{
            padding: '12px 16px',
            background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px'
          }}>
            <span style={{ color: 'var(--text2)', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {item.label}
            </span>
            <p style={{ color: 'var(--text)', fontSize: '0.9rem', marginTop: '4px', lineHeight: 1.5 }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Strengths & Improvements */}
      {result.strengths?.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Star size={14} color='#00ff88' />
            <span style={{ color: 'var(--text2)', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Strengths</span>
          </div>
          {result.strengths.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
              <span style={{ color: '#00ff88', fontSize: '0.85rem' }}>✓</span>
              <span style={{ color: 'var(--text)', fontSize: '0.85rem' }}>{s}</span>
            </div>
          ))}
        </div>
      )}

      {result.improvements?.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <TrendingUp size={14} color='#f59e0b' />
            <span style={{ color: 'var(--text2)', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Areas to Improve</span>
          </div>
          {result.improvements.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
              <span style={{ color: '#f59e0b', fontSize: '0.85rem' }}>→</span>
              <span style={{ color: 'var(--text)', fontSize: '0.85rem' }}>{s}</span>
            </div>
          ))}
        </div>
      )}

      {/* Interview Tip */}
      {result.interviewTip && (
        <div style={{
          padding: '14px 16px',
          background: 'rgba(124,58,237,0.1)',
          border: '1px solid rgba(124,58,237,0.3)',
          borderRadius: '10px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Zap size={14} color='#7c3aed' />
            <span style={{ color: '#7c3aed', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Interview Tip</span>
          </div>
          <p style={{ color: 'var(--text)', fontSize: '0.85rem', lineHeight: 1.5 }}>{result.interviewTip}</p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button onClick={onRetry} style={{
          flex: 1, padding: '12px',
          background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: '8px', color: 'var(--text)', fontWeight: '600',
          cursor: 'pointer', transition: 'all 0.2s ease'
        }}
          onMouseEnter={e => e.target.style.borderColor = 'var(--accent2)'}
          onMouseLeave={e => e.target.style.borderColor = 'var(--border)'}
        >
          Try Again
        </button>
        <button onClick={onNext} style={{
          flex: 1, padding: '12px',
          background: 'linear-gradient(135deg, var(--accent2), #4f46e5)',
          border: 'none', borderRadius: '8px', color: '#fff', fontWeight: '700',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
        }}>
          Next Problem <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}
