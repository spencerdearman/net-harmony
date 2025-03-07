// THIS IS A REALLY

// Load JSON Data
fetch("pcap_data.json")
  .then(response => response.json())
  .then(data => {
      window.pcapData = data;  // Store data globally
  })
  .catch(error => console.error("Error loading JSON:", error));

// Tone.js Instruments
const reverb = new Tone.Reverb({ wet: 0.7, decay: 6 }).toDestination();

const piano = new Tone.Sampler({
    baseUrl: "https://tonejs.github.io/audio/salamander/",
    urls: {
        'C3': 'C3.mp3',
        'D#3': 'Ds3.mp3',
        'F#3': 'Fs3.mp3',
        'A3': 'A3.mp3',
        'C4': 'C4.mp3',
        'D#4': 'Ds4.mp3',
        'F#4': 'Fs4.mp3',
        'A4': 'A4.mp3',
        'C5': 'C5.mp3',
        'D#5': 'Ds5.mp3',
        'F#5': 'Fs5.mp3',
        'A5': 'A5.mp3'
    },
    release: 2
}).connect(reverb);

const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sine" }, // Soften the attack
    envelope: { attack: 0.2, decay: 0.4, sustain: 0.4, release: 1.2 }
}).connect(reverb);

const bass = new Tone.MonoSynth({
    oscillator: { type: "triangle" }, // Warmer sound
    envelope: { attack: 0.5, decay: 1, sustain: 0.5, release: 1.5 }
}).toDestination();

// Scales
const minor = [2, 1, 2, 2, 1, 2, 2];
const keys = ['F', 'D', 'G', 'C', 'D#', 'A#'];
const key = keys[Math.floor(Math.random() * keys.length)];
const rightHandScale = createScale(`${key}4`, minor);
const leftHandScale = createScale(`${key}3`, minor);

// Generate Scale Function
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

let hasStarted = false;

// Start Tone.js on User Interaction
async function startMusic() {
    await Tone.start();
    console.log("Tone.js Ready");

    if (!hasStarted && window.pcapData) {
        hasStarted = true;
        processNetworkData(window.pcapData);
    }
}

// Function to Map Packet Data to Music
function processNetworkData(packets) {
    let startTime = Tone.now();
    let timeOffset = 0;

    packets.forEach((packet, index) => {
        let delay = (packet.timestamp % 2) + timeOffset; 
        let pitch = rightHandScale[(packet.size % rightHandScale.length)];
        let duration = Math.max(0.4, (packet.size % 700) / 800);
        let velocity = Math.min(0.8, packet.size / 2000); 

        // Adjust harsh sounds by transposing UDP notes lower
        if (packet.protocol === "UDP") {
            pitch = leftHandScale[Math.floor(Math.random() * leftHandScale.length)]; // Lower tones for softness
            synth.triggerAttackRelease(pitch, duration, startTime + delay, velocity * 0.6);
        } else if (packet.protocol === "TCP") {
            piano.triggerAttackRelease(pitch, duration, startTime + delay, velocity * 0.8);
        }

        // Play bass for larger packets
        if (packet.size > 1000) {
            let bassNote = leftHandScale[Math.floor(Math.random() * leftHandScale.length)];
            bass.triggerAttackRelease(bassNote, "2n", startTime + delay);
        }

        console.log(`Playing: ${pitch}, Duration: ${duration}, Protocol: ${packet.protocol}`);
        
        timeOffset += 0.25;
    });
}

