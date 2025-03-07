// Tone.js Instruments
const reverb = new Tone.Reverb({ wet: 0.7, decay: 6 }).toDestination();

const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sine" },
    envelope: { attack: 0.2, decay: 0.5, sustain: 0.5, release: 1.5 }
}).connect(reverb);

const piano = new Tone.Sampler({
    baseUrl: "https://tonejs.github.io/audio/salamander/",
    urls: {
        'C3': 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3', 'A3': 'A3.mp3',
        'C4': 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3', 'A4': 'A4.mp3',
        'C5': 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3', 'A5': 'A5.mp3'
    },
    release: 2
}).connect(reverb);

const lowPass = new Tone.Filter(1200, "lowpass").toDestination();
synth.connect(lowPass);

// IGMP Synth
const igmpSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.5, decay: 1, sustain: 0.8, release: 2 }
}).connect(new Tone.Reverb({ wet: 0.9, decay: 5 }).toDestination());

// Chords for Harmony
const chordProgression = [
    ["C4", "E4", "G4", "B4"],   // Cmaj7
    ["A3", "C4", "E4", "G4"],   // Am7
    ["D4", "F4", "A4", "C5"],   // Dm7
    ["G3", "B3", "D4", "F4"]    // G7
];
let chordIndex = 0;

// Scales
const minorScale = [2, 1, 2, 2, 1, 2, 2];
const keys = ['F', 'D', 'G', 'C', 'D#', 'A#'];
const key = keys[Math.floor(Math.random() * keys.length)];
const rightHandScale = createScale(`${key}4`, minorScale);
const leftHandScale = createScale(`${key}3`, minorScale);

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
const playbackInterval = 0.5; // More controlled timing
let activeSynthNote = null;
let activePianoNote = null;
let activeIgmpNote = null;
let lastPlayedNote = null;

let hasStarted = false;

// Start Tone.js on User Interaction
async function startMusic() {
    await Tone.start();
    console.log("🎵 Tone.js Ready");

    if (!hasStarted) {
        hasStarted = true;
        connectWebSocket();
        startPacketPlayback(); // Start processing the queue
        // playChords(); // Start harmonic progression
    }
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

// Background Chord Progression
function playChords() {
    setInterval(() => {
        let chord = chordProgression[chordIndex];
        synth.triggerAttackRelease(chord, "2n", Tone.now(), 0.4);
        chordIndex = (chordIndex + 1) % chordProgression.length;
    }, 4000); // Change chords every 4 seconds
}

// Play Music from Queued Packets
function playPacketMusic(packet) {
    let startTime = Tone.now();
    let pitch = rightHandScale[(packet.size % rightHandScale.length)];
    let velocity = Math.min(0.5, packet.size / 2500);

    if (packet.size > 1000) {
        pitch = leftHandScale[Math.floor(Math.random() * leftHandScale.length)];
        velocity *= 0.4;
    }

    console.log(`🎶 Playing: ${pitch}, Protocol: ${packet.protocol}`);

    // Portamento Effect (Gliding between notes)
    if (lastPlayedNote) {
        synth.set({
            portamento: 0.1 // Adds a smooth glide between notes
        });
    }
    lastPlayedNote = pitch;

    // Stop previous notes before playing a new one
    if (activeSynthNote) synth.triggerRelease(activeSynthNote);
    if (activePianoNote) piano.triggerRelease(activePianoNote);
    if (activeIgmpNote) igmpSynth.triggerRelease(activeIgmpNote);

    // Protocol Mappings
    if (packet.protocol === 17) { // UDP -- potentially melodic
        synth.triggerAttackRelease(pitch, 0.5, startTime, velocity * 0.6);
        activeSynthNote = pitch;
    }
    else if (packet.protocol === 6) { // TCP -- potentially base notes
        piano.triggerAttacRelease(pitch, 0.5, startTime, velocity * 0.8);
        activePianoNote = pitch;
    }
    else if (packet.protocol === 2) { // IGMP (New Pad Synth)
        igmpSynth.triggerAttackRelease(pitch, 0.5, startTime, velocity * 0.7);
        activeIgmpNote = pitch;
    }
    else if (packet.protocol === 1) { // ICMP (Percussion hit)
        let noiseSynth = new Tone.NoiseSynth({
            volume: -15,
            envelope: { attack: 0.01, decay: 0.1, sustain: 0 }
        }).toDestination();
        noiseSynth.triggerAttackRelease("8n");
    }
    else {
        console.warn(`🔍 Unmapped protocol: ${packet.protocol}`);
    }
}

// **Attach click event to start music**
document.body.addEventListener("click", startMusic);