import json
import csv
import argparse
from scapy.all import rdpcap, IP, TCP, UDP
from decimal import Decimal

def extract_pcap_data(pcap_file, output_format="json"):
    try:
        packets = rdpcap(pcap_file)  # Read the pcap file
    except FileNotFoundError:
        print(f"❌ Error: The file '{pcap_file}' was not found. Please check the file name and path.")
        return
    
    extracted_data = []

    for packet in packets:
        try:
            # Extract relevant data
            packet_info = {
                "timestamp": float(packet.time),  # Convert timestamp to float
                "size": len(packet),
                "protocol": "Unknown",
                "src_ip": packet[IP].src if IP in packet else "N/A",
                "dst_ip": packet[IP].dst if IP in packet else "N/A",
            }

            # Identify the protocol
            if TCP in packet:
                packet_info["protocol"] = "TCP"
            elif UDP in packet:
                packet_info["protocol"] = "UDP"

            extracted_data.append(packet_info)

        except Exception as e:
            print(f"⚠️ Error processing packet: {e}")

    # Save data as JSON or CSV
    output_file = f"pcap_data.{output_format}"
    if output_format == "json":
        with open(output_file, "w") as json_file:
            json.dump(extracted_data, json_file, indent=4)
    elif output_format == "csv":
        with open(output_file, "w", newline="") as csv_file:
            writer = csv.DictWriter(csv_file, fieldnames=extracted_data[0].keys())
            writer.writeheader()
            writer.writerows(extracted_data)

    print(f"✅ Data extracted and saved as {output_file}")

# Command-line arguments for flexibility
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract network packet data from a .pcap file.")
    parser.add_argument("pcap_file", help="Path to the pcap file")
    parser.add_argument("--format", choices=["json", "csv"], default="json", help="Output format (json or csv)")
    args = parser.parse_args()

    extract_pcap_data(args.pcap_file, args.format)