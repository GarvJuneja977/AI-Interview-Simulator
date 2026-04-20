const STORAGE_KEY = 'interview_simulator_data'

export const getStoredData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { sessions: [], stats: {} }
  } catch {
    return { sessions: [], stats: {} }
  }
}

export const saveSession = (session) => {
  try {
    const data = getStoredData()
    data.sessions.unshift(session)
    if (data.sessions.length > 50) data.sessions = data.sessions.slice(0, 50)
    
    // Update stats
    const questionId = session.questionId
    if (!data.stats[questionId]) {
      data.stats[questionId] = { attempts: 0, bestScore: 0, totalTime: 0 }
    }
    data.stats[questionId].attempts++
    data.stats[questionId].totalTime += session.timeTaken
    if (session.score > data.stats[questionId].bestScore) {
      data.stats[questionId].bestScore = session.score
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export const getOverallStats = () => {
  const data = getStoredData()
  const sessions = data.sessions

  if (!sessions.length) return null

  const totalAttempts = sessions.length
  const avgScore = Math.round(sessions.reduce((s, x) => s + (x.score || 0), 0) / totalAttempts)
  const accepted = sessions.filter(s => s.verdict === 'Accepted').length
  const successRate = Math.round((accepted / totalAttempts) * 100)
  const avgTime = Math.round(sessions.reduce((s, x) => s + (x.timeTaken || 0), 0) / totalAttempts)

  const categoryPerf = {}
  sessions.forEach(s => {
    if (!categoryPerf[s.category]) categoryPerf[s.category] = { total: 0, score: 0 }
    categoryPerf[s.category].total++
    categoryPerf[s.category].score += (s.score || 0)
  })

  const categoryData = Object.entries(categoryPerf).map(([name, v]) => ({
    name,
    avgScore: Math.round(v.score / v.total),
    attempts: v.total
  }))

  const recentSessions = sessions.slice(0, 10).map((s, i) => ({
    session: totalAttempts - i,
    score: s.score || 0,
    title: s.questionTitle
  })).reverse()

  return { totalAttempts, avgScore, successRate, avgTime, categoryData, recentSessions, sessions }
}
