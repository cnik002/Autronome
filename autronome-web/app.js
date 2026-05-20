// --- GLOBAL ERROR TRAP ---
window.onerror = function (message, source, lineno, colno, error) {
    const errorBox = document.getElementById('globalErrorBox');
    if (errorBox) {
        errorBox.textContent = `SYSTEM ERROR: ${message}`;
        errorBox.classList.remove('hidden');
    }
    return false;
};

// --- CONFIGURATION ---
const GEMINI_API_KEY = "AIzaSyBqT7zKmh5If__XCqL9oAc-pX7sPS-v8Ms";

const SYSTEM_PROMPT = `
You are a metronome scheduling assistant.
Rules:
1. Calculate the math yourself.
2. Return ONLY a JSON object with this structure:
{ "steps": [ { "bpm": number, "duration_seconds": number, "label": "string" } ] }
`;

// --- STATE ---
let audioContextStarted = false;
let currentRoutine = [];
let manualBpm = 100;
let isManualPlaying = false;

// --- WAIT FOR PAGE LOAD ---
document.addEventListener('DOMContentLoaded', () => {

    // DOM Elements
    const bpmDisplay = document.getElementById('manualBpmDisplay');
    const slider = document.getElementById('bpmSlider');
    const btnMinus = document.getElementById('btnMinus');
    const btnPlus = document.getElementById('btnPlus');
    const manualPlayBtn = document.getElementById('manualPlayBtn');
    const promptInput = document.getElementById('promptInput');
    const statusMsg = document.getElementById('statusMsg');
    const routineList = document.getElementById('routineList');
    const aiControls = document.getElementById('aiControls');
    const aiPlayBtn = document.getElementById('aiPlayBtn');
    const aiStopBtn = document.getElementById('aiStopBtn');
    const generateBtn = document.getElementById('generateBtn');

    // ==========================================
    // 1. MANUAL METRONOME
    // ==========================================
    function updateBpm(newBpm) {
        manualBpm = Math.max(30, Math.min(250, parseInt(newBpm)));
        if (bpmDisplay) bpmDisplay.textContent = manualBpm;
        if (slider) slider.value = manualBpm;
        if (isManualPlaying) Tone.Transport.bpm.value = manualBpm;
    }

    if (slider) slider.addEventListener('input', (e) => updateBpm(e.target.value));
    if (btnMinus) btnMinus.addEventListener('click', () => updateBpm(manualBpm - 5));
    if (btnPlus) btnPlus.addEventListener('click', () => updateBpm(manualBpm + 5));

    if (manualPlayBtn) manualPlayBtn.addEventListener('click', async () => {
        if (!audioContextStarted) { await Tone.start(); audioContextStarted = true; }

        if (isManualPlaying) {
            Tone.Transport.stop();
            Tone.Transport.cancel();
            isManualPlaying = false;
            manualPlayBtn.textContent = "▶ Start Click";
            manualPlayBtn.classList.replace('bg-red-500', 'bg-indigo-600');
            manualPlayBtn.classList.replace('hover:bg-red-600', 'hover:bg-indigo-700');
        } else {
            stopAiRoutine();
            Tone.Transport.bpm.value = manualBpm;
            const synth = new Tone.MembraneSynth().toDestination();
            Tone.Transport.scheduleRepeat((time) => {
                synth.triggerAttackRelease("C2", "8n", time);
            }, "4n");
            Tone.Transport.start();
            isManualPlaying = true;
            manualPlayBtn.textContent = "⏹ Stop Click";
            manualPlayBtn.classList.replace('bg-indigo-600', 'bg-red-500');
            manualPlayBtn.classList.replace('hover:bg-indigo-700', 'hover:bg-red-600');
        }
    });

    // ==========================================
    // 2. AI AGENT (SMART RETRY LOGIC)
    // ==========================================

    // Helper function to try fetching from a specific model
    async function tryFetch(modelName, userText) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: SYSTEM_PROMPT + "\nUser Request: " + userText }] }]
            })
        });

        // If error, get the text body to see WHY
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`${response.status} ${errorBody}`);
        }
        return response.json();
    }

    if (generateBtn) generateBtn.addEventListener('click', async () => {
        const userText = promptInput.value;
        if (!userText) { alert("Please type a command first."); return; }

        statusMsg.textContent = "🧠 Attempting connection...";
        statusMsg.classList.remove('text-red-600');

        try {
            let data;

            // ATTEMPT 1: Try Flash (Fastest)
            try {
                data = await tryFetch('gemini-1.5-flash', userText);
            } catch (err1) {
                console.warn("Flash failed, trying Pro...", err1);
                statusMsg.textContent = "⚠️ Flash failed, trying backup model...";

                // ATTEMPT 2: Try Pro (Backup)
                data = await tryFetch('gemini-pro', userText);
            }

            if (!data.candidates || data.candidates.length === 0) {
                throw new Error("AI returned no content.");
            }

            let rawText = data.candidates[0].content.parts[0].text;
            rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            const schedule = JSON.parse(rawText);

            loadRoutineList(schedule.steps);
            aiControls.classList.remove('hidden');
            statusMsg.textContent = "✅ Routine generated successfully!";

        } catch (err) {
            console.error(err);
            // Show the FULL error message on screen so we can debug
            statusMsg.textContent = "API Error: " + err.message.slice(0, 100) + "...";
            statusMsg.classList.add('text-red-600');
            alert("Connection Failed.\n\nRaw Error from Google:\n" + err.message);
        }
    });

    function loadRoutineList(steps) {
        currentRoutine = steps;
        routineList.innerHTML = '';
        steps.forEach((step, index) => {
            const div = document.createElement('div');
            div.className = `p-4 text-xl border-b last:border-0 flex justify-between step-item step-${index}`;
            div.innerHTML = `
                <span class="font-bold text-gray-700">${index + 1}. ${step.label}</span>
                <span class="font-mono text-blue-600 font-bold">${step.bpm > 0 ? step.bpm : 'PAUSE'} <span class="text-gray-400 text-lg">(${step.duration_seconds}s)</span></span>
            `;
            routineList.appendChild(div);
        });
    }

    // ==========================================
    // 3. AI PLAYER
    // ==========================================
    if (aiPlayBtn) aiPlayBtn.addEventListener('click', async () => {
        if (!audioContextStarted) { await Tone.start(); audioContextStarted = true; }
        if (isManualPlaying) manualPlayBtn.click();
        playAiRoutine();
    });

    if (aiStopBtn) aiStopBtn.addEventListener('click', stopAiRoutine);

    function playAiRoutine() {
        let accumulatedTime = 0;
        const synth = new Tone.MembraneSynth().toDestination();

        aiPlayBtn.classList.add('hidden');
        aiStopBtn.classList.remove('hidden');

        currentRoutine.forEach((step, index) => {
            Tone.Transport.schedule((time) => {
                document.querySelectorAll('.step-item').forEach(el => el.classList.remove('active-step'));
                const active = document.querySelector(`.step-${index}`);
                if (active) {
                    active.classList.add('active-step');
                    active.scrollIntoView({ behavior: "smooth", block: "center" });
                }
                bpmDisplay.textContent = step.bpm > 0 ? step.bpm : "⏸";
            }, accumulatedTime);

            if (step.bpm > 0) {
                const beatInterval = 60 / step.bpm;
                Tone.Transport.scheduleRepeat((time) => {
                    synth.triggerAttackRelease("C2", "32n", time);
                }, beatInterval, accumulatedTime, step.duration_seconds);
            }
            accumulatedTime += step.duration_seconds;
        });

        Tone.Transport.schedule(() => {
            stopAiRoutine();
            statusMsg.textContent = "🏁 Routine Complete!";
        }, accumulatedTime);

        Tone.Transport.start();
    }

    function stopAiRoutine() {
        Tone.Transport.stop();
        Tone.Transport.cancel();
        aiPlayBtn.classList.remove('hidden');
        aiStopBtn.classList.add('hidden');
        document.querySelectorAll('.step-item').forEach(el => el.classList.remove('active-step'));
        bpmDisplay.textContent = manualBpm;
    }

    // ==========================================
    // 4. VOICE INPUT
    // ==========================================
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        const micBtn = document.getElementById('micBtn');
        if (micBtn) micBtn.addEventListener('click', () => {
            statusMsg.textContent = "👂 Listening...";
            recognition.start();
        });
        recognition.onresult = (e) => promptInput.value = e.results[0][0].transcript;
    }
});