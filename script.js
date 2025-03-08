// Tone.js Instruments
const reverb = new Tone.Reverb({ wet: 0.7, decay: 6 }).toDestination();
const delay = new Tone.FeedbackDelay("8n", 0.4).toDestination(); // Subtle delay for texture
const chorus = new Tone.Chorus(1.5, 2.5, 0.3).toDestination(); // Adds movement

const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sine" },
    envelope: { attack: 0.2, decay: 0.5, sustain: 0.5, release: 1.5 }
}).connect(reverb);

// Darker Synth (Smoother & More Musical)
const darkSynth = new Tone.PolySynth(Tone.Synth, {
    volume: -10, // Keep it subtle
    oscillator: { type: "sine" },
    envelope: { attack: 0.15, decay: 0.6, sustain: 0.7, release: 1.8 },
    polyphony: 8
}).connect(new Tone.Filter(1000, "lowpass").connect(chorus).connect(reverb)); 

// 🌊 Ambient Pad (Soft Noise for Atmosphere)
const padSynth = new Tone.NoiseSynth({
    volume: -20, // Keep it subtle
    noise: { type: "pink" },
    envelope: { attack: 2, decay: 5, sustain: 0.7, release: 3 }
}).connect(new Tone.AutoFilter("0.2n").toDestination());

// 🔉 Sub Bass for Depth
const subSynth = new Tone.MonoSynth({
    oscillator: { type: "sine" },
    envelope: { attack: 0.3, decay: 0.8, sustain: 0.6, release: 2 }
}).connect(new Tone.Filter(200, "lowpass").toDestination()); // Deep lowpass keeps it clean

const lowPass = new Tone.Filter(1200, "lowpass").toDestination();
synth.connect(lowPass);

// Chord Progression (for harmony)
const chordProgression = [
    ["C3", "D#3", "G3"],  // C Minor
    ["A2", "C3", "E3"],   // A Minor
    ["D3", "F3", "A3"],   // D Minor
    ["G2", "A#2", "D3"]   // G Minor
];
let chordIndex = 0;

// Scales
const minorScale = [2, 1, 2, 2, 1, 2, 2];
const keys = ['F', 'D', 'G', 'C', 'D#', 'A#'];
const key = keys[Math.floor(Math.random() * keys.length)];
const melodyScale = createScale(`${key}4`, minorScale);
const bassScale = createScale(`${key}2`, minorScale);

function createScale(root, mode) {
    const scale = [root];
    let note = root.slice(0, -1);
    let octave = parseInt(root.slice(-1));
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    for (const step of mode) {
        const noteIndex = notes.indexOf(note);
        const nextNoteIndex = (noteIndex + step) % notes.length;
        if (nextNoteIndex < noteIndex) octave += 1;
        note = notes[nextNoteIndex];
        scale.push(note + octave);
    }
    return scale;
}

// Packet Queue
let packetQueue = [];
const playbackInterval = 0.5; // Controlled timing
let lastPlayedNote = null;

// Start Tone.js on User Interaction
async function startMusic() {
    await Tone.start();
    console.log("🎵 Tone.js Ready");

    connectWebSocket();
    startPacketPlayback();

    // Start the ambient pad
    padSynth.triggerAttack();
}

// WebSocket Connection
function connectWebSocket() {
    const ws = new WebSocket("ws://localhost:8765");

    ws.onopen = () => {
        console.log("✅ WebSocket Connected");
    };

    ws.onmessage = function (event) {
        let packet = JSON.parse(event.data);
        console.log("📩 Queued Packet:", packet);
        packetQueue.push(packet);
    };

    ws.onclose = function () {
        console.warn("⚠️ WebSocket Disconnected! Reconnecting...");
        setTimeout(connectWebSocket, 2000);
    };

    ws.onerror = function (error) {
        console.error("❌ WebSocket Error:", error);
    };
}

// Regularly Process the Packet Queue
function startPacketPlayback() {
    setInterval(() => {
        if (packetQueue.length > 0) {
            let packet = packetQueue.shift();
            playPacketMusic(packet);
        }
    }, playbackInterval * 1000);
}

// Play Music from Queued Packets
function playPacketMusic(packet) {
    let startTime = Tone.now();
    let velocity = Math.min(0.6, packet.size / 2500);
    let melodyNote = melodyScale[(packet.size % melodyScale.length)];
    let bassNoteSet = getBassNotes(packet.size);
    let playSubBass = packet.size % 7 === 0; // Play sub-bass every few packets

    console.log(`🎶 Playing: ${melodyNote} (UDP) | ${bassNoteSet} (Other packets) | ${playSubBass ? "Sub Bass" : ""}, Protocol: ${packet.protocol}`);

    // Smooth glide between notes
    if (lastPlayedNote) {
        synth.set({ portamento: 0.1 });
    }
    lastPlayedNote = melodyNote;

    // Play melody (UDP Packets)
    if (packet.protocol === 17) {
        synth.triggerAttackRelease(melodyNote, "8n", startTime, velocity);
    }
    // Play darker synth for harmony (Non-UDP Packets)
    else {
        darkSynth.triggerAttackRelease(bassNoteSet, "4n", startTime, velocity * 0.7);
    }

    // Subtle Sub Bass (Every few packets)
    if (playSubBass) {
        subSynth.triggerAttackRelease(bassNoteSet[0], "4n", startTime, 0.5);
    }
}

// Function to pick bass notes (Root + Fifth or Root + Third + Fifth)
function getBassNotes(seed) {
    let chord = chordProgression[chordIndex % chordProgression.length];
    let useThreeNotes = seed % 3 === 0; // Occasionally use three-note harmony

    if (useThreeNotes) {
        return chord; // Return full triad (Root + Minor Third + Fifth)
    } else {
        return [chord[0], chord[2]]; // Return Root + Fifth
    }
}

// Attach click event to start music
document.body.addEventListener("click", startMusic);