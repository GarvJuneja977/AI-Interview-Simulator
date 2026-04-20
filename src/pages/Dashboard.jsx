import React from 'react'
import { useNavigate } from 'react-router-dom'
import { questions, getDifficultyColor } from '../utils/questions'
import { getOverallStats } from '../utils/storage'
import { BarChart2, Clock, Target, Zap, ChevronRight, Code2 } from 'lucide-react'

export default function Dashboard() {
  const navigate = useNavigate()
  const stats = getOverallStats()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '0' }}>
      {/* Header */}
      <header style={{
        padding: '20px 40px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg2)',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'linear-gradient(135deg, #00ff88, #7c3aed)',
            borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Code2 size={20} color='#fff' />
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '1.1rem', letterSpacing: '-0.5px' }}>InterviewAI</div>
            <div style={{ color: 'var(--text2)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', letterSpacing: '1px' }}>TECHNICAL SIMULATOR</div>
          </div>
        </div>
        <button
          onClick={() => navigate('/analytics')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px', background: 'var(--bg3)',
            border: '1px solid var(--border)', borderRadius: '8px',
            color: 'var(--text)', fontWeight: '600', fontSize: '0.85rem',
            cursor: 'pointer', transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#7c3aed'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <BarChart2 size={16} /> Analytics
        </button>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Hero */}
        <div style={{ marginBottom: '48px', animation: 'fadeIn 0.5s ease' }}>
          <div style={{
            display: 'inline-block', padding: '4px 12px',
            background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)',
            borderRadius: '20px', marginBottom: '16px'
          }}>
            <span style={{ color: '#00ff88', fontSize: '0.75rem', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase' }}>
              AI-Powered · Real-Time Feedback
            </span>
          </div>
          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: '800',
            lineHeight: 1.1, letterSpacing: '-1px', marginBottom: '16px'
          }}>
            Master Technical<br />
            <span style={{ color: 'var(--accent)' }}>Interviews</span> with AI
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: '1.05rem', maxWidth: '500px', lineHeight: 1.6 }}>
            Practice coding problems in a timed environment. Get instant AI feedback on correctness, efficiency, and code quality.
          </p>
        </div>

        {/* Stats row */}
        {stats && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '16px', marginBottom: '40px'
          }}>
            {[
              { label: 'Problems Attempted', value: stats.totalAttempts, icon: Target, color: '#00ff88' },
              { label: 'Success Rate', value: `${stats.successRate}%`, icon: Zap, color: '#7c3aed' },
              { label: 'Avg Score', value: `${stats.avgScore}/100`, icon: BarChart2, color: '#f59e0b' },
              { label: 'Avg Time', value: `${Math.floor(stats.avgTime / 60)}m`, icon: Clock, color: '#06b6d4' },
            ].map(s => (
              <div key={s.label} style={{
                padding: '20px', background: 'var(--bg2)',
                border: '1px solid var(--border)', borderRadius: '12px',
                animation: 'fadeIn 0.6s ease'
              }}>
                <s.icon size={18} color={s.color} style={{ marginBottom: '8px' }} />
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: s.color }}>{s.value}</div>
                <div style={{ color: 'var(--text2)', fontSize: '0.78rem', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Problem List */}
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '20px', color: 'var(--text2)', letterSpacing: '1px', textTransform: 'uppercase', fontSize: '0.85rem' }}>
            Problem Set
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {questions.map((q, i) => (
              <div
                key={q.id}
                onClick={() => navigate(`/interview/${q.id}`)}
                style={{
                  padding: '20px 24px',
                  background: 'var(--bg2)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                  animation: `fadeIn ${0.3 + i * 0.05}s ease`
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#7c3aed'
                  e.currentTarget.style.background = 'var(--bg3)'
                  e.currentTarget.style.transform = 'translateX(4px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.background = 'var(--bg2)'
                  e.currentTarget.style.transform = 'translateX(0)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '8px',
                    background: 'var(--bg3)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text2)'
                  }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '4px' }}>{q.title}</div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '0.75rem', padding: '2px 8px',
                        background: `${getDifficultyColor(q.difficulty)}15`,
                        color: getDifficultyColor(q.difficulty),
                        borderRadius: '4px', fontWeight: '600'
                      }}>
                        {q.difficulty}
                      </span>
                      <span style={{ color: 'var(--text2)', fontSize: '0.78rem' }}>{q.category}</span>
                      {q.tags.map(t => (
                        <span key={t} style={{
                          fontSize: '0.7rem', padding: '1px 6px',
                          background: 'var(--bg3)', color: 'var(--text2)',
                          borderRadius: '4px', border: '1px solid var(--border)'
                        }}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text2)', fontSize: '0.8rem' }}>
                    <Clock size={12} />
                    {Math.floor(q.timeLimit / 60)}m
                  </div>
                  <ChevronRight size={18} color='var(--text2)' />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
