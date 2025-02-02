/**
 * Simple WebRTC Client
 * 
 * This script sets up a simple WebRTC video call application with a signaling server.
 * The client handles the process of connecting to a signaling server, capturing local media,
 * establishing a peer-to-peer WebRTC connection, and exchanging SDP (offer/answer) and ICE candidates.
 *
 * Flow:
 * 1. It establishes a WebSocket connection to a signaling server for communication.
 * 2. The client captures local media (video/audio) using `navigator.mediaDevices.getUserMedia`.
 * 3. The user can initiate a call, which creates an SDP offer and sends it to the target client via the signaling server.
 * 4. Upon receiving an SDP offer, the client creates an SDP answer and sends it back.
 * 5. ICE candidates are exchanged between peers to establish a stable connection.
 * 6. Once the connection is established, the local video and remote video streams are displayed.
 * 7. The user can hang up the call, which stops media streams and closes the WebRTC connection.
 */

const socket = new WebSocket("ws://localhost:3000");

let peerConnection;
let localStream;
let remoteStream;
let remotePeerId = null;

const configuration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

async function init() {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    remoteStream = new MediaStream();

    document.getElementById("user-1").srcObject = localStream;
    document.getElementById("user-2").srcObject = remoteStream;

    peerConnection = new RTCPeerConnection(configuration);

    // Add local stream to connection
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // Handle incoming tracks
    peerConnection.ontrack = event => {
        console.log("Remote Stream Received:", event.streams[0]);
        event.streams[0].getTracks().forEach(track => {
            remoteStream.addTrack(track);
        });
        document.getElementById("user-2").srcObject = remoteStream;
    };

    // Send ICE candidates to the other peer
    peerConnection.onicecandidate = event => {
        if (event.candidate && remotePeerId) {
            console.log("Sending ICE Candidate:", event.candidate);
            socket.send(JSON.stringify({
                type: "ice-candidate",
                candidate: event.candidate,
                target: remotePeerId
            }));
        }
    };
}

// Initiate call
async function createOffer() {
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            console.log("Sending ICE Candidate (Offer):", event.candidate);
            socket.send(JSON.stringify({
                type: "ice-candidate",
                candidate: event.candidate,
                target: remotePeerId
            }));
        }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    console.log("Sending Offer:", offer);
    socket.send(JSON.stringify({
        type: "offer",
        offer,
        target: remotePeerId
    }));
}

// Accept incoming call
async function createAnswer(offer) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    console.log("Sending Answer:", answer);
    socket.send(JSON.stringify({
        type: "answer",
        answer,
        target: remotePeerId
    }));
}

socket.onmessage = async (event) => {
    const message = JSON.parse(event.data);
    console.log("Message Received:", message);

    if (message.type === "id") {
        console.log(`Your ID: ${message.id}`);
        document.getElementById("your-id").innerText = `Your ID: ${message.id}`;
    }

    if (message.type === "offer") {
        remotePeerId = message.source; // Store remote peer ID
        console.log("Offer received, creating answer...");
        await createAnswer(message.offer);
    }

    if (message.type === "answer") {
        console.log("Answer received, setting remote description...");
        await peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
    }

    if (message.type === "ice-candidate" && message.candidate) {
        console.log("Received ICE Candidate:", message.candidate);
        await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
    }
};

// Set target or call recipient
function connectToPeer() {
    remotePeerId = document.getElementById("peer-id").value;
    console.log(`Connecting to Peer ID: ${remotePeerId}`);
}

function hangUp() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
        localStream.getTracks().forEach(track => track.stop());
        remoteStream.getTracks().forEach(track => track.stop());
        document.getElementById('user-1').srcObject = null;
        document.getElementById('user-2').srcObject = null;
        remotePeerId = null;
    }
}

init();

document.getElementById("create-offer").addEventListener("click", createOffer);
document.getElementById("connect-peer").addEventListener("click", connectToPeer);
document.getElementById("hang-up").addEventListener("click", hangUp);