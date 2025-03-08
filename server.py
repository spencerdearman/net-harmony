import asyncio
import websockets
import json
from scapy.all import sniff, IP  # Import IP layer for packet inspection

async def process_packet(packet):
    """Extract relevant fields from a network packet."""
    try:
        data = {
            "timestamp": packet.time,
            "size": len(packet),
            "protocol": packet.proto if hasattr(packet, "proto") else "Unknown"
        }
        # If the packet has an IP layer, extract the source and destination IPs
        if packet.haslayer(IP):
            data["sourceIP"] = packet[IP].src
            data["destinationIP"] = packet[IP].dst
        return data
    except Exception as e:
        print(f"❌ Error processing packet: {e}")
        return None

async def send_packets(websocket):
    """Continuously capture packets and send them to the WebSocket client."""
    print("🌐 WebSocket Client Connected!")
    try:
        while True:
            packets = sniff(count=5, timeout=1)  # Capture packets with timeout
            for packet in packets:
                data = await process_packet(packet)
                if data:
                    await websocket.send(json.dumps(data))
                    print(f"🚀 Sent: {data}")
            await asyncio.sleep(1)  # Prevent flooding
    except websockets.exceptions.ConnectionClosed:
        print("⚠️ WebSocket Disconnected!")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
    finally:
        print("⚠️ Closing WebSocket connection")

async def main():
    print("🚀 Starting WebSocket Server on ws://localhost:8765...")
    server = await websockets.serve(send_packets, "localhost", 8765)
    try:
        await server.wait_closed()  # Keeps the server running
    except KeyboardInterrupt:
        print("\n🛑 Server stopped manually")

if __name__ == "__main__":
    asyncio.run(main())