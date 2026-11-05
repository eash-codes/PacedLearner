import React, { useState, useEffect, useRef, useCallback } from 'react';
import BloubAvatar from './BloubAvatar.jsx';
import {
  speakWithVoiceStudio,
  stopPaceyAudio,
  startWavMicRecorder
} from '../bot/voiceStudioClient.js';

const API_BASE = 'http://localhost:4100/api';

const DEFAULT_TEMPLATES = {
  python: 'def solution(nums, target):\n    # TODO: Implement optimal solution\n    pass\n',
  javascript: 'function solution(nums, target) {\n  // TODO: Implement optimal solution\n}\n',
  cpp: 'class Solution {\npublic:\n    vector<int> solution(vector<int>& nums, int target) {\n        // TODO\n    }\n};\n'
};

export default function InterrogationRoom({
  allProblems = [],
  dueProblems = [],
  initialProblem = null,
  onFinishInterview,
  onBackToReviews
}) {
  // Problem State
  const [selectedProblem, setSelectedProblem] = useState(() => {
    return initialProblem || dueProblems[0] || allProblems[0] || {
      id: 'two-sum',
      title: 'Two Sum',
      difficulty: 'Easy',
      topic: 'Array / Hash Table',
      description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume each input would have exactly one solution, and you may not use the same element twice.',
      examples: [
        { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' },
        { input: 'nums = [3,2,4], target = 6', output: '[1,2]' }
      ]
    };
  });

  // Interview Phase: 'INTUITION' | 'IMPLEMENTATION' | 'CROSS_EXAMINATION' | 'DEBRIEF'
  const [phase, setPhase] = useState('INTUITION');
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(() => {
    return selectedProblem?.codeSnippet || DEFAULT_TEMPLATES.python;
  });

  // Timer & Silence Tracking
  const [secondsRemaining, setSecondsRemaining] = useState(25 * 60); // 25 min default
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [silenceSeconds, setSilenceSeconds] = useState(0);
  const [silenceCount, setSilenceCount] = useState(0);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);

  // Audio & Avatar State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMicRecording, setIsMicRecording] = useState(false);
  const [isProcessingStep, setIsProcessingStep] = useState(false);
  const [handsFreeMic, setHandsFreeMic] = useState(true);
  const [muteAudio, setMuteAudio] = useState(false);
  const [expression, setExpression] = useState('colere');
  const [botState, setBotState] = useState('alert');

  // Interrogation Dialogue History
  const [transcript, setTranscript] = useState([
    {
      role: 'assistant',
      content: 'WELCOME TO YOUR WORST NIGHTMARE. I am your Staff Bar-Raiser. Explain your high-level algorithmic intuition and target Big-O complexity OUT LOUD right now. Do not touch your code until you defend your approach.',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);

  // Code Telemetry
  const [codeSmells, setCodeSmells] = useState([]);
  const [lastAnalyzedCode, setLastAnalyzedCode] = useState('');

  // Final Verdict Modal
  const [scorecard, setScorecard] = useState(null);
  const [isGeneratingVerdict, setIsGeneratingVerdict] = useState(false);
  const [showScorecardModal, setShowScorecardModal] = useState(false);

  // Spoken text input fallback
  const [manualSpeechInput, setManualSpeechInput] = useState('');

  // Refs
  const micRecorderRef = useRef(null);
  const transcriptBottomRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const silenceIntervalRef = useRef(null);
  const lastActivityAtRef = useRef(Date.now());
  const isInterrogatingRef = useRef(false);

  // Scroll transcript to bottom
  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Sync selected problem when initialProblem prop changes
  useEffect(() => {
    if (initialProblem && initialProblem.id !== selectedProblem?.id) {
      setSelectedProblem(initialProblem);
      setCode(initialProblem.codeSnippet || DEFAULT_TEMPLATES[language] || DEFAULT_TEMPLATES.python);
    }
  }, [initialProblem, language, selectedProblem?.id]);

  // Speak Pacey text aloud
  const speakText = useCallback(async (text, expr = 'colere', state = 'exclaim') => {
    if (muteAudio || !text) return;
    setExpression(expr);
    setBotState(state);
    setIsSpeaking(true);

    await speakWithVoiceStudio(text, {
      onStart: () => {
        setIsSpeaking(true);
        setBotState('orbit');
      },
      onEnd: () => {
        setIsSpeaking(false);
        setBotState('idle');
      },
      onError: () => {
        setIsSpeaking(false);
        setBotState('idle');
      }
    });
  }, [muteAudio]);

  // Execute an Interrogation Step
  const triggerInterrogationStep = useCallback(async ({
    trigger = 'user_spoke',
    userSpeech = '',
    customPhase = null
  }) => {
    if (isInterrogatingRef.current) return;
    isInterrogatingRef.current = true;
    setIsProcessingStep(true);

    const activePhase = customPhase || phase;

    try {
      const res = await fetch(`${API_BASE}/pacey/interrogate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: selectedProblem,
          code,
          language,
          phase: activePhase,
          trigger,
          userSpeech,
          silenceSeconds,
          history: transcript.slice(-6)
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        // Append Pacey's response to transcript
        setTranscript(prev => [
          ...prev,
          {
            role: 'assistant',
            content: data.reply,
            timestamp: new Date().toLocaleTimeString()
          }
        ]);

        if (data.phase && data.phase !== phase) {
          setPhase(data.phase);
        }

        if (Array.isArray(data.codeSmells)) {
          setCodeSmells(data.codeSmells);
        }

        // Reset silence counter
        setSilenceSeconds(0);
        lastActivityAtRef.current = Date.now();

        // Speak aloud
        await speakText(data.speechText || data.reply, data.expression, data.state);
      }
    } catch (err) {
      console.error('[Interrogation Step Error]:', err);
    } finally {
      setIsProcessingStep(false);
      isInterrogatingRef.current = false;
    }
  }, [code, language, phase, selectedProblem, silenceSeconds, speakText, transcript]);

  // Start the Interview
  const startInterview = useCallback(() => {
    setIsTimerRunning(true);
    setSecondsRemaining(25 * 60);
    setSilenceSeconds(0);
    setTotalTimeSpent(0);
    setSilenceCount(0);
    setPhase('INTUITION');
    lastActivityAtRef.current = Date.now();

    const initialGreeting = `Candidate, you have 25 minutes for ${selectedProblem.title}. Before writing a single line of code, verbally explain your intuition, data structure choice, and target time and space complexity out loud. Go!`;
    
    setTranscript([
      {
        role: 'assistant',
        content: initialGreeting,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);

    speakText(initialGreeting, 'colere', 'alert');
  }, [selectedProblem, speakText]);

  // Timer Tick & Silence Detector (Every 1 second)
  useEffect(() => {
    if (!isTimerRunning) return;

    timerIntervalRef.current = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          handleConcludeInterview();
          return 0;
        }
        return prev - 1;
      });

      setTotalTimeSpent(prev => prev + 1);

      // Check silence duration
      const idleTime = Math.floor((Date.now() - lastActivityAtRef.current) / 1000);
      setSilenceSeconds(idleTime);

      // Trigger silence challenge if idle >= 35 seconds
      if (idleTime >= 35 && !isSpeaking && !isMicRecording && !isProcessingStep) {
        lastActivityAtRef.current = Date.now();
        setSilenceCount(c => c + 1);
        triggerInterrogationStep({
          trigger: 'silence_timeout',
          userSpeech: ''
        });
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning, isSpeaking, isMicRecording, isProcessingStep, triggerInterrogationStep]);

  // Live Code Smells Analyzer (debounced)
  useEffect(() => {
    if (phase !== 'IMPLEMENTATION' || code === lastAnalyzedCode || code.length < 30) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/pacey/interrogate/analyze-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, language })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.telemetry?.smells) {
            setCodeSmells(data.telemetry.smells);
            setLastAnalyzedCode(code);

            // If nested loop detected for first time, trigger interruption
            if (data.telemetry.hasNestedLoops && !isSpeaking && !isProcessingStep) {
              triggerInterrogationStep({
                trigger: 'code_smell',
                userSpeech: ''
              });
            }
          }
        }
      } catch (err) {}
    }, 3500);

    return () => clearTimeout(timer);
  }, [code, language, lastAnalyzedCode, phase, isSpeaking, isProcessingStep, triggerInterrogationStep]);

  // Code editor change handler
  const handleCodeChange = (e) => {
    setCode(e.target.value);
    lastActivityAtRef.current = Date.now();
    setSilenceSeconds(0);
  };

  // Keyboard navigation & tab indentation in textarea
  const handleKeyDown = (e) => {
    lastActivityAtRef.current = Date.now();
    setSilenceSeconds(0);

    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newCode);
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Start Mic Recording (Speech-to-Text)
  const handleStartRecording = async () => {
    stopPaceyAudio();
    setIsMicRecording(true);
    lastActivityAtRef.current = Date.now();
    setSilenceSeconds(0);

    try {
      const rec = await startWavMicRecorder();
      micRecorderRef.current = rec;
    } catch (err) {
      console.error('[Mic Error]:', err);
      setIsMicRecording(false);
      alert('Microphone access denied. You can type your response in the verbal input box below.');
    }
  };

  // Stop Mic Recording and send transcript
  const handleStopRecording = async () => {
    if (!micRecorderRef.current) {
      setIsMicRecording(false);
      return;
    }

    setIsMicRecording(false);
    setIsProcessingStep(true);

    try {
      const result = await micRecorderRef.current.stop();
      micRecorderRef.current = null;

      let recognizedSpeech = result.fallbackTranscript || '';

      // If base64 audio exists, try VoiceStudio /api/pacey/stt
      if (result.audioBase64) {
        try {
          const sttRes = await fetch(`${API_BASE}/pacey/stt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64: result.audioBase64 })
          });
          if (sttRes.ok) {
            const sttData = await sttRes.json();
            if (sttData.text && sttData.text.trim()) {
              recognizedSpeech = sttData.text.trim();
            }
          }
        } catch (e) {}
      }

      if (recognizedSpeech && recognizedSpeech.trim()) {
        // Append candidate response
        setTranscript(prev => [
          ...prev,
          {
            role: 'user',
            content: recognizedSpeech,
            timestamp: new Date().toLocaleTimeString()
          }
        ]);

        await triggerInterrogationStep({
          trigger: 'user_spoke',
          userSpeech: recognizedSpeech
        });
      } else {
        setIsProcessingStep(false);
      }
    } catch (err) {
      console.error('[STT Processing Error]:', err);
      setIsProcessingStep(false);
    }
  };

  // Submit typed verbal answer
  const handleSendManualSpeech = async (e) => {
    e.preventDefault();
    if (!manualSpeechInput.trim() || isProcessingStep) return;

    const speech = manualSpeechInput.trim();
    setManualSpeechInput('');
    lastActivityAtRef.current = Date.now();
    setSilenceSeconds(0);

    setTranscript(prev => [
      ...prev,
      {
        role: 'user',
        content: speech,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);

    await triggerInterrogationStep({
      trigger: 'user_spoke',
      userSpeech: speech
    });
  };

  // Submit code for cross-examination
  const handleSubmitCode = async () => {
    setPhase('CROSS_EXAMINATION');
    lastActivityAtRef.current = Date.now();
    setSilenceSeconds(0);

    setTranscript(prev => [
      ...prev,
      {
        role: 'user',
        content: `[SUBMITTED CODE FOR CROSS-EXAMINATION] My solution is complete. Here is my implementation for review.`,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);

    await triggerInterrogationStep({
      trigger: 'code_submitted',
      userSpeech: 'I have finished writing my solution and it is ready for cross-examination.',
      customPhase: 'CROSS_EXAMINATION'
    });
  };

  // Conclude Interview & Generate FAANG Scorecard
  const handleConcludeInterview = async () => {
    setIsTimerRunning(false);
    setIsGeneratingVerdict(true);
    setShowScorecardModal(true);

    try {
      const res = await fetch(`${API_BASE}/pacey/interrogate/verdict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: selectedProblem,
          code,
          language,
          transcript,
          timeSpentSeconds: totalTimeSpent,
          silenceCount
        })
      });

      if (res.ok) {
        const data = await res.json();
        setScorecard(data.scorecard);

        // Speak final verdict summary
        if (data.scorecard?.verdict) {
          const verdictText = `Verdict: ${data.scorecard.verdict}. ${data.scorecard.savageReview || ''}`;
          speakText(verdictText, data.scorecard.verdict.includes('HIRE') ? 'fier' : 'colere', 'burst');
        }
      }
    } catch (err) {
      console.error('[Verdict Error]:', err);
    } finally {
      setIsGeneratingVerdict(false);
    }
  };

  // Time formatter
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="interrogation-room" style={{
      maxWidth: '1440px',
      margin: '0 auto',
      padding: '24px',
      fontFamily: 'var(--font-sans)',
      color: 'var(--text)'
    }}>
      {/* Top Header Bar */}
      <div style={{
        border: '3px solid var(--border)',
        background: 'var(--bg)',
        padding: '16px 24px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Title and Problem Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <div style={{
              fontFamily: "'Archivo Black', sans-serif",
              fontSize: '22px',
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span>INTERROGATION ROOM</span>
              <span style={{
                background: 'var(--error)',
                color: '#FFFFFF',
                fontSize: '11px',
                fontFamily: "'Space Mono', monospace",
                padding: '2px 8px',
                border: '1px solid var(--border)'
              }}>
                LIVE L6 INTERVIEW
              </span>
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              INTERVIEWER: PACEY (STAFF BAR-RAISER // UNFILTERED)
            </div>
          </div>

          {/* Problem Selector Dropdown */}
          <select
            value={selectedProblem?.id || ''}
            onChange={(e) => {
              const found = allProblems.find(p => String(p.id) === e.target.value);
              if (found) {
                setSelectedProblem(found);
                setCode(found.codeSnippet || DEFAULT_TEMPLATES[language] || DEFAULT_TEMPLATES.python);
              }
            }}
            disabled={isTimerRunning}
            style={{
              padding: '6px 12px',
              fontFamily: "'Space Mono', monospace",
              fontSize: '12px',
              fontWeight: 700,
              border: '2px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
              cursor: isTimerRunning ? 'not-allowed' : 'pointer'
            }}
          >
            {allProblems.map(p => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.difficulty || 'Medium'})
              </option>
            ))}
          </select>
        </div>

        {/* Phase Indicator Pills */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {[
            { id: 'INTUITION', label: '1. INTUITION' },
            { id: 'IMPLEMENTATION', label: '2. CODE' },
            { id: 'CROSS_EXAMINATION', label: '3. CROSS-EXAM' }
          ].map(p => {
            const isActive = phase === p.id;
            return (
              <span
                key={p.id}
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  border: isActive ? '3px solid var(--border)' : '1px solid var(--border)',
                  background: isActive ? 'var(--text)' : 'transparent',
                  color: isActive ? 'var(--bg)' : 'var(--text)',
                  textTransform: 'uppercase'
                }}
              >
                {p.label}
              </span>
            );
          })}
        </div>

        {/* Timer & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Silence Indicator */}
          <div style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: '12px',
            padding: '4px 8px',
            border: silenceSeconds >= 25 ? '2px solid var(--error)' : '1px solid var(--border)',
            background: silenceSeconds >= 25 ? 'rgba(255,0,0,0.1)' : 'transparent',
            color: silenceSeconds >= 25 ? 'var(--error)' : 'var(--text)'
          }}>
            SILENCE: {silenceSeconds}s {silenceSeconds >= 30 ? '⚠️ DANGER' : ''}
          </div>

          {/* Countdown Clock */}
          <div style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: '18px',
            fontWeight: 700,
            padding: '4px 14px',
            border: '3px solid var(--border)',
            background: secondsRemaining <= 300 ? 'var(--error)' : 'var(--bg)',
            color: secondsRemaining <= 300 ? '#FFFFFF' : 'var(--text)'
          }}>
            ⏱ {formatTime(secondsRemaining)}
          </div>

          {!isTimerRunning ? (
            <button
              onClick={startInterview}
              style={{
                fontFamily: "'Archivo Black', sans-serif",
                fontSize: '13px',
                background: 'var(--text)',
                color: 'var(--bg)',
                border: '3px solid var(--border)',
                padding: '8px 16px',
                cursor: 'pointer',
                textTransform: 'uppercase'
              }}
            >
              START INTERVIEW
            </button>
          ) : (
            <button
              onClick={handleConcludeInterview}
              style={{
                fontFamily: "'Archivo Black', sans-serif",
                fontSize: '13px',
                background: 'var(--error)',
                color: '#FFFFFF',
                border: '3px solid var(--border)',
                padding: '8px 16px',
                cursor: 'pointer',
                textTransform: 'uppercase'
              }}
            >
              END & VERDICT
            </button>
          )}

          <button
            onClick={() => setMuteAudio(!muteAudio)}
            title={muteAudio ? 'Unmute Pacey Voice' : 'Mute Pacey Voice'}
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: '12px',
              padding: '8px 12px',
              border: '2px solid var(--border)',
              background: muteAudio ? 'var(--warning)' : 'var(--bg)',
              color: 'var(--text)',
              cursor: 'pointer'
            }}
          >
            {muteAudio ? '🔇 MUTED' : '🔊 VOICE ON'}
          </button>
        </div>
      </div>

      {/* Main Split Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(380px, 460px) 1fr',
        gap: '24px',
        minHeight: '680px'
      }}>
        {/* Left Column: Problem Brief + Pacey Interrogator Station */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Pacey Interrogator Live Dock */}
          <div style={{
            border: '4px solid var(--border)',
            background: 'var(--bg)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* 3D Bloub Avatar */}
              <div style={{
                width: '100px',
                height: '100px',
                border: '3px solid var(--border)',
                background: 'var(--bg-card, #FFFFFF)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <BloubAvatar
                  size={88}
                  expression={expression}
                  state={botState}
                  follow={true}
                  inverted={false}
                />
              </div>

              {/* Status and Telemetry */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: "'Archivo Black', sans-serif",
                  fontSize: '16px',
                  textTransform: 'uppercase',
                  color: isSpeaking ? 'var(--error)' : 'var(--text)'
                }}>
                  {isSpeaking ? 'PACEY IS SPEAKING...' : (isMicRecording ? 'LISTENING TO YOU...' : (isProcessingStep ? 'ANALYZING...' : 'WATCHING YOU...'))}
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', marginTop: '4px' }}>
                  MOOD: <strong>{expression.toUpperCase()}</strong> | STATE: <strong>{botState.toUpperCase()}</strong>
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  ENGINE: QWEN3.5-4B [MSI PC // TAILSCALE]
                </div>
              </div>
            </div>

            {/* Microphone Controls */}
            <div style={{
              display: 'flex',
              gap: '10px',
              borderTop: '2px solid var(--border)',
              paddingTop: '14px'
            }}>
              {!isMicRecording ? (
                <button
                  onClick={handleStartRecording}
                  disabled={isProcessingStep || isSpeaking}
                  style={{
                    flex: 1,
                    fontFamily: "'Archivo Black', sans-serif",
                    fontSize: '13px',
                    padding: '12px 16px',
                    border: '3px solid var(--border)',
                    background: 'var(--text)',
                    color: 'var(--bg)',
                    cursor: (isProcessingStep || isSpeaking) ? 'not-allowed' : 'pointer',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <span>🎙</span>
                  <span>SPEAK TO PACEY</span>
                </button>
              ) : (
                <button
                  onClick={handleStopRecording}
                  style={{
                    flex: 1,
                    fontFamily: "'Archivo Black', sans-serif",
                    fontSize: '13px',
                    padding: '12px 16px',
                    border: '3px solid var(--error)',
                    background: 'var(--error)',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    animation: 'pulse 1s infinite'
                  }}
                >
                  ⏹ FINISH SPEAKING & SEND
                </button>
              )}
            </div>

            {/* Fallback Text Input for Verbal Responses */}
            <form onSubmit={handleSendManualSpeech} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Or type what you would say out loud..."
                value={manualSpeechInput}
                onChange={(e) => setManualSpeechInput(e.target.value)}
                disabled={isProcessingStep}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  fontFamily: "'Space Mono', monospace",
                  fontSize: '11px',
                  border: '2px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)'
                }}
              />
              <button
                type="submit"
                disabled={!manualSpeechInput.trim() || isProcessingStep}
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '0 12px',
                  border: '2px solid var(--border)',
                  background: 'var(--text)',
                  color: 'var(--bg)',
                  cursor: 'pointer'
                }}
              >
                SEND
              </button>
            </form>
          </div>

          {/* Problem Brief & Constraints */}
          <div style={{
            border: '3px solid var(--border)',
            background: 'var(--bg)',
            padding: '20px',
            flex: 1,
            overflowY: 'auto',
            maxHeight: '380px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: '18px', margin: 0 }}>
                {selectedProblem?.title}
              </h3>
              <span style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                border: '1px solid var(--border)',
                background: selectedProblem?.difficulty === 'Hard' ? 'var(--error)' : (selectedProblem?.difficulty === 'Medium' ? 'var(--warning)' : 'var(--success)'),
                color: '#FFFFFF'
              }}>
                {selectedProblem?.difficulty || 'Medium'}
              </span>
            </div>

            <p style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '14px', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              {selectedProblem?.description}
            </p>

            {selectedProblem?.examples?.map((ex, idx) => (
              <div key={idx} style={{
                border: '1px solid var(--border)',
                background: 'rgba(0,0,0,0.02)',
                padding: '10px',
                fontFamily: "'Space Mono', monospace",
                fontSize: '11px',
                marginBottom: '8px'
              }}>
                <div><strong>Input:</strong> {ex.input}</div>
                <div><strong>Output:</strong> {ex.output}</div>
              </div>
            ))}
          </div>

          {/* Detected Code Smells Alert */}
          {codeSmells.length > 0 && (
            <div style={{
              border: '3px solid var(--error)',
              background: 'rgba(255,0,0,0.06)',
              padding: '12px 16px',
              fontFamily: "'Space Mono', monospace",
              fontSize: '11px'
            }}>
              <div style={{ fontWeight: 700, color: 'var(--error)', marginBottom: '4px' }}>
                ⚠️ DETECTED CODE SMELLS ({codeSmells.length})
              </div>
              {codeSmells.map((s, i) => (
                <div key={i} style={{ color: 'var(--text)' }}>
                  • {s.msg}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Code Editor + Live Interrogation Transcript */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Code Editor Header & Controls */}
          <div style={{
            border: '3px solid var(--border)',
            background: 'var(--bg)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '10px 16px',
              borderBottom: '2px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: '13px' }}>
                  CANDIDATE WORKSPACE
                </span>
                <select
                  value={language}
                  onChange={(e) => {
                    const nextLang = e.target.value;
                    setLanguage(nextLang);
                    setCode(DEFAULT_TEMPLATES[nextLang] || DEFAULT_TEMPLATES.python);
                  }}
                  style={{
                    padding: '2px 8px',
                    fontFamily: "'Space Mono', monospace",
                    fontSize: '11px',
                    fontWeight: 700,
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)'
                  }}
                >
                  <option value="python">Python 3</option>
                  <option value="javascript">JavaScript (ES6)</option>
                  <option value="cpp">C++ 20</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => triggerInterrogationStep({ trigger: 'code_smell', userSpeech: '' })}
                  disabled={isProcessingStep}
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    border: '2px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    cursor: 'pointer'
                  }}
                >
                  CHECK TIME COMPLEXITY
                </button>
                <button
                  onClick={handleSubmitCode}
                  disabled={isProcessingStep}
                  style={{
                    fontFamily: "'Archivo Black', sans-serif",
                    fontSize: '11px',
                    padding: '4px 12px',
                    border: '2px solid var(--border)',
                    background: 'var(--text)',
                    color: 'var(--bg)',
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}
                >
                  SUBMIT FOR CROSS-EXAM ➔
                </button>
              </div>
            </div>

            {/* Code Textarea with line numbers feeling */}
            <textarea
              value={code}
              onChange={handleCodeChange}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              placeholder="Write your optimal solution here..."
              style={{
                width: '100%',
                height: '320px',
                padding: '16px',
                fontFamily: "'Space Mono', monospace",
                fontSize: '13px',
                lineHeight: '1.6',
                border: 'none',
                outline: 'none',
                background: 'var(--bg)',
                color: 'var(--text)',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Live Interrogation Transcript Log */}
          <div style={{
            border: '3px solid var(--border)',
            background: 'var(--bg)',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            maxHeight: '320px'
          }}>
            <div style={{
              padding: '8px 16px',
              borderBottom: '2px solid var(--border)',
              fontFamily: "'Archivo Black', sans-serif",
              fontSize: '12px',
              textTransform: 'uppercase',
              background: 'rgba(0,0,0,0.03)',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>INTERROGATION TRANSCRIPT LOG</span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 400 }}>
                {transcript.length} EXCHANGES
              </span>
            </div>

            <div style={{
              padding: '16px',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {transcript.map((item, index) => {
                const isPacey = item.role === 'assistant';
                return (
                  <div
                    key={index}
                    style={{
                      borderLeft: isPacey ? '4px solid var(--error)' : '4px solid var(--text)',
                      paddingLeft: '12px',
                      background: isPacey ? 'rgba(255,0,0,0.02)' : 'rgba(0,0,0,0.01)',
                      padding: '8px 12px'
                    }}
                  >
                    <div style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: '10px',
                      fontWeight: 700,
                      color: isPacey ? 'var(--error)' : 'var(--text-secondary)',
                      marginBottom: '4px',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span>{isPacey ? 'PACEY [STAFF INTERVIEWER]' : 'YOU [CANDIDATE]'}</span>
                      <span>{item.timestamp}</span>
                    </div>
                    <div style={{
                      fontFamily: isPacey ? "'Space Mono', monospace" : "'Work Sans', sans-serif",
                      fontSize: '13px',
                      lineHeight: '1.4',
                      fontWeight: isPacey ? 600 : 400,
                      color: 'var(--text)'
                    }}>
                      {item.content}
                    </div>
                  </div>
                );
              })}
              <div ref={transcriptBottomRef} />
            </div>
          </div>
        </div>
      </div>

      {/* FAANG Scorecard & Verdict Modal */}
      {showScorecardModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg)',
            border: '5px solid var(--border)',
            maxWidth: '680px',
            width: '100%',
            padding: '32px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {isGeneratingVerdict ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <h3 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: '24px', marginBottom: '16px' }}>
                  PACEY IS CONVENING THE HIRING COMMITTEE...
                </h3>
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '13px' }}>
                  Evaluating algorithmic choices, Big-O complexity, communication resilience, and silence hesitations.
                </p>
              </div>
            ) : scorecard ? (
              <div>
                {/* Scorecard Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  borderBottom: '3px solid var(--border)',
                  paddingBottom: '16px',
                  marginBottom: '20px'
                }}>
                  <div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: 'var(--text-secondary)' }}>
                      OFFICIAL INTERVIEW SCORECARD
                    </div>
                    <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: '28px', margin: '4px 0 0 0' }}>
                      {selectedProblem?.title}
                    </h2>
                  </div>

                  {/* Verdict Badge */}
                  <div style={{
                    fontFamily: "'Archivo Black', sans-serif",
                    fontSize: '18px',
                    padding: '8px 18px',
                    border: '3px solid var(--border)',
                    background: scorecard.verdict === 'STRONG HIRE' ? 'var(--success)' : (scorecard.verdict === 'LEAN HIRE' ? 'var(--info, #0000FF)' : 'var(--error)'),
                    color: '#FFFFFF',
                    textTransform: 'uppercase'
                  }}>
                    {scorecard.verdict}
                  </div>
                </div>

                {/* Score Breakdown Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  {[
                    { label: 'PROBLEM SOLVING & INTUITION', score: scorecard.problemSolvingScore },
                    { label: 'CODE QUALITY & CLEANLINESS', score: scorecard.codeQualityScore },
                    { label: 'COMMUNICATION UNDER FIRE', score: scorecard.communicationScore },
                    { label: 'EDGE CASE DEFENSE', score: scorecard.edgeCaseDefenseScore }
                  ].map((m, idx) => (
                    <div key={idx} style={{
                      border: '2px solid var(--border)',
                      padding: '12px',
                      background: 'rgba(0,0,0,0.02)'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontFamily: "'Space Mono', monospace",
                        fontSize: '11px',
                        fontWeight: 700,
                        marginBottom: '6px'
                      }}>
                        <span>{m.label}</span>
                        <span>{m.score}/100</span>
                      </div>
                      <div style={{ height: '10px', background: '#E0E0E0', border: '1px solid var(--border)' }}>
                        <div style={{
                          height: '100%',
                          width: `${m.score}%`,
                          background: m.score >= 70 ? 'var(--success)' : (m.score >= 45 ? 'var(--warning)' : 'var(--error)')
                        }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Savage Review */}
                <div style={{
                  border: '3px solid var(--error)',
                  background: 'rgba(255,0,0,0.04)',
                  padding: '16px',
                  marginBottom: '20px'
                }}>
                  <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: '13px', color: 'var(--error)', marginBottom: '8px' }}>
                    PACEY'S UNFILTERED EVALUATION:
                  </div>
                  <p style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: '13px',
                    lineHeight: '1.5',
                    margin: 0,
                    color: 'var(--text)'
                  }}>
                    "{scorecard.savageReview}"
                  </p>
                </div>

                {/* Actionable Advice */}
                {Array.isArray(scorecard.actionableAdvice) && (
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: '13px', marginBottom: '8px' }}>
                      ACTIONABLE IMPROVEMENTS:
                    </div>
                    {scorecard.actionableAdvice.map((advice, i) => (
                      <div key={i} style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '13px', marginBottom: '6px' }}>
                        • {advice}
                      </div>
                    ))}
                  </div>
                )}

                {/* Modal Buttons */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '2px solid var(--border)', paddingTop: '16px' }}>
                  <button
                    onClick={() => setShowScorecardModal(false)}
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '10px 18px',
                      border: '2px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      cursor: 'pointer'
                    }}
                  >
                    CLOSE REVIEW
                  </button>
                  <button
                    onClick={() => {
                      setShowScorecardModal(false);
                      if (onFinishInterview) onFinishInterview(selectedProblem, scorecard);
                    }}
                    style={{
                      fontFamily: "'Archivo Black', sans-serif",
                      fontSize: '13px',
                      padding: '10px 22px',
                      border: '3px solid var(--border)',
                      background: 'var(--text)',
                      color: 'var(--bg)',
                      cursor: 'pointer',
                      textTransform: 'uppercase'
                    }}
                  >
                    SYNC TO FSRS VAULT ➔
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <p>Failed to generate scorecard. Please try again.</p>
                <button onClick={() => setShowScorecardModal(false)}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
