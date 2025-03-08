// ---------------------------------------------
//  Tone.js Instruments & Setup
// ---------------------------------------------

const reverb = new Tone.Reverb({ wet: 0.7, decay: 6 }).toDestination();
const chorus = new Tone.Chorus(1.5, 2.5, 0.3).toDestination();

// The main synth used for UDP packets and melody
const synth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: "sine" },
  envelope: { attack: 0.2, decay: 0.5, sustain: 0.5, release: 1.5 }
}).connect(reverb);

// The synth used for TCP packets and bass
const darkSynth = new Tone.PolySynth(Tone.Synth, {
  volume: -10,
  oscillator: { type: "sine" },
  envelope: { attack: 0.15, decay: 0.6, sustain: 0.7, release: 1.8 },
  polyphony: 8
}).connect(new Tone.Filter(1000, "lowpass").connect(chorus).connect(reverb));

// The synth used for background noise
const padSynth = new Tone.NoiseSynth({
  volume: -20,
  noise: { type: "pink" },
  envelope: { attack: 2, decay: 5, sustain: 0.7, release: 3 }
}).connect(new Tone.AutoFilter("0.2n").toDestination());

// The synth used for every 7th packet
const subSynth = new Tone.MonoSynth({
  oscillator: { type: "sine" },
  envelope: { attack: 0.3, decay: 0.8, sustain: 0.6, release: 2 }
}).connect(new Tone.Filter(200, "lowpass").toDestination());

const lowPass = new Tone.Filter(1200, "lowpass").toDestination();
synth.connect(lowPass);

// Chord progression for bass notes
const chordProgression = [
  ["C3", "D#3", "G3"],  // C Minor
  ["A2", "C3", "E3"],   // A Minor
  ["D3", "F3", "A3"],   // D Minor
  ["G2", "A#2", "D3"]   // G Minor
];
let chordIndex = 0;

// Scale Logic -- Based on In-Class Demo
const minorScale = [2, 1, 2, 2, 1, 2, 2];
const keys = ['F', 'D', 'G', 'C', 'D#', 'A#'];
const key = keys[Math.floor(Math.random() * keys.length)];
const melodyScale = createScale(`${key}4`, minorScale);

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
const playbackInterval = 0.5;
let lastPlayedNote = null;

// ---------------------------------------------
// Play Music + Integrate Visuals
// ---------------------------------------------

// Play a packet as music
function playPacketMusic(packet) {
    let startTime = Tone.now();
    let velocity = Math.min(0.6, packet.size / 2500);
    let melodyNote = melodyScale[(packet.size % melodyScale.length)];
    let bassNoteSet = getBassNotes(packet.size);
    let playSubBass = packet.size % 7 === 0;
  
    if (lastPlayedNote) {
      synth.set({ portamento: 0.1 });
    }
    lastPlayedNote = melodyNote;
  
    let protocolClass = "unknown";
    if (packet.protocol === 17) {
      synth.triggerAttackRelease(melodyNote, "8n", startTime, velocity);
      protocolClass = "udp";
    } else {
      darkSynth.triggerAttackRelease(bassNoteSet, "4n", startTime, velocity * 0.7);
      protocolClass = "tcp";
    }
    if (playSubBass) {
      subSynth.triggerAttackRelease(bassNoteSet[0], "4n", startTime, 0.5);
    }
  
    updateNoteVisualizer(melodyNote, protocolClass);
    addPacketToGraph(packet);
  }
  
  // Update the note visualizer with the current note
  function updateNoteVisualizer(noteText, protocolClass) {
    const noteElement = document.createElement("div");
    noteElement.classList.add("note", protocolClass);
    noteElement.textContent = `🎶 ${noteText}`;
    document.getElementById("notes-display").prepend(noteElement);
    setTimeout(() => noteElement.remove(), 4000);
  }
  
  // Get the bass notes for a given seed
  function getBassNotes(seed) {
    let chord = chordProgression[chordIndex % chordProgression.length];
    let useThreeNotes = seed % 3 === 0;
    return useThreeNotes ? chord : [chord[0], chord[2]];
  }
  
  // ---------------------------------------------
  // WebSocket + Playback
  // ---------------------------------------------
  
  // Start the music and WebSocket connection
  async function startMusic() {
    await Tone.start();
    console.log("🎵 Tone.js Ready");
    connectWebSocket();
    startPacketPlayback();
    padSynth.triggerAttack();
  }
  
  // Connect to the WebSocket server
  function connectWebSocket() {
    const ws = new WebSocket("ws://localhost:8765");
    ws.onopen = () => {
      console.log("WebSocket Connected");
    };
    ws.onmessage = function(event) {
      let packet = JSON.parse(event.data);
      console.log("📩 Queued Packet:", packet);
      packetQueue.push(packet);
    };
    ws.onclose = () => {
      console.warn("WebSocket Disconnected! Reconnecting...");
      setTimeout(connectWebSocket, 2000);
    };
    ws.onerror = (error) => {
      console.error("WebSocket Error:", error);
    };
  }
  
  // Start the packet playback interval
  function startPacketPlayback() {
    setInterval(() => {
      if (packetQueue.length > 0) {
        let packet = packetQueue.shift();
        playPacketMusic(packet);
      }
    }, playbackInterval * 1000);
  }

// ---------------------------------------------
// D3 Force-Directed Graph Setup
// https://d3js.org/d3-force/simulation
// ---------------------------------------------

const svg = d3.select("#network-graph");

// The width/height of the entire window (for bounding)
const width = window.innerWidth;
const height = window.innerHeight;

// Data arrays for D3
let nodes = [];
let links = [];
const nodeByIP = new Map();

// Force simulation
const simulation = d3.forceSimulation(nodes)
  .force("charge", d3.forceManyBody().strength(-50))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .force("link", d3.forceLink(links).id(d => d.id).distance(120))
  .on("tick", ticked);

// Selections for links & nodes
let linkSelection = svg.selectAll(".link");
let nodeSelection = svg.selectAll(".node");

// Margin for bounding nodes
const margin = 30;

function ticked() {
  linkSelection
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y);

  // Keep the nodes within the bounds
  nodeSelection
    .attr("cx", d => {
      d.x = Math.max(margin, Math.min(width - margin, d.x));
      return d.x;
    })
    .attr("cy", d => {
      d.y = Math.max(margin, Math.min(height - margin, d.y));
      return d.y;
    });
}

// Map protocol to color
function getColorForProtocol(protocol) {
  if (protocol === 17) {
    return "#1DB954"; // UDP -> Green
  } else if (protocol === 6) {
    return "#F39C12"; // TCP -> Orange
  } else {
    return "#7D3C98"; // Purple
  }
}

// Update graph with current nodes and links
function updateGraph() {
  linkSelection = linkSelection.data(links);
  linkSelection.exit().remove();
  linkSelection = linkSelection.enter()
    .append("line")
    .attr("class", "link")
    .attr("stroke", "#999")
    .attr("stroke-width", 1)
    .merge(linkSelection);

  nodeSelection = nodeSelection.data(nodes);
  nodeSelection.exit().remove();
  nodeSelection = nodeSelection.enter()
    .append("circle")
    .attr("class", "node")
    .attr("r", 10)
    .attr("fill", d => getColorForProtocol(d.protocol))
    .merge(nodeSelection);

  simulation.nodes(nodes);
  simulation.force("link").links(links);
  simulation.alpha(0.9).restart();
}

// Add a packet to the graph
function addPacketToGraph(packet) {
  if (!packet.sourceIP || !packet.destinationIP) {
    return;
  }
  if (!nodeByIP.has(packet.sourceIP)) {
    const newNode = { id: packet.sourceIP, protocol: packet.protocol };
    nodes.push(newNode);
    nodeByIP.set(packet.sourceIP, newNode);
  }
  if (!nodeByIP.has(packet.destinationIP)) {
    const newNode = { id: packet.destinationIP, protocol: packet.protocol };
    nodes.push(newNode);
    nodeByIP.set(packet.destinationIP, newNode);
  }
  links.push({
    source: packet.sourceIP,
    target: packet.destinationIP,
    protocol: packet.protocol
  });
  updateGraph();
}
