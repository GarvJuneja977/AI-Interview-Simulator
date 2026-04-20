const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

// NOTE: In production, NEVER expose API keys in frontend code.
// Use a backend server to proxy API calls.
// For local development, paste your key here or use an .env file with Vite:
// Create a .env file in the root: VITE_ANTHROPIC_API_KEY=your_key_here

const getApiKey = () => {
  return import.meta.env.VITE_ANTHROPIC_API_KEY || ''
}

export const evaluateCode = async ({ code, language, question, onStream }) => {
  const apiKey = getApiKey()
  if (!apiKey) {
    return {
      error: true,
      message: 'No API key found. Please add VITE_ANTHROPIC_API_KEY to your .env file.'
    }
  }

  const prompt = `You are an expert software engineer and technical interviewer. Evaluate the following code solution for the given problem.

PROBLEM: ${question.title}
DESCRIPTION: ${question.description}

SUBMITTED CODE (${language}):
\`\`\`${language}
${code}
\`\`\`

Please evaluate the code and provide a structured JSON response with exactly this format:
{
  "verdict": "Accepted" | "Wrong Answer" | "Time Limit Exceeded" | "Runtime Error" | "Incomplete",
  "score": <number 0-100>,
  "timeComplexity": "<e.g. O(n)>",
  "spaceComplexity": "<e.g. O(1)>",
  "correctness": "<brief assessment>",
  "efficiency": "<brief assessment>",
  "codeQuality": "<brief assessment>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"],
  "optimalSolution": "<brief description of optimal approach>",
  "interviewTip": "<one actionable tip for real interviews>"
}

Be fair but critical. If the code is empty or just a stub, give score 0. Respond ONLY with valid JSON.`

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!response.ok) {
      const err = await response.json()
      return { error: true, message: err.error?.message || 'API request failed' }
    }

    const data = await response.json()
    const text = data.content[0]?.text || ''
    
    try {
      const clean = text.replace(/```json|```/g, '').trim()
      return { error: false, result: JSON.parse(clean) }
    } catch {
      return { error: true, message: 'Failed to parse AI response.' }
    }
  } catch (err) {
    return { error: true, message: err.message }
  }
}

export const getHint = async ({ code, question, hintIndex }) => {
  const apiKey = getApiKey()
  if (!apiKey) return { error: true, message: 'No API key.' }

  const prompt = `You are a helpful coding mentor. The student is working on: "${question.title}".

Their current code:
\`\`\`
${code || '(empty)'}
\`\`\`

Give hint #${hintIndex + 1} that progressively reveals more of the solution. Be concise (2-3 sentences max). Don't give away the full solution. Focus on the key insight they might be missing.`

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    const data = await res.json()
    return { error: false, hint: data.content[0]?.text || '' }
  } catch (err) {
    return { error: true, message: err.message }
  }
}
