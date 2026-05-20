// ---------------------------------------------------------
// PROXY SETTINGS
// The URL to Google Apps Script Web App. 
// Used to hide API keys.
// ---------------------------------------------------------
const PROXY_URL = "https://script.google.com/macros/s/AKfycbwE-B3DwlffFcaIchkDlpMCyeGSufKTHNNauDkfupAVrxG7zUjQL3BYejbhVcrqtefhNg/exec";

// ---------------------------------------------------------
// SYSTEM PROMPT
// Instructions for the AI on how to format the response.
// ---------------------------------------------------------
const SYSTEM_PROMPT = `You are a music BPM and Key/Pitch expert. You have access to Google Search - USE IT to find exact BPMs and musical keys. Return ONLY valid JSON with accurate studio BPMs and pitches.

CRITICAL INSTRUCTION: Do NOT use your internal training data for BPMs or Keys. It is often wrong. You MUST use the "Google Search" tool to find the official studio BPM and Key for every single song request.

RULES:
1. For songs: Return the EXACT official studio BPM and set duration_seconds: null. If the user asks for the key or pitch of a song, search for it and include it in the "pitch" field as an array (e.g., ["E3"]). Research carefully - wrong data is unacceptable. 
2. If the user asks for a percentage (e.g., "at 85%"), CALCULATE the new BPM and put the RESULT in the "bpm" field. Note the original in the label.
3. For routines with "alternate", "loop", "repeat", or "cycle": Set ALL duration_seconds to their specified values (this creates an infinite loop)
4. For one-time routines: Use specific duration_seconds values
5. Use bpm: 0 for pauses
6. PITCH CONTROL: If the user requests a specific pitch, key, or chord progression, add a "pitch" field containing an array of notes in scientific pitch notation (e.g., ["A3", "C4", "E4"] for A minor, or ["E3"] for a single E). Tone.js will play these exact frequencies based on A=440Hz tuning. If no pitch is specified, omit the field.
7. BARS TO SECONDS: If a user specifies duration in "bars", calculate duration_seconds based on the BPM and implicit time signature (default 4/4). (e.g., 1 bar of 4/4 at 120bpm = 4 beats = 2 seconds).

RESPONSE FORMAT:
{"steps": [{"bpm": 120, "duration_seconds": 60, "label": "Description", "pitch": ["C4", "E4", "G4"]}]}

EXAMPLES:
User: "Key and BPM of Master of Puppets"
Response: {"steps": [{"bpm": 212, "duration_seconds": null, "label": "Master of Puppets - Metallica (Key: E minor)", "pitch": ["E3", "G3", "B3"]}]}

User: "Paradise City at 85%"
Response: {"steps": [{"bpm": 88, "duration_seconds": null, "label": "Paradise City (Original: 104 BPM @ 85%)"}]}

User: "Time by Pink Floyd at 110%"
Response: {"steps": [{"bpm": 66, "duration_seconds": null, "label": "Time - Pink Floyd (Original: 60 BPM @ 110%)"}]}

User: "Paradise City in A-"
Response: {"steps": [{"bpm": 104, "duration_seconds": null, "label": "Paradise City in A minor", "pitch": ["A3", "C4", "E4"]}]}

User: "Loop 90bpm, 2 bars A, 1 bar D, 1 bar E"
Response: {"steps": [
  {"bpm": 90, "duration_seconds": 5.33, "label": "2 bars A", "pitch": ["A3", "C#4", "E4"]},
  {"bpm": 90, "duration_seconds": 2.67, "label": "1 bar D", "pitch": ["D3", "F#4", "A4"]},
  {"bpm": 90, "duration_seconds": 2.67, "label": "1 bar E", "pitch": ["E3", "G#4", "B4"]}
]}

User: "12 bar blues at 100 bpm in E"
Response: {"steps": [
  {"bpm": 100, "duration_seconds": 9.6, "label": "4 bars E (I)", "pitch": ["E3", "G#3", "B3"]},
  {"bpm": 100, "duration_seconds": 4.8, "label": "2 bars A (IV)", "pitch": ["A3", "C#4", "E4"]},
  {"bpm": 100, "duration_seconds": 4.8, "label": "2 bars E (I)", "pitch": ["E3", "G#3", "B3"]},
  {"bpm": 100, "duration_seconds": 2.4, "label": "1 bar B (V)", "pitch": ["B3", "D#4", "F#4"]},
  {"bpm": 100, "duration_seconds": 2.4, "label": "1 bar A (IV)", "pitch": ["A3", "C#4", "E4"]},
  {"bpm": 100, "duration_seconds": 4.8, "label": "2 bars E (I)", "pitch": ["E3", "G#3", "B3"]}
]}

User: "gradually increase from 60 to 100 by 10 every 5 seconds then pause for 10 seconds and repeat"
Response: {"steps": [{"bpm": 60, "duration_seconds": 5, "label": "60 BPM"}, {"bpm": 70, "duration_seconds": 5, "label": "70 BPM"}, {"bpm": 80, "duration_seconds": 5, "label": "80 BPM"}, {"bpm": 90, "duration_seconds": 5, "label": "90 BPM"}, {"bpm": 100, "duration_seconds": 5, "label": "100 BPM"}, {"bpm": 0, "duration_seconds": 10, "label": "Pause"}]}

User: "start at 80 bpm for 2 minutes then 120 bpm for 1 minute"
Response: {"steps": [{"bpm": 80, "duration_seconds": 120, "label": "80 BPM"}, {"bpm": 120, "duration_seconds": 60, "label": "120 BPM"}]}

User: "start at 80bpm increase to 100 in 5 seconds and stay there"
Response: {"steps": [{"bpm": 80, "duration_seconds": 5, "label": "80 BPM"}, {"bpm": 100, "duration_seconds": null, "label": "100 BPM"}]}

IMPORTANT: When ALL steps have duration_seconds values (not null), the routine will automatically loop infinitely. Single songs should have duration_seconds: null.`;

// ---------------------------------------------------------
// GLOBAL STATE
// Variables to track the app's status
// ---------------------------------------------------------
let audioContextStarted = false; // Has user clicked yet to allow audio?
let currentData = { steps: [] }; // The current AI routine data
let manualBpm = 100;             // Current manual mode BPM
let isManualPlaying = false;     // Is the manual clicker running?
let isAiPlaying = false;         // Is an AI routine running?
let routineHistory = [];         // Array of previous searches
let tapTimes = [];               // Array to store timestamps for Tap Tempo
let tsNum = 4;                   // Current time signature numerator
let tsDen = 4;                   // Current time signature denominator
let isAccentEnabled = false;     // Global accent toggle state
let animationFrameId = null;     // Tracks the progress bar animation frame
let currentBeat = 0;             // Tracker for downbeat logic

// ---------------------------------------------------------
// SOUND ENGINE
// Tone.js synthesizers for the click sounds
// ---------------------------------------------------------
const SoundEngine = {
    synths: {},
    current: 'hihat', // Default sound

    // Initialize all synths
    init() {
        this.synths.woodblock = new Tone.MembraneSynth({ pitchDecay: 0.008, octaves: 2, envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 1 } }).toDestination();
        this.synths.clave = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.001, decay: 0.1, sustain: 0 } }).toDestination();
        this.synths.hihat = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.05, sustain: 0 } }).toDestination();
        this.synths.hihat.volume.value = -4; // Lower volume for hihat
        
        // Upgrade beep to a PolySynth with sine waves for pure A=440Hz tuned chords
        this.synths.beep = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.4, sustain: 0.1, release: 0.8 } }).toDestination();
        this.synths.kick = new Tone.MembraneSynth().toDestination();
    },

    // Trigger the currently selected sound
    trigger(time, isDownbeat = false, customPitch = null) {
        let pitches = null;
        if (customPitch) {
            if (Array.isArray(customPitch)) {
                pitches = customPitch.map(p => {
                    let note = p.toUpperCase();
                    if (note.endsWith('B')) note = note.slice(0, -1) + 'b';
                    if (!/\d/.test(note)) note += "4"; // Default octave to 4 if none provided
                    return note;
                });
            } else if (typeof customPitch === 'string') {
                let note = customPitch.toUpperCase();
                if (note.endsWith('B')) note = note.slice(0, -1) + 'b';
                if (!/\d/.test(note)) note += "4";
                pitches = [note];
            }
        }

        switch (this.current) {
            case 'woodblock': this.synths.woodblock.triggerAttackRelease(pitches ? pitches[0] : (isDownbeat ? "C5" : "C4"), "8n", time, isDownbeat ? 0.8 : 0.5); break;
            case 'clave': this.synths.clave.triggerAttackRelease(pitches ? pitches[0] : (isDownbeat ? "C6" : "C5"), "8n", time, isDownbeat ? 0.8 : 0.5); break;
            case 'hihat': this.synths.hihat.triggerAttackRelease("32n", time, isDownbeat ? 0.6 : 0.3); break;
            case 'beep': 
                const bPitches = pitches ? pitches : (isDownbeat ? ["C5"] : ["C4"]);
                this.synths.beep.triggerAttackRelease(bPitches, "8n", time, isDownbeat ? 0.8 : 0.5); 
                break;
            case 'kick': this.synths.kick.triggerAttackRelease(pitches ? pitches[0] : (isDownbeat ? "C2" : "C1"), "8n", time, isDownbeat ? 0.8 : 0.7); break;
        }
    }
};

// ---------------------------------------------------------
// INITIALIZATION
// Runs when the HTML document is fully loaded
// ---------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Select DOM Elements for easy access
    const els = {
        slider: document.getElementById('bpmSlider'),
        display: document.getElementById('manualBpmDisplay'),
        masterBtn: document.getElementById('masterPlayBtn'),
        tapZone: document.getElementById('tapZone'),
        prompt: document.getElementById('promptInput'),
        status: document.getElementById('statusMsg'),
        debug: document.getElementById('debugBox'),
        soundSelect: document.getElementById('soundSelect'),
        generateBtn: document.getElementById('generateBtn'),
        aiControls: document.getElementById('aiControls'),
        routineList: document.getElementById('routineList'),
        micBtn: document.getElementById('micBtn'),
        infoBtn: document.getElementById('infoBtn'),
        infoModal: document.getElementById('infoModal'),
        closeInfoBtn: document.getElementById('closeInfoBtn'),
        accentToggleBtn: document.getElementById('accentToggleBtn'),
        themeSelect: document.getElementById('themeSelect'),
        timeSignatureContainer: document.getElementById('timeSignatureContainer'),
        timeSignatureSelect: document.getElementById('timeSignatureSelect')
    };

    // Theme Select Logic
    if (els.themeSelect) {
        const currentTheme = localStorage.getItem('theme') || 'dark';
        
        // Unhide floo-fire if it's the saved theme
        if (currentTheme === 'floo-fire') {
            const flooOption = document.getElementById('flooFireOption');
            if (flooOption) flooOption.removeAttribute('hidden');
            if (els.timeSignatureContainer) els.timeSignatureContainer.classList.remove('hidden');
            const advInfo = document.getElementById('advancedInfoSection');
            if (advInfo) advInfo.classList.remove('hidden');
        }

        const applyTheme = (theme) => {
            document.documentElement.classList.remove('theme-dark', 'theme-goldtop', 'theme-floo-fire', 'theme-cherryburst');
            if (theme !== 'light') {
                document.documentElement.classList.add(`theme-${theme}`);
            }
        };

        applyTheme(currentTheme);
        els.themeSelect.value = currentTheme;

        els.themeSelect.addEventListener('change', (e) => {
            const selectedTheme = e.target.value;
            applyTheme(selectedTheme);
            localStorage.setItem('theme', selectedTheme);
        });
    }

    // Accent Toggle Logic
    if (els.accentToggleBtn) {
        els.accentToggleBtn.addEventListener('click', () => {
            isAccentEnabled = !isAccentEnabled;
            els.accentToggleBtn.textContent = `Accent: ${isAccentEnabled ? 'ON' : 'OFF'}`;
            els.accentToggleBtn.classList.toggle('text-primary', isAccentEnabled);
            els.accentToggleBtn.classList.toggle('border-primary', isAccentEnabled);
            els.accentToggleBtn.classList.toggle('text-muted', !isAccentEnabled);
        });
    }

    // Sound Selection
    els.soundSelect.addEventListener('change', (e) => {
        SoundEngine.current = e.target.value;
        // Preview sound if engine is running
        if (audioContextStarted && !isManualPlaying) SoundEngine.trigger(Tone.now(), true);
    });

    els.soundSelect.value = SoundEngine.current;

    // Time Signature Selection
    if (els.timeSignatureSelect) {
        els.timeSignatureSelect.addEventListener('change', (e) => {
            const match = e.target.value.match(/(\d+)\/(\d+)/);
            if (match) {
                tsNum = parseInt(match[1]);
                tsDen = parseInt(match[2]);
            }
            currentBeat = 0;
            if (isPlaying) {
                stopEverything();
                els.masterBtn.click();
            }
        });
    }

    // BPM Helper Function
    // Updates global state and UI elements
    function updateBpm(val) {
        manualBpm = Math.max(30, Math.min(250, parseInt(val))); // Clamp between 30-250
        els.display.textContent = manualBpm;
        els.slider.value = manualBpm;
        lastInteractedMode = 'manual';

        // If engine is running, update speed immediately
        if (isManualPlaying || isAiPlaying) Tone.Transport.bpm.value = manualBpm;
    }

    // Slider & +/- Button Listeners
    els.slider.oninput = (e) => updateBpm(e.target.value);
    document.getElementById('btnMinus').onclick = () => updateBpm(manualBpm - 1);
    document.getElementById('btnPlus').onclick = () => updateBpm(manualBpm + 1);

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // Ignore shortcuts if typing in input box
        const isTyping = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);

        // ENTER: Generate routine
        if (e.key === 'Enter' && isTyping && !e.shiftKey) {
            e.preventDefault();
            els.generateBtn.click();
        }

        // SPACEBAR: Toggle Play/Stop
        if (e.code === 'Space' && !isTyping) {
            e.preventDefault();
            els.masterBtn.click();
        }
    });

    // Tap Tempo Logic
    els.tapZone.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const now = Date.now();

        // Reset if too much time passed (2 seconds)
        if (tapTimes.length > 0 && now - tapTimes[tapTimes.length - 1] > 2000) tapTimes = [];

        tapTimes.push(now);
        if (tapTimes.length > 4) tapTimes.shift(); // Keep last 4 taps

        // Calculate average
        if (tapTimes.length >= 2) {
            let sum = 0;
            for (let i = 1; i < tapTimes.length; i++) sum += tapTimes[i] - tapTimes[i - 1];
            const avgInterval = sum / (tapTimes.length - 1);
            updateBpm(Math.round(60000 / avgInterval)); // 60000ms = 1 minute
        }
    });

    // Global tracking state helper
    let isPlaying = false; 
    let lastInteractedMode = 'manual';

    // UI state reset helper
    function setButtonToStopState() {
        isPlaying = true;
        els.masterBtn.innerHTML = `<span>⏹ Stop</span>`;
        els.masterBtn.className = "w-3/4 bg-error/20 hover:bg-error/30 border border-error/50 text-error text-2xl sm:text-3xl font-bold transition flex justify-center items-center backdrop-blur-sm active:scale-[0.98] shadow-[inset_0_0_20px_rgba(239,68,68,0.2)]";
    }

    function setButtonToPlayState() {
        isPlaying = false;
        isManualPlaying = false;
        isAiPlaying = false;
        els.masterBtn.innerHTML = `<span>▶ Start</span>`;
        els.masterBtn.className = "w-3/4 bg-primary/20 hover:bg-primary/30 border border-primary/50 text-primary text-2xl sm:text-3xl font-bold transition flex justify-center items-center backdrop-blur-sm active:scale-[0.98] shadow-[inset_0_0_20px_rgba(168,85,247,0.2)]";
        document.querySelectorAll('.step-item').forEach(e => e.classList.remove('active-step'));
        els.display.textContent = manualBpm;
    }

    // Master Stop Function
    function stopEverything() {
        Tone.Transport.stop();
        Tone.Transport.cancel();
        Tone.Transport.off('loop');
        if (window.currentTonePart) {
            window.currentTonePart.dispose();
            window.currentTonePart = null;
        }
        setButtonToPlayState();
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        document.querySelectorAll('[id^="progress-"]').forEach(el => {
            el.style.width = '0%';
            el.style.opacity = '0';
        });
    }

    // Unified Play/Stop Click Handler
    els.masterBtn.onclick = async () => {
        // Ensure AudioContext is unlocked
        if (!audioContextStarted) { 
            await Tone.start(); 
            SoundEngine.init(); 
            audioContextStarted = true; 
        }

        // If something is already playing, the button stops everything
        if (isPlaying) {
            stopEverything();
            return;
        }

        // Determine Mode: If AI controls are visible and we have data steps, run AI mode
        const hasAiRoutine = !els.aiControls.classList.contains('hidden') && currentData.steps && currentData.steps.length > 0;

        if (hasAiRoutine && lastInteractedMode === 'ai') {
            await startAiRoutine(0);
        } else {
            // --- START STANDARD MANUAL METRONOME MODE ---
            Tone.Transport.stop();
            Tone.Transport.cancel();
            Tone.Transport.position = 0;
            
            isManualPlaying = true;
            setButtonToStopState();

            currentBeat = 0;
            Tone.Transport.bpm.value = manualBpm;
            Tone.Transport.scheduleRepeat((t) => {
                const isDownbeat = tsNum > 1 ? (currentBeat % tsNum === 0) : false;
                SoundEngine.trigger(t, isAccentEnabled && isDownbeat);
                currentBeat++;
            }, tsDen + "n");
            document.getElementById('loopIndicator').classList.add('hidden');
            Tone.Transport.start();
        }
    };

    async function startAiRoutine(startIndex = 0) {
        if (!audioContextStarted) { 
            await Tone.start(); 
            SoundEngine.init(); 
            audioContextStarted = true; 
        }

        Tone.Transport.stop();
        Tone.Transport.cancel();
        Tone.Transport.off('loop');
        if (window.currentTonePart) {
            window.currentTonePart.dispose();
            window.currentTonePart = null;
        }

        isAiPlaying = true;
        setButtonToStopState();

        // 1. Calculate Exact Times & Build Audio Events
        let t = 0;
        let cumulativeTicks = 0;
        const events = [];
        let hasInfiniteStep = false;
        let infiniteStepIdx = -1;
        let infiniteStepStartTicks = 0;
        
        stepStartTimes = []; // global array for UI
        let stepDurations = []; // global array for UI

        currentData.steps.forEach((step, i) => {
            stepStartTimes[i] = t;

            if (hasInfiniteStep) {
                stepDurations[i] = 0; 
                return; 
            }

            if (step.duration_seconds === null) {
                hasInfiniteStep = true;
                infiniteStepIdx = i;
                infiniteStepStartTicks = cumulativeTicks;
                stepDurations[i] = 999999;
                t += 999999;
                return;
            }

            if (step.bpm > 0) {
                const beatDur = 60 / step.bpm;
                const tickDur = beatDur * (4 / tsDen);
                const exactTicks = Math.round(step.duration_seconds / tickDur);
                stepDurations[i] = exactTicks * tickDur;

                for (let tick = 0; tick < exactTicks; tick++) {
                    const isDownbeat = tsNum > 1 ? (cumulativeTicks % tsNum === 0) : false;
                    events.push({ time: t, pitch: step.pitch || null, isDownbeat: isDownbeat });
                    t += tickDur;
                    cumulativeTicks++;
                }
            } else {
                stepDurations[i] = step.duration_seconds;
                t += step.duration_seconds;
            }
        });

        const totalRoutineDuration = hasInfiniteStep ? 999999 : t;

        // 2. Schedule Finite Audio
        if (events.length > 0) {
            window.currentTonePart = new Tone.Part((time, value) => {
                SoundEngine.trigger(time, isAccentEnabled && value.isDownbeat, value.pitch);
            }, events).start(0);
        }

        // 3. Schedule Infinite Audio Loop (If present)
        if (hasInfiniteStep) {
            Tone.Transport.loop = false;
            document.getElementById('loopIndicator').classList.add('hidden');
            
            const infStep = currentData.steps[infiniteStepIdx];
            if (infStep.bpm > 0) {
                Tone.Transport.schedule((time) => {
                    Tone.Transport.bpm.value = infStep.bpm; 
                    let runtimeBeatCounter = infiniteStepStartTicks;
                    Tone.Transport.scheduleRepeat((rt) => {
                        const isDownbeat = tsNum > 1 ? (runtimeBeatCounter % tsNum === 0) : false;
                        SoundEngine.trigger(rt, isAccentEnabled && isDownbeat, infStep.pitch || null);
                        runtimeBeatCounter++;
                    }, tsDen + "n", time);
                }, stepStartTimes[infiniteStepIdx]);
            }
        } else {
            Tone.Transport.loop = true;
            Tone.Transport.loopStart = 0;
            Tone.Transport.loopEnd = totalRoutineDuration;
            document.getElementById('loopIndicator').classList.remove('hidden');
        }

        // Attach stepDurations to global so updateProgressBars can use it
        window.currentStepDurations = stepDurations;
        window.currentRoutineDuration = totalRoutineDuration;

        Tone.Transport.position = stepStartTimes[startIndex] || 0;
        Tone.Transport.start();
        
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(updateProgressBars);
    }

    // Visually updates the progress bar AND highlights active steps synchronously 
    function updateProgressBars() {
        if (!isAiPlaying) return;

        let pos = Tone.Transport.seconds;
        let isFinite = currentData.steps.every(s => s.duration_seconds !== null);
        
        if (isFinite && window.currentRoutineDuration > 0) {
            pos = pos % window.currentRoutineDuration;
        }

        let activeStepIdx = -1;

        currentData.steps.forEach((step, i) => {
            const progBar = document.getElementById(`progress-${i}`);
            if (!progBar) return;

            const start = stepStartTimes[i];
            const dur = window.currentStepDurations[i] || 0;
            const end = start + dur;

            if (pos >= start && pos < end) {
                activeStepIdx = i;
                let progress = dur > 0 ? (pos - start) / dur : 0;
                if (dur === 999999) progress = 1;
                progBar.style.width = `${progress * 100}%`;
                progBar.style.opacity = `1`;
            } else if (pos >= end) {
                progBar.style.width = `100%`;
                progBar.style.opacity = `0`;
            } else {
                progBar.style.width = `0%`;
                progBar.style.opacity = `0`;
            }
        });

        // UI highlight sync
        if (activeStepIdx !== -1) {
            const step = currentData.steps[activeStepIdx];
            if (els.display.textContent != step.bpm && step.bpm > 0) {
                els.display.textContent = step.bpm;
            } else if (step.bpm === 0 && els.display.textContent !== "⏸") {
                els.display.textContent = "⏸";
            }

            document.querySelectorAll('.step-item').forEach((e, idx) => {
                if (idx === activeStepIdx) {
                    if (!e.classList.contains('active-step')) {
                        e.classList.add('active-step');
                        e.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                } else {
                    e.classList.remove('active-step');
                }
            });
        }

        animationFrameId = requestAnimationFrame(updateProgressBars);
    }

    // Generate Routine (AI)
    els.generateBtn.onclick = async () => {
        const text = els.prompt.value.trim();
        if (!text) return alert("Please type a request");

        els.status.textContent = "Thinking...";
        els.status.className = "text-base sm:text-lg text-primary font-bold";
        els.generateBtn.disabled = true;
        lastInteractedMode = 'ai';

        // Easter Egg: Reveal Floo Fire theme
        if (text.toLowerCase() === 'capacious extremis') {
            const flooOption = document.getElementById('flooFireOption');
            if (flooOption) {
                els.status.textContent = "🔮 Casting spell...";
                playBrickAnimation(() => {
                    flooOption.removeAttribute('hidden');
                    els.themeSelect.value = 'floo-fire';
                    els.themeSelect.dispatchEvent(new Event('change'));
                    els.timeSignatureContainer.classList.remove('hidden');
                    const advInfo = document.getElementById('advancedInfoSection');
                    if (advInfo) advInfo.classList.remove('hidden');
                    els.prompt.value = '';
                    els.status.textContent = "✨ Secret Theme & Features Unlocked!";
                    els.status.className = "text-base sm:text-lg text-primary font-bold";
                    els.generateBtn.disabled = false;
                });
                return;
            }
        }

        try {
            // Call the proxy to get JSON data
            const data = await callProxy(text);
            loadRoutine(data);
            addToHistory(text, data);
            els.aiControls.classList.remove('hidden');
            els.status.textContent = "✅ Ready!";
            els.status.className = "text-base sm:text-lg text-success font-bold";
        } catch (e) {
            console.error(e);
            els.status.textContent = "❌ " + e.message;
            els.status.className = "text-base sm:text-lg text-error font-bold";
        } finally {
            els.generateBtn.disabled = false;
        }
    };

    // Proxy Call Logic
    async function callProxy(userText) {
        // Debug logging
        console.log("=== CALLING PROXY ===");
        console.log("URL:", PROXY_URL);

        try {
            // Send POST request to avoid URL length limits
            const res = await fetch(PROXY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8', // text/plain prevents CORS preflight issues on Google Apps Script
                },
                body: JSON.stringify({
                    prompt: userText,
                    systemPrompt: SYSTEM_PROMPT
                })
            });
            console.log("Response status:", res.status);

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Proxy returned ${res.status}`);
            }

            const text = await res.text();
            console.log("Response text:", text);

            const data = JSON.parse(text);

            if (data.error) {
                throw new Error(data.error);
            }

            // Handle Gemini's nested structure
            if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                return parseResponse(data.candidates[0].content.parts[0].text);
            }
            // Handle direct response
            return parseResponse(text);
        } catch (fetchError) {
            console.error("Fetch failed:", fetchError);
            throw new Error("Cannot reach proxy. Check debug box above.");
        }
    }

    // JSON Parsing & Cleanup
    function parseResponse(raw) {
        // Clean markdown code blocks (```json ... ```)
        let clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

        // Extract JSON object using regex
        const start = clean.indexOf('{');
        const end = clean.lastIndexOf('}');

        if (start === -1 || end === -1) {
            throw new Error("AI did not return valid JSON format");
        }

        const jsonStr = clean.substring(start, end + 1);

        try {
            const json = JSON.parse(jsonStr);

            // Case 1: Valid Steps Array
            if (json.steps && Array.isArray(json.steps)) {
                return json;
            }

            // Case 2: Single BPM returned
            if (json.bpm) {
                return {
                    steps: [{
                        bpm: json.bpm,
                        duration_seconds: null,
                        label: json.label || 'Found'
                    }]
                };
            }

            throw new Error("Response missing 'steps' array");

        } catch (parseError) {
            // Regex Fallback for parsing failures
            const match = clean.match(/\b([3-9][0-9]|1[0-9]{2}|2[0-4][0-9])\b/);
            if (match) {
                return {
                    steps: [{
                        bpm: parseInt(match[0]),
                        duration_seconds: null,
                        label: `${match[0]} BPM`
                    }]
                };
            }
            throw new Error("Could not parse AI response.");
        }
    }

    // Render Routine UI
    function loadRoutine(data) {
        currentData = data;

        els.routineList.innerHTML = '';
        stepStartTimes = [];
        let accumulatedTime = 0;
        let currentBPM = manualBpm;

        // Render each step into the list
        data.steps.forEach((s, i) => {
            stepStartTimes.push(accumulatedTime);
            if (s.bpm > 0) currentBPM = s.bpm;

            if (s.duration_seconds) {
                if (currentBPM > 0) {
                    const beatDur = 60 / currentBPM;
                    s._exactQuarterBeats = Math.round(s.duration_seconds / beatDur);
                    s._duration = s._exactQuarterBeats * beatDur;
                } else {
                    s._exactQuarterBeats = s.duration_seconds;
                    s._duration = s.duration_seconds;
                }
            } else {
                s._exactQuarterBeats = Infinity;
                s._duration = 999999;
            }
            accumulatedTime += s._duration;

            const dur = s.duration_seconds ? s.duration_seconds + 's' : '∞';
            const pitchDisplay = Array.isArray(s.pitch) ? s.pitch.join(', ') : s.pitch;
            const pitchHtml = s.pitch ? `<span class="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs ml-2">${pitchDisplay}</span>` : '';
            const div = document.createElement('div');
            div.className = `relative overflow-hidden p-3 border-b border-themeBorder flex justify-between items-center step-item step-${i} cursor-pointer transition`;
            div.innerHTML = `
                <div class="absolute bottom-0 left-0 h-1 bg-primary/50 w-0 opacity-0 transition-opacity duration-300" id="progress-${i}"></div>
                <div class="relative z-10 flex justify-between items-center w-full">
                    <span class="font-bold text-main pointer-events-none flex items-center">${i + 1}. ${s.label} ${pitchHtml}</span>
                    <span class="font-mono text-primary pointer-events-none whitespace-nowrap ml-2">${s.bpm} BPM <small class="opacity-70">(${dur})</small></span>
                </div>
            `;
            
            div.onclick = async () => {
                lastInteractedMode = 'ai';
                if (!isAiPlaying) {
                    await startAiRoutine(i);
                } else {
                    stopEverything();
                    await startAiRoutine(i);
                }
            };
            
            els.routineList.appendChild(div);
        });
    }

    // History Management
    function renderHistory() {
        const list = document.getElementById('historyList');
        const section = document.getElementById('historySection');
        
        if (routineHistory.length === 0) {
            section.classList.add('hidden');
            return;
        }
        
        section.classList.remove('hidden');
        list.innerHTML = '';

        routineHistory.forEach((h, idx) => {
            const d = document.createElement('div');
            d.className = "history-item p-2 border border-themeBorder rounded-lg cursor-pointer text-sm flex justify-between transition";
            d.innerHTML = `<span class="text-main">🎵 ${h.prompt}</span><button class="text-error font-bold px-2 del-btn hover:text-red-400" data-idx="${idx}">×</button>`;

            d.onclick = (e) => {
                if (e.target.classList.contains('del-btn')) {
                    routineHistory.splice(idx, 1);
                    renderHistory();
                } else {
                    lastInteractedMode = 'ai';
                    loadRoutine(h.data);
                    els.aiControls.classList.remove('hidden');

                    // 2. AUTO-PLAY LOGIC
                    if (isAiPlaying) stopEverything();
                    els.masterBtn.click();
                }
            };
            list.appendChild(d);
        });
    }

    function addToHistory(prompt, data) {
        routineHistory.unshift({ prompt, data });
        if (routineHistory.length > 10) routineHistory.pop();
        renderHistory();
    }

    document.getElementById('clearHistoryBtn').onclick = () => {
        routineHistory = [];
        document.getElementById('historySection').classList.add('hidden');
    };

    // Voice Input (Chrome Only)
    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SR();
        els.micBtn.onclick = () => { recognition.start(); els.status.textContent = "🎤 Listening..."; };
        recognition.onresult = (e) => { els.prompt.value = e.results[0][0].transcript; els.status.textContent = "✅ Captured"; };
    } else {
        els.micBtn.style.display = 'none';
    }

    // --- Info Popup Logic ---
    if (els.infoBtn && els.infoModal && els.closeInfoBtn) {
        // Toggle "Stay Open" on click
        els.infoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            els.infoModal.classList.toggle('stay-open');
        });

        // Close on X button
        els.closeInfoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            els.infoModal.classList.remove('stay-open');
        });

        // Close if clicking anywhere else
        document.addEventListener('click', (e) => {
            if (!els.infoModal.contains(e.target) && e.target !== els.infoBtn) {
                els.infoModal.classList.remove('stay-open');
            }
        });
    }

    // --- Seamless Screen-Shatter Brick Animation ---
    async function playBrickAnimation(callback) {
        // 1. Snapshot the current screen viewport
        const canvas = await html2canvas(document.body, {
            scale: 1, // Keep scale at 1 for performance mapping
            useCORS: true,
            logging: false,
            x: window.scrollX,
            y: window.scrollY,
            width: window.innerWidth,
            height: window.innerHeight
        });
        const imgData = canvas.toDataURL('image/png');

        const wall = document.createElement('div');
        wall.className = 'brick-wall-container';

        const brickW = 84; // 82 + 2 margin
        const brickH = 34; // 32 + 2 margin
        const cols = Math.ceil(window.innerWidth / brickW) + 2;
        const rows = Math.ceil(window.innerHeight / brickH) + 1;

        const bricks = [];

        for (let r = 0; r < rows; r++) {
            const rowDiv = document.createElement('div');
            rowDiv.style.display = 'flex';
            rowDiv.style.width = '100%';
            rowDiv.style.flexWrap = 'nowrap';
            const offsetX = (r % 2 === 1) ? -brickW / 2 : 0;
            rowDiv.style.transform = `translateX(${offsetX}px)`;

            for (let c = 0; c < cols; c++) {
                const brick = document.createElement('div');
                brick.className = 'brick';
                
                // Map the captured screenshot to the individual brick
                brick.style.backgroundImage = `url(${imgData})`;
                brick.style.backgroundSize = `${window.innerWidth}px ${window.innerHeight}px`;
                brick.style.backgroundPosition = `${-(c * brickW + offsetX)}px ${-(r * brickH)}px`;

                // Center coords for distance calc
                const centerX = (c * brickW) + offsetX + (brickW/2);
                const centerY = (r * brickH) + (brickH/2);
                brick.dataset.cx = centerX;
                brick.dataset.cy = centerY;
                rowDiv.appendChild(brick);
                bricks.push(brick);
            }
            wall.appendChild(rowDiv);
        }

        document.body.appendChild(wall);

        // 2. Instantly switch theme underneath the wall
        callback(); 

        const screenCX = window.innerWidth / 2;
        const screenCY = window.innerHeight / 2;

        // 3. Animate the bricks away to reveal the new theme
        setTimeout(() => {
            let maxDelay = 0;
            bricks.forEach(brick => {
                const dx = parseFloat(brick.dataset.cx) - screenCX;
                const dy = parseFloat(brick.dataset.cy) - screenCY;
                const distance = Math.sqrt(dx*dx + dy*dy);

                const delay = (distance * 1.4) + (Math.random() * 100); // Calculate expanding wave delay (half speed)
                if (delay > maxDelay) maxDelay = delay;

                setTimeout(() => { brick.classList.add('brick-open'); }, delay + 100);
            });

            setTimeout(() => { 
                wall.remove(); 
                setTimeout(() => {
                    spawnSparkles(els.infoBtn); 
                }, 500); // Wait 0.5s after the brick effect is completely done
            }, maxDelay + 1400);
        }, 50);
    }

    // Sparkle Generator Helper
    function spawnSparkles(targetEl) {
        if (!targetEl) return;
        const rect = targetEl.getBoundingClientRect();
        for (let i = 0; i < 20; i++) {
            const sparkle = document.createElement('div');
            sparkle.className = 'sparkle-particle';
            
            const angle = Math.random() * Math.PI * 2;
            const distance = 30 + Math.random() * 60;
            
            sparkle.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
            sparkle.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);
            sparkle.style.left = `${rect.left + rect.width / 2}px`;
            sparkle.style.top = `${rect.top + rect.height / 2}px`;
            
            document.body.appendChild(sparkle);
            setTimeout(() => sparkle.remove(), 2000);
        }
    }
});