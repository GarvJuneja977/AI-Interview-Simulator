let cmEditor = null;
const state = {
  questions: [], currentQuestion: null, timerInterval: null,
  timeRemaining: 0, timeTaken: 0, hintsUsed: 0, currentLang: 'javascript',
  cameraStream: null, micStream: null, cameraOn: false, micOn: false,
  chatHistory: [], interviewerTyping: false,
  recognition: null, pendingSpeak: false,
  lastSubmittedCode: '', lastSubmittedLang: 'javascript',
  faceApiLoaded: false, faceDetectionInterval: null,
  faceGoneTime: null, multiplePeopleWarned: false,
  alexSpeaking: false,
  hasShownListeningMsg: false,
  // Proctoring
  violations: 0, maxViolations: 10,
  proctoringActive: false, faceCheckInterval: null,
  pendingQuestion: null, setupStream: null, setupMicStream: null,
  // AI auto-analysis
  lastCodeSnapshot: '', codeAnalysisInterval: null,
  lastCodeChangeTime: Date.now(), stuckCheckInterval: null,
  lastAIMessageTime: 0
};

document.addEventListener('DOMContentLoaded', () => {
  loadQuestions();
  history.replaceState({ screen: 'screen-landing' }, '', '#screen-landing');
  loadFaceApiModels();
});

async function loadFaceApiModels() {
  // Wait for face-api script to load
  await new Promise(resolve => setTimeout(resolve, 2000));

  if (typeof faceapi === 'undefined' || window.faceApiLoadFailed) {
    console.warn('face-api.js not available, using fallback detection');
    state.faceApiLoaded = false;
    return;
  }

  try {
    // Try multiple CDN sources for the weights
    const MODEL_URLS = [
      'https://justadudewhohacks.github.io/face-api.js/models',
      'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model',
    ];

    let loaded = false;
    for (const url of MODEL_URLS) {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(url),
        ]);
        loaded = true;
        console.log('✅ Face detection models loaded from:', url);
        break;
      } catch(e) {
        console.warn('Failed to load from', url, '- trying next...');
      }
    }

    state.faceApiLoaded = loaded;
    if (!loaded) console.warn('All face-api model sources failed, using fallback');
  } catch (err) {
    console.warn('Face API models failed to load:', err.message);
    state.faceApiLoaded = false;
  }
}

async function loadQuestions() {
  try {
    const res = await fetch('/api/questions');
    const data = await res.json();
    state.questions = data.questions;
    renderQuestions(state.questions);
  } catch (err) { console.error('Failed to load questions:', err); }
}

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) target.classList.add('active');
  if (screenId !== 'screen-coding') stopTimer();
  window.scrollTo(0, 0);

  // When leaving interview screens, replace history so back/forward
  // buttons cannot navigate back into an active interview
  if (screenId === 'screen-select' || screenId === 'screen-landing' || screenId === 'screen-results') {
    history.replaceState({ screen: screenId }, '', '#' + screenId);
    history.pushState({ screen: screenId }, '', '#' + screenId);
    history.replaceState({ screen: screenId }, '', '#' + screenId);
  } else {
    history.pushState({ screen: screenId }, '', '#' + screenId);
  }

  // Reset setup UI when setup screen shows — user must click button to run checks

  if (screenId === 'screen-coding') {
    setTimeout(() => initCodeMirror(), 100);
  }

  if (screenId === 'screen-setup') {
    setCheck('camera', 'checking', 'Waiting...');
    setCheck('mic', 'checking', 'Waiting...');
    setCheck('fullscreen', 'ok', '✓ Will enable');
    const btn = document.getElementById('setup-start-btn');
    if (btn) {
      btn.disabled = false;
      btn.style.background = '#7c3aed';
      btn.textContent = '▶ Start Interview';
    }
  }
}

// Handle browser back/forward buttons
window.addEventListener('popstate', (e) => {
  const screenId = e.state?.screen || 'screen-landing';

  // Never allow navigating back/forward into an active interview via browser buttons
  if (screenId === 'screen-coding' || screenId === 'screen-setup') {
    history.replaceState({ screen: 'screen-select' }, '', '#screen-select');
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-select').classList.add('active');
    stopAllAI(); stopCamera(); stopMic(); stopTimer(); stopProctoring();
    exitFullscreen();
    return;
  }

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) target.classList.add('active');
  stopAllAI(); stopCamera(); stopMic(); stopTimer();
  window.scrollTo(0, 0);
});

// // Set initial history state on page load
// window.addEventListener('DOMContentLoaded', () => {
//   history.replaceState({ screen: 'screen-landing' }, '', '#screen-landing');
// });

function leaveCoding() {
  stopProctoring();
  stopAllAI();
  stopCamera();
  stopMic();
  exitFullscreen();
  // Clean up any leftover setup streams
  if (state.setupMicStream) {
    state.setupMicStream.getTracks().forEach(t => t.stop());
    state.setupMicStream = null;
  }
  if (state.setupStream) {
    state.setupStream.getTracks().forEach(t => t.stop());
    state.setupStream = null;
  }
  showScreen('screen-select');
}

// ═══════════════════════ SETUP SCREEN ═══════════════════════
async function runSetupChecks() {
  console.log('🔍 Running setup checks...');
  setCheck('camera', 'checking', 'Checking...');
  setCheck('mic', 'checking', 'Checking...');
  setCheck('fullscreen', 'checking', 'Required');
  document.getElementById('setup-start-btn').disabled = true;
  const old = document.getElementById('media-denied-msg');
  if (old) old.remove();
  const hint = document.getElementById('mic-permission-hint');
  if (hint) hint.remove();

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setCheck('camera', 'fail', '✗ Not supported');
    setCheck('mic', 'fail', '✗ Not supported');
    setCheck('fullscreen', 'ok', '✓ Will enable');
    updateSetupBtn();
    return;
  }

  // Request BOTH camera and mic in ONE call — avoids Chrome's second-permission bug
  setCheck('camera', 'checking', 'Requesting...');
  setCheck('mic', 'checking', 'Requesting...');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    // Split into separate streams
    const videoTracks = stream.getVideoTracks();
    const audioTracks = stream.getAudioTracks();

    if (videoTracks.length > 0) {
      const videoStream = new MediaStream(videoTracks);
      state.setupStream = videoStream;
      const vid = document.getElementById('setup-video');
      vid.srcObject = videoStream;
      document.getElementById('setup-preview-overlay').style.display = 'none';
      setCheck('camera', 'ok', '✓ Ready');
      console.log('✅ Camera OK');
    } else {
      setCheck('camera', 'fail', '✗ No video track');
    }

    if (audioTracks.length > 0) {
      state.setupMicStream = new MediaStream(audioTracks);
      setCheck('mic', 'ok', '✓ Ready');
      console.log('✅ Mic OK');
    } else {
      setCheck('mic', 'fail', '✗ No audio track');
    }

  } catch(e) {
    console.error('Media error:', e.name, e.message);

    // Combined request failed — try camera alone as fallback
    if (e.name === 'NotFoundError' || e.name === 'OverconstrainedError') {
      // Try camera alone
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
        state.setupStream = camStream;
        document.getElementById('setup-video').srcObject = camStream;
        document.getElementById('setup-preview-overlay').style.display = 'none';
        setCheck('camera', 'ok', '✓ Ready');
        console.log('✅ Camera OK (fallback)');
      } catch(ce) {
        setCheck('camera', 'fail', '✗ ' + ce.name);
      }

      // Request mic permission explicitly so SR works later
      setCheck('mic', 'checking', 'Requesting...');
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        state.setupMicStream = micStream;
        setCheck('mic', 'ok', '✓ Ready');
        console.log('✅ Mic permission granted');
      } catch(e) {
        console.warn('Mic error:', e.name);
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SR && e.name !== 'NotAllowedError') {
          setCheck('mic', 'ok', '✓ Ready (SR mode)');
        } else {
          setCheck('mic', 'fail', '✗ Mic blocked — click 🔒 in address bar → Allow Microphone');
          showSetupError('Microphone is blocked.\n\n1. Click 🔒 in Chrome address bar\n2. Set Microphone to Allow\n3. Refresh page (Ctrl+R)\n4. Click Re-check');
        }
      }

    } else if (e.name === 'NotAllowedError') {
      setCheck('camera', 'fail', '✗ Blocked');
      setCheck('mic', 'fail', '✗ Blocked');
      showSetupError('Camera & Microphone access blocked.\n\n1. Click the 🔒 lock icon in Chrome address bar\n2. Set both Camera and Microphone to "Allow"\n3. Refresh the page (Ctrl+R)\n4. Click Re-check');

    } else if (e.name === 'NotReadableError') {
      setCheck('camera', 'fail', '✗ Device in use');
      setCheck('mic', 'fail', '✗ Device in use');
      showSetupError('Camera or mic is being used by another app.\nClose Zoom, Teams, etc. and click Re-check.');

    } else {
      setCheck('camera', 'fail', '✗ Error');
      setCheck('mic', 'fail', '✗ ' + e.name);
      showSetupError('Error: ' + e.name + '\nClick Re-check to try again.');
    }
  }

  setCheck('fullscreen', 'ok', '✓ Will enable');
  updateSetupBtn();
  console.log('✅ Setup checks complete');
}

function showSetupError(message) {
  const old = document.getElementById('media-denied-msg');
  if (old) old.remove();
  const msg = document.createElement('div');
  msg.id = 'media-denied-msg';
  msg.style.cssText = `
    background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);
    border-radius:10px;padding:1rem 1.25rem;margin-bottom:1rem;line-height:1.7;white-space:pre-line;
  `;
  msg.innerHTML = `
    <div style="color:#f87171;font-weight:700;margin-bottom:0.5rem">⚠️ Setup Issue</div>
    <div style="color:#fca5a5;font-size:0.82rem;font-family:monospace">${message}</div>
    <button onclick="runSetupChecks()" style="
      margin-top:1rem;padding:0.5rem 1.25rem;background:#7c3aed;color:#fff;
      border:none;border-radius:6px;cursor:pointer;font-size:0.82rem;font-weight:700;">
      🔄 Re-check
    </button>
  `;
  const rulesEl = document.querySelector('.setup-rules');
  if (rulesEl) rulesEl.before(msg);
} 

function setCheck(name, status, text) {
  const item = document.getElementById(`check-${name}`);
  const statusEl = document.getElementById(`check-${name}-status`);
  item.className = `setup-check-item ${status}`;
  statusEl.className = `check-status ${status}`;
  statusEl.textContent = text;
}

function updateSetupBtn() {
  const cameraOk = document.getElementById('check-camera').classList.contains('ok');
  const micOk = document.getElementById('check-mic').classList.contains('ok');
  const btn = document.getElementById('setup-start-btn');

  btn.disabled = false;

  if (cameraOk && micOk) {
    btn.style.background = '';
    btn.textContent = '✅ All checks passed — Begin Interview';
  } else if (cameraOk && !micOk) {
    btn.style.background = '#b45309';
    btn.textContent = '▶ Start Interview (no mic — text chat only)';
  } else if (!cameraOk && micOk) {
    btn.style.background = '#b45309';
    btn.textContent = '▶ Start Interview (no camera)';
  } else {
    btn.style.background = '#7c3aed';
    btn.textContent = '▶ Start Interview (limited mode)';
  }
}

async function beginInterview() {
  // Stop setup VIDEO stream only — keep mic stream alive
  if (state.setupStream) {
    state.setupStream.getVideoTracks().forEach(t => t.stop());
    state.setupStream = null;
  }
  // Keep setupMicStream alive — startMicAndListen will use it
  console.log('beginInterview — setupMicStream available:', !!state.setupMicStream);

  // Enter fullscreen
  try {
    await document.documentElement.requestFullscreen();
  } catch(e) {}

  // Now go to coding screen
  showScreen('screen-coding');
  startTimer();

  // Start camera + mic immediately
  // Start camera only — mic starts after Alex finishes intro
  setTimeout(async () => {
    if (!state.cameraOn) await toggleCamera();
    // Start proctoring after camera is ready
    setTimeout(() => {
      startProctoring();
      startAutoAnalysis();
    }, 1000);
  }, 500);
}

// ═══════════════════════ PROCTORING ═══════════════════════
function startProctoring() {
  state.proctoringActive = true;
  state.violations = 0;
  updateViolationDisplay();

  // 1. Tab/window visibility change
  document.addEventListener('visibilitychange', onVisibilityChange);

  // 2. Window blur (switching apps)
  window.addEventListener('blur', onWindowBlur);

  // 3. Fullscreen exit
  document.addEventListener('fullscreenchange', onFullscreenChange);

  // 4. Right-click disable
  document.addEventListener('contextmenu', onContextMenu);

  // 5. Copy-paste detection
  document.addEventListener('copy', onCopyDetected);
  document.addEventListener('paste', onPasteDetected);

  // 6. Keyboard shortcuts (Alt+Tab signal, F12 devtools, etc.)
  document.addEventListener('keydown', onKeyDown);

  // 7. Face detection check every 5 seconds
  state.faceCheckInterval = setInterval(checkFacePresence, 5000);

  addAIMessage("🔒 Proctoring is now active. I can see you and this session is being monitored. Good luck!");
}

function stopProctoring() {
  state.proctoringActive = false;
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('blur', onWindowBlur);
  document.removeEventListener('fullscreenchange', onFullscreenChange);
  document.removeEventListener('contextmenu', onContextMenu);
  document.removeEventListener('copy', onCopyDetected);
  document.removeEventListener('paste', onPasteDetected);
  document.removeEventListener('keydown', onKeyDown);
  if (state.faceCheckInterval) { clearInterval(state.faceCheckInterval); state.faceCheckInterval = null; }
}


// ═══════════════════════ AI AUTO CODE ANALYSIS ═══════════════════════
function startAutoAnalysis() {
  state.lastCodeSnapshot = '';
  state.lastCodeChangeTime = Date.now();
  state.lastAIMessageTime = Date.now();

  // Every 60 seconds — analyze code if it changed
  state.codeAnalysisInterval = setInterval(async () => {
    if (!state.currentQuestion) return;
    const currentCode = cmEditor ? cmEditor.getValue().trim() : document.getElementById('code-editor').value.trim();
    const now = Date.now();

    // Only analyze if 50+ seconds passed since last AI message
    if (now - state.lastAIMessageTime < 50000) return;

    // If code changed since last snapshot, analyze it
    if (currentCode !== state.lastCodeSnapshot && currentCode.length > 20) {
      state.lastCodeSnapshot = currentCode;
      await triggerCodeAnalysis('code_analysis');
    }
  }, 60000);

  // Every 90 seconds — check if candidate is stuck (code not changed)
  state.stuckCheckInterval = setInterval(async () => {
    if (!state.currentQuestion) return;
    const now = Date.now();
    const timeSinceChange = now - state.lastCodeChangeTime;
    const timeSinceAI = now - state.lastAIMessageTime;
    const currentCode = cmEditor ? cmEditor.getValue().trim() : document.getElementById('code-editor').value.trim();

    // Stuck = no code change for 2 minutes AND AI hasn't spoken for 90+ seconds
    if (timeSinceChange > 120000 && timeSinceAI > 90000 && currentCode.length > 0) {
      await triggerCodeAnalysis('stuck_hint');
    }
  }, 90000);

  // Track when code last changed
  if (cmEditor) {
    cmEditor.on('change', () => { state.lastCodeChangeTime = Date.now(); });
  } else {
    document.getElementById('code-editor').addEventListener('input', () => {
      state.lastCodeChangeTime = Date.now();
    });
  }

  // Explain the question right at the start
  setTimeout(async () => {
    if (state.currentQuestion) {
      await triggerCodeAnalysis('question_intro');
    }
  }, 3000);
}

function stopAutoAnalysis() {
  if (state.codeAnalysisInterval) { clearInterval(state.codeAnalysisInterval); state.codeAnalysisInterval = null; }
  if (state.stuckCheckInterval) { clearInterval(state.stuckCheckInterval); state.stuckCheckInterval = null; }
}

async function triggerCodeAnalysis(triggerType) {
  if (triggerType === 'question_intro' && state.introPlayed) return;
  if (triggerType === 'question_intro') state.introPlayed = true;
  if (state.interviewerTyping && triggerType !== 'question_intro') return;
  const code = cmEditor ? cmEditor.getValue() : document.getElementById('code-editor').value;

  let typingId = null;
  if (triggerType === 'question_intro') {
    state.interviewerTyping = true;
    setInterviewerStatus('Explaining question...', 'yellow');
    setSpeakingAnimation(true);
    typingId = addTypingIndicator();
    // Stop timer while Alex explains the problem
    stopTimer();
  }

  try {
    const res = await fetch('/api/interviewer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: state.currentQuestion,
        code,
        userMessage: '',
        chatHistory: state.chatHistory.slice(-6),
        triggerType
      })
    });
    const data = await res.json();
    if (typingId) removeTypingIndicator(typingId);

    if (data.reply && !data.error) {
      // For intro: add message silently (speakIntroAndThenStart handles speech)
      // For others: addAIMessage handles speech via speakAlexMessage
      if (triggerType === 'question_intro') {
        // Build the chat bubble directly — bypasses addAIMessage's state.micOn speak trigger
        const chatBox = document.getElementById('chat-box');
        const div = document.createElement('div');
        div.className = 'chat-msg ai-msg';
        div.innerHTML = `<div class="chat-bubble">${escapeHtml(data.reply)}</div>`;
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
        state.chatHistory.push({ role: 'assistant', content: data.reply });
        state.lastAIMessageTime = Date.now();
        speakIntroAndThenStart(data.reply);
      } else {
        state.chatHistory.push({ role: 'assistant', content: data.reply });
        state.lastAIMessageTime = Date.now();
        addAIMessage(data.reply, true);
      }
    } else if (triggerType === 'question_intro') {
      // API failed — just start timer and mic anyway
      startTimer();
      setTimeout(() => { if (!state.micOn) toggleMic(); }, 500);
    }
  } catch (err) {
    if (typingId) removeTypingIndicator(typingId);
    if (triggerType === 'question_intro') {
      startTimer();
      setTimeout(() => { if (!state.micOn) toggleMic(); }, 500);
    }
    console.log('Auto analysis error:', err.message);
  } finally {
    state.interviewerTyping = false;
    setInterviewerStatus('Watching...', 'green');
    setSpeakingAnimation(false);
  }
}


function cleanForSpeech(text) {
  // Step 1: handle bracket notation explicitly before anything else
  // double index: grid[i][j] → grid at i j
  text = text.replace(/([a-zA-Z_]\w*)\[([a-zA-Z0-9_]+)\]\[([a-zA-Z0-9_]+)\]/g, '$1 at $2 $3');
  // single index: s[i] → s at index i, nums[0] → nums at index 0
  text = text.replace(/([a-zA-Z_]\w*)\[([a-zA-Z0-9_]+)\]/g, '$1 at index $2');
  // any remaining brackets: [1,2,3] → 1,2,3
  text = text.replace(/\[([^\]]+)\]/g, '$1');
  text = text.replace(/\[/g, '').replace(/\]/g, '');

  // Step 2: property access dots — s.length → s length
  text = text.replace(/([a-zA-Z_]\w*)\.([a-zA-Z_]\w*)/g, '$1 $2');

  // Step 3: math/comparison operators
  text = text.replace(/\s*<=\s*/g, ' is at most ');
  text = text.replace(/\s*>=\s*/g, ' is at least ');
  text = text.replace(/\s*!=\s*/g, ' not equal to ');
  text = text.replace(/\s*==\s*/g, ' equals ');
  text = text.replace(/\s*=\s*/g, ' equals ');

  // Step 4: code symbols
  text = text.replace(/`/g, '');
  text = text.replace(/\*/g, '');
  text = text.replace(/_/g, ' ');
  text = text.replace(/#/g, '');
  text = text.replace(/\{/g, '').replace(/\}/g, '');

  // Step 5: function call parens
  text = text.replace(/([a-zA-Z_]\w*)\(\)/g, '$1');

  // Step 6: complexity notation
  text = text.replace(/O\(([^)]+)\)/g, (_, inner) => 'O of ' + inner.replace(/\//g, ' over '));
  text = text.replace(/([a-zA-Z0-9]+)\/([a-zA-Z0-9]+)/g, '$1 over $2');

  // Step 7: common variable names
  text = text.replace(/\bstrs\b/g, 'strings');
  text = text.replace(/\bwordDict\b/g, 'word dictionary');
  text = text.replace(/\bworddict\b/gi, 'word dictionary');

  // Step 8: superscripts
  text = text.replace(/10⁴/g, '10 to the power of 4');
  text = text.replace(/10⁵/g, '10 to the power of 5');
  text = text.replace(/10⁶/g, '10 to the power of 6');
  text = text.replace(/10⁹/g, '10 to the power of 9');
  text = text.replace(/²/g, ' squared');
  text = text.replace(/³/g, ' cubed');

  // Step 9: arrows
  text = text.replace(/->/g, ' gives ');
  text = text.replace(/→/g, ' gives ');

  // Step 10: clean up whitespace
  text = text.replace(/\n+/g, ' ');
  text = text.replace(/\s{2,}/g, ' ');

  return text.trim();
}


function splitIntoChunks(text) {
  // Replace property access dots temporarily so they don't get split as sentence endings
  // e.g. s.length → s_DOT_length, nums.length → nums_DOT_length
  text = text.replace(/(\w)\.(\w)/g, '$1_DOT_$2');

  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];

  sentences.forEach(sentence => {
    sentence = sentence.trim().replace(/_DOT_/g, ' dot ');
    if (!sentence) return;

    if (sentence.length <= 120) {
      chunks.push(sentence);
    } else {
      // Long sentence — split at commas or dashes
      const parts = sentence.split(/(?<=,\s)|(?<=\s—\s)|(?<=;\s)/);
      parts.forEach(p => { if (p.trim()) chunks.push(p.trim()); });
    }
  });

  return chunks.filter(c => c.length > 0);
}

function speakChunks(chunks, onComplete) {
  if (!chunks.length) { onComplete(); return; }
  let index = 0;

  function next() {
    if (index >= chunks.length) { onComplete(); return; }
    const chunk = chunks[index];
    if (!chunk.trim()) { index++; next(); return; }

    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.rate = 1.15;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.includes('Google UK English Male') ||
      v.name.includes('Google US English') ||
      v.name.includes('Microsoft Ryan') ||
      v.name.includes('Microsoft Guy') ||
      v.name.includes('Daniel') ||
      v.name.includes('Alex')
    ) || voices.find(v => v.lang === 'en-US' || v.lang === 'en-GB');
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => { index++; setTimeout(next, 100); };
    utterance.onerror = (e) => {
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('TTS error:', e.error);
      }
      index++;
      setTimeout(next, 100);
    };

    window.speechSynthesis.speak(utterance);
  }

  setTimeout(next, 150);
}


function initCodeMirror() {
  if (cmEditor) return; // already initialized

  const textarea = document.getElementById('code-editor');

  cmEditor = CodeMirror.fromTextArea(textarea, {
    mode: 'javascript',
    theme: 'dracula',
    lineNumbers: true,
    autoCloseBrackets: true,
    matchBrackets: true,
    styleActiveLine: true,
    indentUnit: 2,
    tabSize: 2,
    indentWithTabs: false,
    lineWrapping: false,
    extraKeys: {
      'Ctrl-Space': 'autocomplete',
      'Tab': (cm) => {
        if (cm.somethingSelected()) {
          cm.indentSelection('add');
        } else {
          cm.replaceSelection('  ', 'end');
        }
      },
      'Ctrl-/': (cm) => cm.toggleComment(),
    },
    hintOptions: {
      completeSingle: false,
      alignWithWord: true,
    }
  });

  // Auto-trigger autocomplete on word characters
  cmEditor.on('inputRead', (cm, change) => {
    if (change.text[0] && /[\w.]/.test(change.text[0])) {
      CodeMirror.commands.autocomplete(cm, null, { completeSingle: false });
    }
  });

  // Keep char count updated
  cmEditor.on('change', () => {
    updateCharCount();
    state.lastCodeChangeTime = Date.now();
  });

  // Set initial size to fill container
  cmEditor.setSize('100%', '100%');
}

function getLangMode(lang) {
  switch (lang) {
    case 'javascript': return 'javascript';
    case 'python':     return 'python';
    case 'java':       return { name: 'clike', mime: 'text/x-java' };
    case 'cpp':        return { name: 'clike', mime: 'text/x-c++src' };
    default:           return 'javascript';
  }
}


function speakIntroAndThenStart(text) {
  if (!window.speechSynthesis) {
    startTimer();
    setTimeout(() => startMicAndListen(), 500);
    return;
  }

  clearSpeechQueue();
  window.speechSynthesis.cancel();
  state.alexSpeaking = false;
  setInterviewerStatus('Explaining...', 'yellow');

  // Kill any existing recognition before Alex speaks
  if (state.recognition) {
    state.recognition.onend = null; // prevent auto-restart during intro
    try { state.recognition.abort(); } catch(e) {}
    state.recognition = null;
  }

  speakNow(text, async () => {
    // Intro fully done — reset speech state
    state.alexSpeaking = false;
    setSpeakingAnimation(false);
    setInterviewerStatus('Listening...', 'green');

    // Start the timer now that Alex is done talking
    startTimer();

    // Small buffer then start mic fresh — no second speakNow, no duplicate prompt
    setTimeout(async () => {
      await startMicAndListen();
    }, 400);
  });
}

async function startMicAndListen() {
  console.log('🎙️ startMicAndListen called, micOn:', state.micOn);

  if (!state.micOn) {
    // Must get mic permission first — Speech Recognition requires it
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.micStream = stream;
      console.log('✅ Mic permission granted');
    } catch(e) {
      console.warn('Mic permission denied:', e.name);
      // Try anyway — some browsers allow SR without explicit permission
    }

    state.micOn = true;
    document.getElementById('mic-btn').classList.remove('off');
    document.getElementById('mic-btn').classList.add('on');
    document.getElementById('mic-icon').textContent = '🎙️';
    document.getElementById('mic-label').textContent = 'Mic On';
    document.getElementById('mic-indicator').classList.add('active');
    console.log('✅ Mic state set to ON');
  }

  state.alexSpeaking = false;
  // Null out any stale recognition instance so startSpeechRecognition starts clean
  if (state.recognition) {
    try { state.recognition.abort(); } catch(e) {}
    state.recognition = null;
  }
  console.log('🎧 Starting speech recognition...');
  setTimeout(() => startSpeechRecognition(), 300);
}



function onVisibilityChange() {
  if (!state.proctoringActive) return;
  if (document.hidden) triggerViolation('Tab Switch', 'You switched to another tab or minimized the window.');
}

let blurTimeout = null;
function onWindowBlur() {
  if (!state.proctoringActive) return;
  // Small delay to avoid false positives on fullscreen transitions
  blurTimeout = setTimeout(() => {
    triggerViolation('Window Switch', 'You switched to another application or window.');
  }, 1500);
}

window.addEventListener('focus', () => { if (blurTimeout) { clearTimeout(blurTimeout); blurTimeout = null; } });

function onFullscreenChange() {
  if (!state.proctoringActive) return;
  if (!document.fullscreenElement) {
    triggerViolation('Fullscreen Exit', 'You exited fullscreen mode. Please stay in fullscreen during the interview.');
    // Try to re-enter fullscreen
    setTimeout(() => {
      try { document.documentElement.requestFullscreen(); } catch(e) {}
    }, 2000);
  }
}

function onContextMenu(e) {
  if (!state.proctoringActive) return;
  e.preventDefault();
  showWarningBanner('⚠️ Right-click is disabled during the interview', 'yellow');
}

function onCopyDetected() {
  if (!state.proctoringActive) return;
  showWarningBanner('⚠️ Copying detected — this has been logged', 'yellow');
}

function onPasteDetected(e) {
  if (!state.proctoringActive) return;
  // Allow paste in the code editor, warn for others
  if (document.activeElement.id !== 'code-editor') {
    e.preventDefault();
    showWarningBanner('⚠️ External paste blocked', 'yellow');
  }
}

function onKeyDown(e) {
  if (!state.proctoringActive) return;
  // Block F12, Ctrl+Shift+I (devtools), Ctrl+U (view source)
  if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I') || (e.ctrlKey && e.key === 'u')) {
    e.preventDefault();
    showWarningBanner('⚠️ Developer tools are not allowed during the interview', 'yellow');
  }
}

// Simple face presence check using video dimensions
async function checkFacePresence() {
  if (!state.proctoringActive || !state.cameraOn) return;
  const video = document.getElementById('candidate-video');
  const faceStatus = document.getElementById('face-status');
  if (!video || !faceStatus) return;

  // Fallback if face-api not loaded yet
  if (!state.faceApiLoaded || typeof faceapi === 'undefined') {
    const isPlaying = video.readyState >= 2 && !video.paused;
    faceStatus.textContent = isPlaying ? '✓ Camera active' : '✗ Camera off';
    faceStatus.className = `face-status ${isPlaying ? 'detected' : 'not-detected'}`;
    return;
  }

  try {
    // Detect all faces in the current video frame
    const detections = await faceapi.detectAllFaces(
      video,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 })
    );

    const count = detections.length;

    if (count === 0) {
      // No face detected
      faceStatus.textContent = '✗ Face not detected';
      faceStatus.className = 'face-status not-detected';

      // Only trigger violation if face has been missing for a bit
      if (!state.faceGoneTime) {
        state.faceGoneTime = Date.now();
      } else if (Date.now() - state.faceGoneTime > 8000) {
        // Face missing for 8+ seconds
        state.faceGoneTime = null;
        triggerViolation('Face Not Detected', 'Your face has not been visible for several seconds. Please stay in frame during the interview.');
      }

    } else if (count === 1) {
      // Exactly one face — all good
      state.faceGoneTime = null;
      state.multiplePeopleWarned = false;
      faceStatus.textContent = '✓ Face detected';
      faceStatus.className = 'face-status detected';

    } else {
      // Multiple faces detected
      state.faceGoneTime = null;
      faceStatus.textContent = `⚠ ${count} faces detected!`;
      faceStatus.className = 'face-status not-detected';

      if (!state.multiplePeopleWarned) {
        state.multiplePeopleWarned = true;
        triggerViolation(
          'Multiple People Detected',
          `${count} people detected in the camera. Only the candidate should be present during the interview.`
        );
        addAIMessage(`⚠️ I can see ${count} people in the frame. Only you should be present during this interview. Please ask others to leave.`);
      }
    }
  } catch (err) {
    console.warn('Face detection error:', err.message);
    // Don't punish candidate if detection errors
    faceStatus.textContent = '✓ Camera active';
    faceStatus.className = 'face-status detected';
  }
}


function triggerViolation(type, message) {
  if (!state.proctoringActive) return;
  state.violations++;
  updateViolationDisplay();

  console.warn(`VIOLATION #${state.violations}: ${type}`);

  if (state.violations >= state.maxViolations) {
    // Auto terminate
    showViolationOverlay(type, message, true);
  } else {
    showViolationOverlay(type, message, false);
  }
  // addAIMessage(`🚨 Violation detected: ${type}. Warning ${state.violations} of ${state.maxViolations}.`);
}

function showViolationOverlay(type, message, isTerminal) {
  const overlay = document.getElementById('violation-overlay');
  const badge = document.getElementById('violation-count-badge');
  const msg = document.getElementById('violation-message');
  const continueBtn = document.querySelector('.btn-continue-anyway');

  badge.textContent = isTerminal ? '❌ Maximum violations reached' : `Warning ${state.violations} of ${state.maxViolations}`;
  msg.textContent = message;
  if (isTerminal) {
    continueBtn.style.display = 'none';
    document.querySelector('.violation-card h3').textContent = 'Interview Terminated';
    document.querySelector('.violation-icon').textContent = '❌';
  } else {
    continueBtn.style.display = 'inline-block';
    document.querySelector('.violation-card h3').textContent = 'Violation Detected';
    document.querySelector('.violation-icon').textContent = '🚨';
  }
  overlay.classList.remove('hidden');
}

function dismissViolation() {
  document.getElementById('violation-overlay').classList.add('hidden');
  // Try re-entering fullscreen
  try { document.documentElement.requestFullscreen(); } catch(e) {}
}

function terminateInterview() {
  stopAllAI();
  stopProctoring();
  stopCamera();
  stopMic();
  stopTimer();
  exitFullscreen();
  // Clear all browser history so forward button doesn't restore interview
  history.replaceState(null, '', '#screen-select');
  document.getElementById('violation-overlay').classList.add('hidden');
  showScreen('screen-select');
  setTimeout(() => alert(`Interview terminated due to ${state.violations} violation(s). Please restart to try again.`), 300);
}

function updateViolationDisplay() {
  const el = document.getElementById('topbar-warnings');
  if (!el) return;
  if (state.violations === 0) {
    el.textContent = '';
  } else {
    el.textContent = `⚠️ ${state.violations} violation${state.violations > 1 ? 's' : ''}`;
    el.className = state.violations >= 2 ? 'proctor-warnings danger' : 'proctor-warnings';
  }
}

function showWarningBanner(message, type = 'red') {
  // Remove existing banner
  const existing = document.getElementById('warning-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'warning-banner';
  banner.className = `warning-banner${type === 'yellow' ? ' yellow-warn' : ''}`;
  banner.innerHTML = `<span>🚨 ${message}</span><span class="warning-count">${state.violations}/${state.maxViolations} warnings</span>`;
  document.body.prepend(banner);

  setTimeout(() => { if (banner.parentNode) banner.remove(); }, 4000);
}

function exitFullscreen() {
  try { if (document.fullscreenElement) document.exitFullscreen(); } catch(e) {}
}



function filterQuestions(diff, btn) {
  document.querySelectorAll('.diff-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderQuestions(diff === 'all' ? state.questions : state.questions.filter(q => q.difficulty.toLowerCase() === diff));
}

function renderQuestions(questions) {
  const grid = document.getElementById('questions-grid');
  grid.innerHTML = '';
  questions.forEach(q => {
    const card = document.createElement('div');
    card.className = 'question-card';
    card.innerHTML = `
      <div class="card-top">
        <span class="card-category">${q.category}</span>
        <span class="diff-pill ${q.difficulty}">${q.difficulty}</span>
      </div>
      <div class="card-title">${q.title}</div>
      <div class="card-meta">
        <span class="card-time">⏱ ${Math.floor(q.timeLimit / 60)} min</span>
        <span class="card-arrow">→</span>
      </div>`;
    card.addEventListener('click', () => startQuestion(q));
    grid.appendChild(card);
  });
}

function startQuestion(question) {
  state.currentQuestion = question;
  state.hintsUsed = 0;
  state.timeRemaining = question.timeLimit;
  state.timeTaken = 0;
  state.chatHistory = [];
  state.hasShownListeningMsg = false;
  state.introPlayed = false;

  document.getElementById('q-title').textContent = question.title;
  const badge = document.getElementById('q-badge');
  badge.textContent = question.difficulty;
  badge.className = `q-diff-badge ${question.difficulty}`;
  document.getElementById('q-category').textContent = question.category;
  document.getElementById('q-description').innerHTML = formatDescription(question.description);
  document.getElementById('q-examples').innerHTML = question.examples.map(ex => `
    <div class="example-block">
      <div class="example-row"><span class="example-label">Input: </span><span class="example-val">${ex.input}</span></div>
      <div class="example-row"><span class="example-label">Output: </span><span class="example-val">${ex.output}</span></div>
      ${ex.explanation ? `<div class="example-note">💡 ${ex.explanation}</div>` : ''}
    </div>`).join('');
  document.getElementById('q-constraints').innerHTML = question.constraints.map(c => `<li>${c}</li>`).join('');

  ['hint-btn-1','hint-btn-2','hint-btn-3'].forEach((id, i) => {
    const btn = document.getElementById(id);
    if (btn) { btn.style.display = i === 0 ? 'inline-block' : 'none'; btn.classList.remove('used'); btn.disabled = false; btn.textContent = `💡 Hint ${i+1}`; }
  });
  const hd = document.getElementById('hint-display');
  hd.classList.add('hidden'); hd.textContent = '';

  const lang = document.getElementById('lang-select').value;
  state.currentLang = lang;
  const code = getStarterCode(question.id, lang);
  if (cmEditor) {
    cmEditor.setValue(code);
    cmEditor.setOption('mode', getLangMode(lang));
  } else {
    document.getElementById('code-editor').value = code;
  }
  updateCharCount();

  document.getElementById('chat-box').innerHTML = `
    <div class="chat-msg ai-msg">
      <div class="chat-bubble">👋 Hi! I'm <strong>Alex</strong>. You're working on <strong>${question.title}</strong> — a ${question.difficulty} problem. You have ${Math.floor(question.timeLimit/60)} minutes. Click <strong>"Ask Alex"</strong> if you need guidance. Good luck!</div>
    </div>`;

  setInterviewerStatus('Watching...', 'green');
  state.pendingQuestion = question;
  showScreen('screen-setup');
  //setTimeout(() => runSetupChecks(), 300);


  setTimeout(() => {
    if (state.currentQuestion && state.chatHistory.length === 0) {
      addAIMessage("How are you thinking about approaching this problem? Feel free to think out loud!");
    }
  }, 30000);
}

function formatDescription(desc) {
  return desc.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>');
}

function startTimer() {
  stopTimer(); updateTimerDisplay();
  state.timerInterval = setInterval(() => {
    state.timeRemaining--; state.timeTaken++;
    if (state.timeRemaining <= 0) {
      state.timeRemaining = 0; stopTimer(); updateTimerDisplay(); handleTimeUp(); return;
    }
    updateTimerDisplay();

    const half = Math.floor(state.currentQuestion.timeLimit / 2);

    if (state.timeRemaining === half) {
      const mins = Math.floor(state.timeRemaining / 60);
      addAIMessage(`Halfway through! You have ${mins} minutes remaining. How's your approach going?`, true);
    }
    if (state.timeRemaining === 180) {
      addAIMessage("3 minutes left! Start wrapping up your solution and handle edge cases.", true);
    }
    if (state.timeRemaining === 60) {
      addAIMessage("⚠️ Only 1 minute left! Please finalize your solution now.", true);
    }
    if (state.timeRemaining === 30) {
      addAIMessage("30 seconds remaining! Submit your solution.", true);
    }
  }, 1000);
}

function stopTimer() {
  if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
}

function updateTimerDisplay() {
  const mins = Math.floor(state.timeRemaining / 60);
  const secs = state.timeRemaining % 60;
  document.getElementById('timer-text').textContent = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  const el = document.getElementById('timer-display');
  el.className = 'timer-display';
  if (state.timeRemaining <= 60) el.classList.add('danger');
  else if (state.timeRemaining <= 180) el.classList.add('warning');
}

function handleTimeUp() {
  // Stop all AI before showing confirm so it doesn't keep speaking during the dialog
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  addAIMessage("⏰ Time's up! Please submit your solution now.", true);
  setTimeout(() => {
    if (confirm("⏰ Time's up! Submit your current solution?")) {
      submitSolution();
    } else {
      // Candidate dismissed — stop AI since interview is effectively over
      stopAllAI();
    }
  }, 500);
}

function onCodeInput() {
  updateCharCount();
}

function updateLineNumbers() {
  //const lines = document.getElementById('code-editor').value.split('\n').length;
  //document.getElementById('line-numbers').innerHTML = Array.from({length: lines}, (_, i) => i+1).join('<br>');
  // CodeMirror handles line numbers natively
}

function updateCharCount() {
  const val = cmEditor ? cmEditor.getValue() : document.getElementById('code-editor').value;
  document.getElementById('char-count').textContent = `${val.length} chars`;
}

function handleTabKey(e) {
  // Handled by CodeMirror extraKeys
}

function resetCode() {
  if (!state.currentQuestion) return;
  const wasProctoring = state.proctoringActive;
  state.proctoringActive = false;
  if (confirm('Reset code to starter template?')) {
    const code = getStarterCode(state.currentQuestion.id, document.getElementById('lang-select').value);
    if (cmEditor) cmEditor.setValue(code);
    else document.getElementById('code-editor').value = code;
    updateCharCount();
  }
  setTimeout(() => {
    state.proctoringActive = wasProctoring;
    if (wasProctoring && !document.fullscreenElement) {
      try { document.documentElement.requestFullscreen(); } catch(e) {}
    }
  }, 800);
}

const starterTemplates = {
  1: {
    javascript: `function twoSum(nums, target) {\n    // Your solution here\n    \n}`,
    python: `class Solution:\n    def two_sum(self, nums: list[int], target: int) -> list[int]:\n        # Your solution here\n        pass\n\n# Driver\nsol = Solution()\nprint(sol.two_sum([2,7,11,15], 9))`,
    java: `import java.util.*;\n\npublic class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Your solution here\n        return new int[]{};\n    }\n\n    public static void main(String[] args) {\n        Solution sol = new Solution();\n        System.out.println(Arrays.toString(sol.twoSum(new int[]{2,7,11,15}, 9)));\n    }\n}`,
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Your solution here\n        return {};\n    }\n};\n\nint main() {\n    Solution sol;\n    vector<int> nums = {2, 7, 11, 15};\n    vector<int> res = sol.twoSum(nums, 9);\n    for (int x : res) cout << x << " ";\n    return 0;\n}`
  },
  2: {
    javascript: `function isPalindrome(s) {\n    // Your solution here\n    \n}`,
    python: `class Solution:\n    def is_palindrome(self, s: str) -> bool:\n        # Your solution here\n        pass\n\nsol = Solution()\nprint(sol.is_palindrome("racecar"))`,
    java: `public class Solution {\n    public boolean isPalindrome(String s) {\n        // Your solution here\n        return false;\n    }\n\n    public static void main(String[] args) {\n        Solution sol = new Solution();\n        System.out.println(sol.isPalindrome("racecar"));\n    }\n}`,
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool isPalindrome(string s) {\n        // Your solution here\n        return false;\n    }\n};\n\nint main() {\n    Solution sol;\n    cout << sol.isPalindrome("racecar") << endl;\n    return 0;\n}`
  },
  3: {
    javascript: `function fizzBuzz(n) {\n    // Your solution here\n    \n}`,
    python: `class Solution:\n    def fizz_buzz(self, n: int) -> list[str]:\n        # Your solution here\n        pass\n\nsol = Solution()\nprint(sol.fizz_buzz(15))`,
    java: `import java.util.*;\n\npublic class Solution {\n    public List<String> fizzBuzz(int n) {\n        // Your solution here\n        return new ArrayList<>();\n    }\n\n    public static void main(String[] args) {\n        Solution sol = new Solution();\n        System.out.println(sol.fizzBuzz(15));\n    }\n}`,
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<string> fizzBuzz(int n) {\n        // Your solution here\n        return {};\n    }\n};\n\nint main() {\n    Solution sol;\n    vector<string> res = sol.fizzBuzz(15);\n    for (auto& s : res) cout << s << " ";\n    return 0;\n}`
  },
  4: {
    javascript: `function lengthOfLongestSubstring(s) {\n    // Your solution here\n    \n}`,
    python: `class Solution:\n    def length_of_longest_substring(self, s: str) -> int:\n        # Your solution here\n        pass\n\nsol = Solution()\nprint(sol.length_of_longest_substring("abcabcbb"))`,
    java: `public class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        // Your solution here\n        return 0;\n    }\n\n    public static void main(String[] args) {\n        Solution sol = new Solution();\n        System.out.println(sol.lengthOfLongestSubstring("abcabcbb"));\n    }\n}`,
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int lengthOfLongestSubstring(string s) {\n        // Your solution here\n        return 0;\n    }\n};\n\nint main() {\n    Solution sol;\n    cout << sol.lengthOfLongestSubstring("abcabcbb") << endl;\n    return 0;\n}`
  },
  5: {
    javascript: `function isValid(s) {\n    // Your solution here\n    \n}`,
    python: `class Solution:\n    def is_valid(self, s: str) -> bool:\n        # Your solution here\n        pass\n\nsol = Solution()\nprint(sol.is_valid("()[]{}"))`,
    java: `public class Solution {\n    public boolean isValid(String s) {\n        // Your solution here\n        return false;\n    }\n\n    public static void main(String[] args) {\n        Solution sol = new Solution();\n        System.out.println(sol.isValid("()[]{}"));\n    }\n}`,
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool isValid(string s) {\n        // Your solution here\n        return false;\n    }\n};\n\nint main() {\n    Solution sol;\n    cout << sol.isValid("()[]{}") << endl;\n    return 0;\n}`
  },
  6: {
    javascript: `function mergeKLists(lists) {\n    // Your solution here\n    \n}`,
    python: `class Solution:\n    def merge_k_lists(self, lists: list[list[int]]) -> list[int]:\n        # Your solution here\n        pass\n\nsol = Solution()\nprint(sol.merge_k_lists([[1,4,5],[1,3,4],[2,6]]))`,
    java: `import java.util.*;\n\npublic class Solution {\n    public int[] mergeKLists(int[][] lists) {\n        // Your solution here\n        return new int[]{};\n    }\n\n    public static void main(String[] args) {\n        Solution sol = new Solution();\n        System.out.println(Arrays.toString(sol.mergeKLists(new int[][]{{1,4,5},{1,3,4},{2,6}})));\n    }\n}`,
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> mergeKLists(vector<vector<int>>& lists) {\n        // Your solution here\n        return {};\n    }\n};\n\nint main() {\n    Solution sol;\n    vector<vector<int>> lists = {{1,4,5},{1,3,4},{2,6}};\n    vector<int> res = sol.mergeKLists(lists);\n    for (int x : res) cout << x << " ";\n    return 0;\n}`
  },
  7: {
    javascript: `function reverseString(s) {\n    // Modify s in-place\n    \n}`,
    python: `class Solution:\n    def reverse_string(self, s: list[str]) -> None:\n        # Modify s in-place\n        pass\n\nsol = Solution()\ns = ["h","e","l","l","o"]\nsol.reverse_string(s)\nprint(s)`,
    java: `public class Solution {\n    public void reverseString(char[] s) {\n        // Your solution here\n    }\n\n    public static void main(String[] args) {\n        Solution sol = new Solution();\n        char[] s = {'h','e','l','l','o'};\n        sol.reverseString(s);\n        System.out.println(new String(s));\n    }\n}`,
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    void reverseString(vector<char>& s) {\n        // Your solution here\n    }\n};\n\nint main() {\n    Solution sol;\n    vector<char> s = {'h','e','l','l','o'};\n    sol.reverseString(s);\n    for (char c : s) cout << c;\n    return 0;\n}`
  },
  8: {
    javascript: `function maxSubArray(nums) {\n    // Your solution here\n    \n}`,
    python: `class Solution:\n    def max_sub_array(self, nums: list[int]) -> int:\n        # Your solution here\n        pass\n\nsol = Solution()\nprint(sol.max_sub_array([-2,1,-3,4,-1,2,1,-5,4]))`,
    java: `public class Solution {\n    public int maxSubArray(int[] nums) {\n        // Your solution here\n        return 0;\n    }\n\n    public static void main(String[] args) {\n        Solution sol = new Solution();\n        System.out.println(sol.maxSubArray(new int[]{-2,1,-3,4,-1,2,1,-5,4}));\n    }\n}`,
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int maxSubArray(vector<int>& nums) {\n        // Your solution here\n        return 0;\n    }\n};\n\nint main() {\n    Solution sol;\n    vector<int> nums = {-2,1,-3,4,-1,2,1,-5,4};\n    cout << sol.maxSubArray(nums) << endl;\n    return 0;\n}`
  },
  9: {
    javascript: `function climbStairs(n) {\n    // Your solution here\n    \n}`,
    python: `class Solution:\n    def climb_stairs(self, n: int) -> int:\n        # Your solution here\n        pass\n\nsol = Solution()\nprint(sol.climb_stairs(5))`,
    java: `public class Solution {\n    public int climbStairs(int n) {\n        // Your solution here\n        return 0;\n    }\n\n    public static void main(String[] args) {\n        Solution sol = new Solution();\n        System.out.println(sol.climbStairs(5));\n    }\n}`,
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int climbStairs(int n) {\n        // Your solution here\n        return 0;\n    }\n};\n\nint main() {\n    Solution sol;\n    cout << sol.climbStairs(5) << endl;\n    return 0;\n}`
  },
  10: {
    javascript: `function containsDuplicate(nums) {\n    // Your solution here\n    \n}`,
    python: `class Solution:\n    def contains_duplicate(self, nums: list[int]) -> bool:\n        # Your solution here\n        pass\n\nsol = Solution()\nprint(sol.contains_duplicate([1,2,3,1]))`,
    java: `import java.util.*;\n\npublic class Solution {\n    public boolean containsDuplicate(int[] nums) {\n        // Your solution here\n        return false;\n    }\n\n    public static void main(String[] args) {\n        Solution sol = new Solution();\n        System.out.println(sol.containsDuplicate(new int[]{1,2,3,1}));\n    }\n}`,
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool containsDuplicate(vector<int>& nums) {\n        // Your solution here\n        return false;\n    }\n};\n\nint main() {\n    Solution sol;\n    vector<int> nums = {1,2,3,1};\n    cout << sol.containsDuplicate(nums) << endl;\n    return 0;\n}`
  },
  11: {
    javascript: `function maxProfit(prices) {\n    // Your solution here\n    \n}`,
    python: `class Solution:\n    def max_profit(self, prices: list[int]) -> int:\n        # Your solution here\n        pass\n\nsol = Solution()\nprint(sol.max_profit([7,1,5,3,6,4]))`,
    java: `public class Solution {\n    public int maxProfit(int[] prices) {\n        // Your solution here\n        return 0;\n    }\n\n    public static void main(String[] args) {\n        Solution sol = new Solution();\n        System.out.println(sol.maxProfit(new int[]{7,1,5,3,6,4}));\n    }\n}`,
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int maxProfit(vector<int>& prices) {\n        // Your solution here\n        return 0;\n    }\n};\n\nint main() {\n    Solution sol;\n    vector<int> prices = {7,1,5,3,6,4};\n    cout << sol.maxProfit(prices) << endl;\n    return 0;\n}`
  },
  12: {
    javascript: `function isAnagram(s, t) {\n    // Your solution here\n    \n}`,
    python: `class Solution:\n    def is_anagram(self, s: str, t: str) -> bool:\n        # Your solution here\n        pass\n\nsol = Solution()\nprint(sol.is_anagram("anagram", "nagaram"))`,
    java: `public class Solution {\n    public boolean isAnagram(String s, String t) {\n        // Your solution here\n        return false;\n    }\n\n    public static void main(String[] args) {\n        Solution sol = new Solution();\n        System.out.println(sol.isAnagram("anagram", "nagaram"));\n    }\n}`,
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool isAnagram(string s, string t) {\n        // Your solution here\n        return false;\n    }\n};\n\nint main() {\n    Solution sol;\n    cout << sol.isAnagram("anagram", "nagaram") << endl;\n    return 0;\n}`
  },
  13: {
    javascript: `function threeSum(nums) {\n    // Your solution here\n    \n}`,
    python: `class Solution:\n    def three_sum(self, nums: list[int]) -> list[list[int]]:\n        # Your solution here\n        pass\n\nsol = Solution()\nprint(sol.three_sum([-1,0,1,2,-1,-4]))`,
    java: `import java.util.*;\n\npublic class Solution {\n    public List<List<Integer>> threeSum(int[] nums) {\n        // Your solution here\n        return new ArrayList<>();\n    }\n\n    public static void main(String[] args) {\n        Solution sol = new Solution();\n        System.out.println(sol.threeSum(new int[]{-1,0,1,2,-1,-4}));\n    }\n}`,
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<vector<int>> threeSum(vector<int>& nums) {\n        // Your solution here\n        return {};\n    }\n};\n\nint main() {\n    Solution sol;\n    vector<int> nums = {-1,0,1,2,-1,-4};\n    auto res = sol.threeSum(nums);\n    for (auto& v : res) { for (int x : v) cout << x << " "; cout << endl; }\n    return 0;\n}`
  },
  14: {
    javascript: `function productExceptSelf(nums) {\n    // Your solution here\n    \n}`,
    python: `class Solution:\n    def product_except_self(self, nums: list[int]) -> list[int]:\n        # Your solution here\n        pass\n\nsol = Solution()\nprint(sol.product_except_self([1,2,3,4]))`,
    java: `import java.util.*;\n\npublic class Solution {\n    public int[] productExceptSelf(int[] nums) {\n        // Your solution here\n        return new int[]{};\n    }\n\n    public static void main(String[] args) {\n        Solution sol = new Solution();\n        System.out.println(Arrays.toString(sol.productExceptSelf(new int[]{1,2,3,4})));\n    }\n}`,
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> productExceptSelf(vector<int>& nums) {\n        // Your solution here\n        return {};\n    }\n};\n\nint main() {\n    Solution sol;\n    vector<int> nums = {1,2,3,4};\n    vector<int> res = sol.productExceptSelf(nums);\n    for (int x : res) cout << x << " ";\n    return 0;\n}`
  },
  15: {
    javascript: `function search(nums, target) {\n    // Your solution here\n    \n}`,
    python: `class Solution:\n    def search(self, nums: list[int], target: int) -> int:\n        # Your solution here\n        pass\n\nsol = Solution()\nprint(sol.search([-1,0,3,5,9,12], 9))`,
    java: `public class Solution {\n    public int search(int[] nums, int target) {\n        // Your solution here\n        return -1;\n    }\n\n    public static void main(String[] args) {\n        Solution sol = new Solution();\n        System.out.println(sol.search(new int[]{-1,0,3,5,9,12}, 9));\n    }\n}`,
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int search(vector<int>& nums, int target) {\n        // Your solution here\n        return -1;\n    }\n};\n\nint main() {\n    Solution sol;\n    vector<int> nums = {-1,0,3,5,9,12};\n    cout << sol.search(nums, 9) << endl;\n    return 0;\n}`
  },
  16: {
    javascript: `function numIslands(grid) {\n    // Your solution here\n    \n}`,
    python: `class Solution:\n    def num_islands(self, grid: list[list[str]]) -> int:\n        # Your solution here\n        pass\n\nsol = Solution()\ngrid = [["1","1","0"],["0","1","0"],["0","0","1"]]\nprint(sol.num_islands(grid))`,
    java: `public class Solution {\n    public int numIslands(char[][] grid) {\n        // Your solution here\n        return 0;\n    }\n\n    public static void main(String[] args) {\n        Solution sol = new Solution();\n        char[][] grid = {{'1','1','0'},{'0','1','0'},{'0','0','1'}};\n        System.out.println(sol.numIslands(grid));\n    }\n}`,
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int numIslands(vector<vector<char>>& grid) {\n        // Your solution here\n        return 0;\n    }\n};\n\nint main() {\n    Solution sol;\n    vector<vector<char>> grid = {{'1','1','0'},{'0','1','0'},{'0','0','1'}};\n    cout << sol.numIslands(grid) << endl;\n    return 0;\n}`
  },
  17: {
    javascript: `function coinChange(coins, amount) {\n    // Your solution here\n    \n}`,
    python: `class Solution:\n    def coin_change(self, coins: list[int], amount: int) -> int:\n        # Your solution here\n        pass\n\nsol = Solution()\nprint(sol.coin_change([1,5,11], 15))`,
    java: `public class Solution {\n    public int coinChange(int[] coins, int amount) {\n        // Your solution here\n        return -1;\n    }\n\n    public static void main(String[] args) {\n        Solution sol = new Solution();\n        System.out.println(sol.coinChange(new int[]{1,5,11}, 15));\n    }\n}`,
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int coinChange(vector<int>& coins, int amount) {\n        // Your solution here\n        return -1;\n    }\n};\n\nint main() {\n    Solution sol;\n    vector<int> coins = {1,5,11};\n    cout << sol.coinChange(coins, 15) << endl;\n    return 0;\n}`
  },
  18: {
    javascript: `function groupAnagrams(strs) {\n    // Your solution here\n    \n}`,
    python: `class Solution:\n    def group_anagrams(self, strs: list[str]) -> list[list[str]]:\n        # Your solution here\n        pass\n\nsol = Solution()\nprint(sol.group_anagrams(["eat","tea","tan","ate","nat","bat"]))`,
    java: `import java.util.*;\n\npublic class Solution {\n    public List<List<String>> groupAnagrams(String[] strs) {\n        // Your solution here\n        return new ArrayList<>();\n    }\n\n    public static void main(String[] args) {\n        Solution sol = new Solution();\n        System.out.println(sol.groupAnagrams(new String[]{"eat","tea","tan","ate","nat","bat"}));\n    }\n}`,
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<vector<string>> groupAnagrams(vector<string>& strs) {\n        // Your solution here\n        return {};\n    }\n};\n\nint main() {\n    Solution sol;\n    vector<string> strs = {"eat","tea","tan","ate","nat","bat"};\n    auto res = sol.groupAnagrams(strs);\n    for (auto& v : res) { for (auto& s : v) cout << s << " "; cout << endl; }\n    return 0;\n}`
  },
  19: {
    javascript: `function trap(height) {\n    // Your solution here\n    \n}`,
    python: `class Solution:\n    def trap(self, height: list[int]) -> int:\n        # Your solution here\n        pass\n\nsol = Solution()\nprint(sol.trap([0,1,0,2,1,0,1,3,2,1,2,1]))`,
    java: `public class Solution {\n    public int trap(int[] height) {\n        // Your solution here\n        return 0;\n    }\n\n    public static void main(String[] args) {\n        Solution sol = new Solution();\n        System.out.println(sol.trap(new int[]{0,1,0,2,1,0,1,3,2,1,2,1}));\n    }\n}`,
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int trap(vector<int>& height) {\n        // Your solution here\n        return 0;\n    }\n};\n\nint main() {\n    Solution sol;\n    vector<int> height = {0,1,0,2,1,0,1,3,2,1,2,1};\n    cout << sol.trap(height) << endl;\n    return 0;\n}`
  },
  20: {
    javascript: `function findMedianSortedArrays(nums1, nums2) {\n    // Your solution here\n    \n}`,
    python: `class Solution:\n    def find_median_sorted_arrays(self, nums1: list[int], nums2: list[int]) -> float:\n        # Your solution here\n        pass\n\nsol = Solution()\nprint(sol.find_median_sorted_arrays([1,3], [2]))`,
    java: `public class Solution {\n    public double findMedianSortedArrays(int[] nums1, int[] nums2) {\n        // Your solution here\n        return 0.0;\n    }\n\n    public static void main(String[] args) {\n        Solution sol = new Solution();\n        System.out.println(sol.findMedianSortedArrays(new int[]{1,3}, new int[]{2}));\n    }\n}`,
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {\n        // Your solution here\n        return 0.0;\n    }\n};\n\nint main() {\n    Solution sol;\n    vector<int> nums1 = {1,3}, nums2 = {2};\n    cout << sol.findMedianSortedArrays(nums1, nums2) << endl;\n    return 0;\n}`
  },
  21: {
    javascript: `function wordBreak(s, wordDict) {\n    // Your solution here\n    \n}`,
    python: `class Solution:\n    def word_break(self, s: str, word_dict: list[str]) -> bool:\n        # Your solution here\n        pass\n\nsol = Solution()\nprint(sol.word_break("leetcode", ["leet","code"]))`,
    java: `import java.util.*;\n\npublic class Solution {\n    public boolean wordBreak(String s, List<String> wordDict) {\n        // Your solution here\n        return false;\n    }\n\n    public static void main(String[] args) {\n        Solution sol = new Solution();\n        System.out.println(sol.wordBreak("leetcode", Arrays.asList("leet","code")));\n    }\n}`,
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool wordBreak(string s, vector<string>& wordDict) {\n        // Your solution here\n        return false;\n    }\n};\n\nint main() {\n    Solution sol;\n    vector<string> dict = {"leet","code"};\n    cout << sol.wordBreak("leetcode", dict) << endl;\n    return 0;\n}`
  },
  22: {
    javascript: `function longestPalindrome(s) {\n    // Your solution here\n    \n}`,
    python: `class Solution:\n    def longest_palindrome(self, s: str) -> str:\n        # Your solution here\n        pass\n\nsol = Solution()\nprint(sol.longest_palindrome("babad"))`,
    java: `public class Solution {\n    public String longestPalindrome(String s) {\n        // Your solution here\n        return "";\n    }\n\n    public static void main(String[] args) {\n        Solution sol = new Solution();\n        System.out.println(sol.longestPalindrome("babad"));\n    }\n}`,
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    string longestPalindrome(string s) {\n        // Your solution here\n        return "";\n    }\n};\n\nint main() {\n    Solution sol;\n    cout << sol.longestPalindrome("babad") << endl;\n    return 0;\n}`
  }
};

function getStarterCode(questionId, lang) {
  const t = starterTemplates[questionId];
  return t ? (t[lang] || t['javascript']) : '// Your solution here\n';
}

function onLangChange() {
  if (!state.currentQuestion) return;
  const lang = document.getElementById('lang-select').value;
  const currentCode = cmEditor ? cmEditor.getValue().trim() : document.getElementById('code-editor').value.trim();
  const templates = starterTemplates[state.currentQuestion.id] || {};
  const isStillStarter = Object.values(templates).some(t => currentCode === t.trim()) || currentCode === '';

  const wasProctoring = state.proctoringActive;
  state.proctoringActive = false;

  if (isStillStarter) {
    const code = getStarterCode(state.currentQuestion.id, lang);
    if (cmEditor) {
      cmEditor.setValue(code);
      cmEditor.setOption('mode', getLangMode(lang));
    } else {
      document.getElementById('code-editor').value = code;
    }
    updateCharCount();
  } else {
    if (confirm(`Switch to ${lang.toUpperCase()} template? Your code will be replaced.`)) {
      const code = getStarterCode(state.currentQuestion.id, lang);
      if (cmEditor) {
        cmEditor.setValue(code);
        cmEditor.setOption('mode', getLangMode(lang));
      } else {
        document.getElementById('code-editor').value = code;
      }
      updateCharCount();
    } else {
      document.getElementById('lang-select').value = state.currentLang;
      setTimeout(() => { state.proctoringActive = wasProctoring; }, 500);
      return;
    }
  }
  state.currentLang = lang;

  setTimeout(() => {
    state.proctoringActive = wasProctoring;
    if (wasProctoring && !document.fullscreenElement) {
      try { document.documentElement.requestFullscreen(); } catch(e) {}
    }
  }, 800);
}

async function toggleCamera() {
  if (state.cameraOn) {
    stopCamera();
  } else {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      state.cameraStream = stream; state.cameraOn = true;
      const video = document.getElementById('candidate-video');
      video.srcObject = stream; video.classList.add('active');
      document.getElementById('video-placeholder').classList.add('hidden');
      document.getElementById('cam-btn').classList.replace('off', 'on');
      document.getElementById('cam-icon').textContent = '📷';
      document.getElementById('cam-label').textContent = 'Cam On';
    } catch (err) { alert('Camera access denied. Please allow camera in your browser settings.'); }
  }
}

function stopCamera() {
  if (state.cameraStream) { state.cameraStream.getTracks().forEach(t => t.stop()); state.cameraStream = null; }
  state.cameraOn = false;
  const video = document.getElementById('candidate-video');
  video.srcObject = null; video.classList.remove('active');
  document.getElementById('video-placeholder').classList.remove('hidden');
  const btn = document.getElementById('cam-btn');
  btn.classList.remove('on'); btn.classList.add('off');
  document.getElementById('cam-icon').textContent = '📷';
  document.getElementById('cam-label').textContent = 'Cam Off';
}

async function toggleMic() {
  if (state.micOn) {
    stopMic();
  } else {
    try {
      let stream = null;

      // Try reusing setup stream first
      if (state.setupMicStream) {
        const tracks = state.setupMicStream.getTracks();
        if (tracks.length > 0 && tracks.every(t => t.readyState === 'live')) {
          stream = state.setupMicStream;
          state.setupMicStream = null;
          console.log('Reusing setup mic stream');
        } else {
          // Setup stream expired — request fresh
          state.setupMicStream = null;
        }
      }

      // Request fresh stream if needed
      if (!stream) {
        console.log('Requesting fresh mic stream');
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      state.micStream = stream;
      state.micOn = true;
      document.getElementById('mic-btn').classList.replace('off', 'on');
      document.getElementById('mic-icon').textContent = '🎙️';
      document.getElementById('mic-label').textContent = 'Mic On';
      document.getElementById('mic-indicator').classList.add('active');
      startSpeechRecognition();
      console.log('✅ Mic started successfully');
    } catch (err) {
      console.error('Mic error:', err.name, err.message);
      if (err.name === 'NotFoundError') {
        alert('No microphone detected. You can still use text chat to communicate with Alex.');
      } else {
        alert('Microphone access denied. Please allow microphone access in browser settings.');
      }
    }
  }
}

function stopMic() {
  if (state.micStream) { state.micStream.getTracks().forEach(t => t.stop()); state.micStream = null; }
  state.micOn = false;

  // Stop speech recognition
  if (state.recognition) {
    state.recognition.onresult = null;
    state.recognition.onend = null;
    state.recognition.onerror = null;
    try { state.recognition.stop(); } catch(e) {}
    state.recognition = null;
  }

  // Stop any ongoing speech
  if (window.speechSynthesis) window.speechSynthesis.cancel();

  const btn = document.getElementById('mic-btn');
  btn.classList.remove('on'); btn.classList.add('off');
  document.getElementById('mic-icon').textContent = '🎙️';
  document.getElementById('mic-label').textContent = 'Mic Off';
  document.getElementById('mic-indicator').classList.remove('active');
}

function stopAllAI() {
  // 1. Stop speech immediately and clear queue
  clearSpeechQueue();
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    window.speechSynthesis.cancel();
  }

  // 2. Kill speech recognition completely
  if (state.recognition) {
    state.recognition.onresult = null;
    state.recognition.onend = null;
    state.recognition.onerror = null;
    state.recognition.onstart = null;
    try { state.recognition.abort(); } catch(e) {}
    try { state.recognition.stop(); } catch(e) {}
    state.recognition = null;
  }

  // 3. Stop all auto analysis intervals
  stopAutoAnalysis();

  // 4. Clear all pending flags
  state.pendingSpeak = false;
  state.alexSpeaking = false;
  state.interviewerTyping = false;

  // 5. Reset UI
  setSpeakingAnimation(false);
  setInterviewerStatus('Ended', 'yellow');
}


// Stop everything if user closes tab, refreshes, or navigates away
window.addEventListener('beforeunload', () => {
  stopAllAI();
  stopCamera();
  stopMic();
  stopProctoring();
});

// Also stop if page becomes hidden (Alt+Tab to another app, phone lock screen etc.)
document.addEventListener('visibilitychange', () => {
  if (document.hidden && !state.proctoringActive) {
    // Not in interview — just stop speech if any
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }
});



let _recognitionStarting = false;

function startSpeechRecognition() {
  console.log('🎧 startSpeechRecognition called, micOn:', state.micOn);

  // Hard guard — prevent rapid repeated calls
  if (_recognitionStarting) {
    console.log('⚠️ Recognition already starting, skipping');
    return;
  }

  // Speech recognition requires page focus — retry if not focused
  if (!document.hasFocus()) {
    console.log('⏳ Page not focused, retrying in 1s...');
    setTimeout(() => startSpeechRecognition(), 1000);
    return;
  }
  _recognitionStarting = true;
  setTimeout(() => { _recognitionStarting = false; }, 1000);

  // Prevent multiple instances running at once
  if (state.recognition) {
    try { state.recognition.abort(); } catch(e) {}
    state.recognition = null;
  }


  // Check browser support
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    addAIMessage("Sorry, your browser doesn't support speech recognition. Try Chrome or Edge.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;       // keep listening
  recognition.interimResults = true;   // show partial results live
  recognition.lang = 'en-US';

  state.recognition = recognition;
  let finalTranscript = '';
  let silenceTimer = null;

  recognition.onstart = () => {
    console.log('✅ Speech recognition started — listening!');
    if (!state.hasShownListeningMsg) {
      state.hasShownListeningMsg = true;
      addAIMessage("🎙️ I'm listening! Speak your question or thought and I'll respond.");
    }
  };

  recognition.onresult = (event) => {
    // Ignore all input while Alex is speaking — it's just picking up Alex's voice
    if (state.alexSpeaking) return;
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }

    // Show live transcript in the input box so user can see what's being heard
    const input = document.getElementById('speak-input');
    input.value = (finalTranscript + interimTranscript).trim();

    // Auto-send after 2 seconds of silence — but ONLY if Alex is not speaking
    if (finalTranscript.trim()) {
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        const spokenText = finalTranscript.trim();
        if (spokenText) {
          finalTranscript = '';
          input.value = '';
          if (!state.alexSpeaking) {
            console.log('📨 Sending spoken text:', spokenText);
            sendMessage(spokenText, false);
          } else {
            console.log('🚫 Discarding — Alex speaking');
          }
        }
      }, 2000);
    }
  };

  recognition.onerror = (event) => {
    if (event.error === 'no-speech') return; // ignore silence
    if (event.error === 'aborted') return;   // ignore manual stop
    console.error('Speech recognition error:', event.error);
  };

  recognition.onend = () => {
    if (state.micOn && state.recognition === recognition && !state.alexSpeaking) {
      setTimeout(() => {
        if (state.micOn && state.recognition === recognition) {
          try { recognition.start(); } catch(e) {}
        }
      }, 500);
    }
  };

  recognition.start();
}

function askInterviewer() {
  sendMessage("Can you ask me a follow-up question about my current approach?", true);
}

function sendToInterviewer() {
  const input = document.getElementById('speak-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  sendMessage(text, false);
}

function handleSpeakKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendToInterviewer(); }
}

async function sendMessage(userText, isAuto) {
  if (state.interviewerTyping) {
    console.log('⏳ interviewerTyping is true — queuing message');
    // Wait and retry once
    setTimeout(() => sendMessage(userText, isAuto), 2000);
    return;
  }
  if (!isAuto) addUserMessage(userText);
  state.chatHistory.push({ role: 'user', content: userText });
  state.interviewerTyping = true;
  setInterviewerStatus('Typing...', 'yellow');
  setSpeakingAnimation(true);
  const typingId = addTypingIndicator();
  try {
    const code = cmEditor ? cmEditor.getValue() : document.getElementById('code-editor').value;
    const res = await fetch('/api/interviewer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: state.currentQuestion, code, userMessage: userText, chatHistory: state.chatHistory.slice(-8) })
    });
    const data = await res.json();
    removeTypingIndicator(typingId);
    const reply = data.reply || data.error || 'Sorry, I had trouble responding.';
    addAIMessage(reply, state.micOn);
    state.chatHistory.push({ role: 'assistant', content: reply });
  } catch (err) {
    removeTypingIndicator(typingId);
    addAIMessage('Sorry, I lost connection. Please try again!');
  }
  state.interviewerTyping = false;
  state.alexSpeaking = false;
  setInterviewerStatus('Watching...', 'green');
  setSpeakingAnimation(false);
  // Restart mic after response
  if (state.micOn) {
    setTimeout(() => startSpeechRecognition(), 200);
  }
}

function addUserMessage(text) {
  const chatBox = document.getElementById('chat-box');
  const div = document.createElement('div');
  div.className = 'chat-msg user-msg';
  div.innerHTML = `<div class="chat-bubble">${escapeHtml(text)}</div>`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function addAIMessage(text, speak = false) {
  const chatBox = document.getElementById('chat-box');
  const div = document.createElement('div');
  div.className = 'chat-msg ai-msg';
  div.innerHTML = `<div class="chat-bubble">${escapeHtml(text)}</div>`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;

  if (speak) {
    state.pendingSpeak = false;
    setTimeout(() => speakAlexMessage(text), 50);
  }
}

// ═══════════════════════ SPEECH QUEUE ═══════════════════════
const speechQueue = [];
let isSpeakingFromQueue = false;

function queueSpeech(text, onDone) {
  // Don't add duplicate messages
  if (speechQueue.some(item => item.text === text)) return;
  speechQueue.push({ text, onDone });
  if (!isSpeakingFromQueue && !state.alexSpeaking) {
    processQueue();
  }
}

function processQueue() {
  if (speechQueue.length === 0) {
    isSpeakingFromQueue = false;
    state.alexSpeaking = false;
    setSpeakingAnimation(false);
    return;
  }
  if (state.alexSpeaking) return; // already speaking, will resume via onend

  isSpeakingFromQueue = true;
  const { text, onDone } = speechQueue.shift();

  _speakTextNow(text, () => {
    if (onDone) onDone();
    isSpeakingFromQueue = false;
    // Small gap between messages
    setTimeout(() => {
      if (speechQueue.length > 0) processQueue();
      else {
        state.alexSpeaking = false;
        setSpeakingAnimation(false);
      }
    }, 400);
  });
}

function clearSpeechQueue() {
  speechQueue.length = 0;
  isSpeakingFromQueue = false;
  state.alexSpeaking = false;
}

// Internal: actually speaks one piece of text, chunk by chunk
function _speakTextNow(text, onComplete) {
  if (!window.speechSynthesis) { if (onComplete) onComplete(); return; }

  window.speechSynthesis.cancel();
  text = cleanForSpeech(text);
  const chunks = splitIntoChunks(text);
  let index = 0;
  let cancelled = false;

  state.alexSpeaking = true;
  setSpeakingAnimation(true);

  // Pause mic while speaking
  if (state.recognition) {
    try { state.recognition.abort(); } catch(e) {}
  }

  function getVoice() {
    const voices = window.speechSynthesis.getVoices();
    return voices.find(v =>
      v.name.includes('Google UK English Male') ||
      v.name.includes('Google US English') ||
      v.name.includes('Microsoft Ryan') ||
      v.name.includes('Microsoft Guy') ||
      v.name.includes('Daniel') ||
      v.name.includes('Alex')
    ) || voices.find(v => v.lang === 'en-US' || v.lang === 'en-GB') || null;
  }

  function speakChunk() {
    if (cancelled || index >= chunks.length) {
      if (!cancelled) {
        state.alexSpeaking = false;
        setSpeakingAnimation(false);
        // Kill the stale recognition instance so startSpeechRecognition starts clean
        if (state.recognition) {
          state.recognition.onend = null;
          state.recognition.onresult = null;
          state.recognition.onerror = null;
          try { state.recognition.abort(); } catch(e) {}
          state.recognition = null;
        }
        if (onComplete) onComplete();
        // Restart mic after Alex finishes speaking
        if (state.micOn) {
          setTimeout(() => startSpeechRecognition(), 300);
        }
      }
      return;
    }

    const chunk = chunks[index].trim();
    if (!chunk) { index++; speakChunk(); return; }

    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.rate = 1.15;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    const voice = getVoice();
    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      if (cancelled) return;
      index++;
      setTimeout(speakChunk, 80);
    };

    utterance.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') {
        cancelled = true;
        return;
      }
      console.warn('TTS chunk error:', e.error);
      index++;
      setTimeout(speakChunk, 80);
    };

    window.speechSynthesis.speak(utterance);
  }

  setTimeout(speakChunk, 150);
}

function speakNow(text, onComplete) {
  // Cancel everything and speak immediately (used for intro)
  clearSpeechQueue();
  window.speechSynthesis.cancel();
  // Longer delay on intro to let any in-flight utterances fully cancel
  // before starting — prevents the chunk loop from replaying
  setTimeout(() => {
    window.speechSynthesis.cancel(); // second cancel to be sure
    _speakTextNow(text, onComplete);
  }, 500);
}

function speakAlexMessage(text) {
  if (!window.speechSynthesis) return;

  function doQueue() {
    queueSpeech(text, null); // SR restart is handled inside _speakTextNow's onComplete
  }

  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.addEventListener('voiceschanged', doQueue, { once: true });
  } else {
    doQueue();
  }
}

function speakText(text) {
  // Legacy alias — just queue it
  speakAlexMessage(text);
}


function addTypingIndicator() {
  const chatBox = document.getElementById('chat-box');
  const id = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.className = 'chat-msg ai-msg chat-typing';
  div.id = id;
  div.innerHTML = `<div class="chat-bubble"><span class="dot-anim"></span></div>`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
  return id;
}

function removeTypingIndicator(id) { const el = document.getElementById(id); if (el) el.remove(); }

function setInterviewerStatus(text, color) {
  document.getElementById('interviewer-status').innerHTML = `<span class="status-dot ${color}"></span> ${text}`;
}

function setSpeakingAnimation(active) {
  document.getElementById('avatar-ring').classList.toggle('speaking', active);
  document.getElementById('speaking-bars').classList.toggle('active', active);
}

function escapeHtml(text) {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

async function requestHint(level) {
  const btn = document.getElementById(`hint-btn-${level}`);
  const hintDisplay = document.getElementById('hint-display');
  btn.textContent = '⏳ Getting hint...'; btn.classList.add('used'); btn.disabled = true;
  try {
    const code = cmEditor ? cmEditor.getValue() : document.getElementById('code-editor').value;
    const res = await fetch('/api/hint', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: state.currentQuestion, code, hintLevel: level })
    });
    const data = await res.json();
    hintDisplay.textContent = data.error ? '⚠️ ' + data.error : `💡 Hint ${level}: ${data.hint}`;
    hintDisplay.classList.remove('hidden');
    state.hintsUsed = level;
    const next = document.getElementById(`hint-btn-${level + 1}`);
    if (next) next.style.display = 'inline-block';
    btn.textContent = `✓ Hint ${level} used`;
  } catch (err) {
    hintDisplay.textContent = '⚠️ Failed to get hint. Check your API key.';
    hintDisplay.classList.remove('hidden');
    btn.textContent = `💡 Hint ${level}`; btn.disabled = false;
  }
}

async function submitSolution() {
  const code = (cmEditor ? cmEditor.getValue() : document.getElementById('code-editor').value).trim();
  const language = document.getElementById('lang-select').value;
  state.lastSubmittedCode = code;
  state.lastSubmittedLang = language;
  const currentStarter = getStarterCode(state.currentQuestion.id, language).trim();
  if (!code || code === currentStarter) { alert('Please write some code before submitting!'); return; }
  stopTimer();
  stopProctoring();
  stopAllAI();
  stopCamera();
  stopMic();
  exitFullscreen();
  const timeTaken = state.timeTaken;
  addAIMessage("Okay! Let me review your solution...");
  showLoading(true);
  try {
    const res = await fetch('/api/evaluate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: state.currentQuestion, code, language, timeTaken })
    });
    const data = await res.json();
    showLoading(false);
    if (data.error) { alert('Evaluation error: ' + data.error); return; }
    stopCamera(); stopMic();
    displayResults(data.evaluation, timeTaken);
  } catch (err) { showLoading(false); alert('Failed to evaluate: ' + err.message); }
}

function displayResults(ev, timeTaken) {
  const badge = document.getElementById('verdict-badge');
  const verdict = ev.verdict || 'Evaluated';
  badge.textContent = verdict; badge.className = 'verdict-badge';
  if (verdict === 'Accepted') badge.classList.add('accepted');
  else if (verdict === 'Wrong Answer') badge.classList.add('wrong');
  else badge.classList.add('incomplete');
  document.getElementById('result-title').textContent = state.currentQuestion.title;
  document.getElementById('result-summary').textContent = ev.summary || '';
  const score = ev.score || 0;
  document.getElementById('score-num').textContent = score;
  setTimeout(() => { document.getElementById('score-ring-fill').style.strokeDashoffset = 314 - (score/100)*314; }, 100);
  setBar('bar-correct','val-correct', ev.correctness||0);
  setBar('bar-efficiency','val-efficiency', ev.efficiency||0);
  setBar('bar-quality','val-quality', ev.codeQuality||0);
  document.getElementById('time-complexity').textContent = ev.timeComplexity || 'N/A';
  document.getElementById('space-complexity').textContent = ev.spaceComplexity || 'N/A';
  document.getElementById('strengths-list').innerHTML = (ev.strengths||[]).map(s=>`<li>✅ ${s}</li>`).join('');
  document.getElementById('improvements-list').innerHTML = (ev.improvements||[]).map(i=>`<li>🔧 ${i}</li>`).join('');
  document.getElementById('optimal-approach').textContent = ev.optimalApproach || '';
  const optCode = document.getElementById('optimal-code');
  optCode.textContent = ev.sampleOptimalCode || ''; optCode.classList.add('hidden');
  document.getElementById('toggle-optimal-btn').textContent = 'Show Code';
  showScreen('screen-results');
}

function setBar(barId, valId, val) {
  setTimeout(() => { document.getElementById(barId).style.width = val+'%'; document.getElementById(valId).textContent = val+'%'; }, 300);
}

function toggleOptimal() {
  const code = document.getElementById('optimal-code');
  const btn = document.getElementById('toggle-optimal-btn');
  code.classList.toggle('hidden');
  btn.textContent = code.classList.contains('hidden') ? 'Show Code' : 'Hide Code';
}

function retryQuestion() {
  if (!state.currentQuestion) return;
  startQuestion(state.currentQuestion);
  // Restore last submitted code and language after startQuestion resets everything
  setTimeout(() => {
    if (state.lastSubmittedCode) {
      const lang = state.lastSubmittedLang || 'javascript';
      document.getElementById('lang-select').value = lang;
      state.currentLang = lang;
      if (cmEditor) {
        cmEditor.setValue(state.lastSubmittedCode);
        cmEditor.setOption('mode', getLangMode(lang));
      } else {
        document.getElementById('code-editor').value = state.lastSubmittedCode;
      }
      updateCharCount();
    }
  }, 100);
}

function showLoading(show) { document.getElementById('loading-overlay').classList.toggle('hidden', !show); }
