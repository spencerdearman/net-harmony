# Network Harmony

https://github.com/user-attachments/assets/09d4e192-2ad4-4f09-a864-6351dcd351b2

This project turns **live network packets** into **musical notes** and visualizes them in real time. As packets arrive, they trigger **Tone.js** polySynth's and update a force-directed graph based on network relationships (IP addresses). The notes being loaded into the playing queue are shown on the left hand side of the screen as they arrive.

## How It Works

1. **Packet Capture & WebSocket**  
   - A Python script (`server.py`) uses [Scapy](https://scapy.net/) to capture packets from your network.
   - Each packet is parsed to extract the `size`, `protocol`, `sourceIP`, and `destinationIP`.
   - The script sends this data in **JSON** format over a **WebSocket** to the client.

2. **Tone.js Music**  
   - On the client side, **Tone.js** instruments are initialized waiting to be played.
   - Every incoming packet triggers one or more musical notes based on packet size, protocol, and a chord progression.
   - For example, UDP packets (protocol 17) trigger the main synth, TCP packets (protocol 6) trigger a darker chord, and every 7th packet triggers a sub-bass note.

3. **Notes Display**  
   - Each time a packet triggers sound, a **note tile** (e.g., “G4”, “D#5”) is added to the left column.
   - These notes fade out after a few seconds, showing the rolling history of recent notes.

4. **Force-Directed Graph**  
   - A **D3** force simulation displays a **node** for each IP address (either source or destination). I decided to use D3 force simulation due to the animations and cool physics behind the graphs.
   - A **link** is drawn between two IP addresses whenever a packet connects them.
   - Nodes are color-coded by protocol:
     - **UDP (17)** = Green
     - **TCP (6)** = Orange
     - **ICMP** = Red
     - **Unknown** = Purple

## Running the Project

1. **Start the Web Server**  
   In your project digrrectory, open a terminal and run:
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


