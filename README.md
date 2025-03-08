# Network Harmony

This project turns **live network packets** into **musical notes** and visualizes them in real time. As packets arrive, they trigger **Tone.js** instruments (producing sound) and update a **D3** force-directed graph (showing network relationships). A vertical list of recent **notes** appears on the left side of the screen.

## How It Works

1. **Packet Capture & WebSocket**  
   - A Python script (`server.py`) uses [Scapy](https://scapy.net/) (or a similar tool) to capture packets on your network interface.
   - Each packet is parsed to extract fields such as `size`, `protocol`, `sourceIP`, and `destinationIP`.
   - The script sends this data in **JSON** format over a **WebSocket** to the client (your web page).

2. **Tone.js Music**  
   - On the client side, **Tone.js** instruments (e.g., `synth`, `darkSynth`, `subSynth`) are set up.
   - Every incoming packet triggers one or more musical notes based on packet size, protocol, and a chord progression.
   - For example, UDP packets (protocol 17) may trigger a bright synth note, TCP packets (protocol 6) may trigger a darker chord, and every 7th packet may trigger a sub-bass note.

3. **Notes Display**  
   - Each time a packet triggers sound, a **note tile** (e.g., “G4”, “D#5”) is added to the left column.
   - These notes fade out after a few seconds, providing a rolling history of recent notes.

4. **Force-Directed Graph**  
   - A **D3** force simulation displays a **node** for each IP address (either source or destination).
   - A **link** is drawn between two IP addresses whenever a packet connects them.
   - Nodes are color-coded by protocol:
     - **UDP (17)** = Green
     - **TCP (6)** = Orange
     - **ICMP** = Red
     - **Unknown** = Purple
   - The graph is **clamped** so that nodes remain within the visible boundaries of the graph area on the right side.


## Running the Project

1. **Start a Simple Web Server**  
   In your project directory, open a terminal and run:
   ```bash
   python -m http.server 8000
   ```

2. **Start the Packet-Capturing Server**
   Open a new terminal, and run:
   ```bash
   python3 servery.py
   ```
3. **Open the Web Page**
   Go to http://localhost:8000 in your browser and click the start button!


