const socket = io();

const localVideo = document.getElementById("localVideo");
const consultingRoom = document.getElementById("consultingRoom");
const inputRoomNumber = document.getElementById("roomNumber");
const btnGoRoom = document.getElementById("goRoom");
const selectRoom = document.getElementById("selectRoom");

let isMuted = false;
let isCameraOff = false;
let roomNumber = "";

const peers = {};
let localStream;

const configuration = {
    iceServers: [{
        urls: "stun:stun.services.mozilla.com",
        username: "louis@mozilla.com",
        credential: "webrtcdemo"
    }]
};

const streamConstraints = { audio: true, video: true };

btnGoRoom.onclick = () => {
    roomNumber = inputRoomNumber.value.trim();
    if (!roomNumber) {
        alert("Please enter a room number");
        return;
    }

    selectRoom.style.display = "none";
    consultingRoom.style.display = "block";

    document.getElementById("roomInfo").innerText = `Room: ${roomNumber}`;
    
    navigator.mediaDevices.getUserMedia(streamConstraints).then(stream => {
        localStream = stream;
        localVideo.srcObject = stream;

        socket.emit('create or join', roomNumber);
    }).catch(err => {
        console.error("Failed to access media devices:", err);
    });
};

// When receiving list of all users
socket.on('all-users', (users) => {
    users.forEach(userId => {
        const peerConnection = createPeerConnection(userId);
        peers[userId] = peerConnection;

        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        peerConnection.createOffer().then(offer => {
            return peerConnection.setLocalDescription(offer);
        }).then(() => {
            socket.emit('offer', {
                target: userId,
                sdp: peers[userId].localDescription
            });
        });
    });
});

// When a new user joins
socket.on('new-user', (userId) => {
    const peerConnection = createPeerConnection(userId);
    peers[userId] = peerConnection;

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });
});

// Handle offer
socket.on('offer', (data) => {
    const peerConnection = createPeerConnection(data.sender);
    peers[data.sender] = peerConnection;

    peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp)).then(() => {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
        return peerConnection.createAnswer();
    }).then(answer => {
        return peerConnection.setLocalDescription(answer);
    }).then(() => {
        socket.emit('answer', {
            target: data.sender,
            sdp: peers[data.sender].localDescription
        });
    });
});

// Handle answer
socket.on('answer', (data) => {
    peers[data.sender].setRemoteDescription(new RTCSessionDescription(data.sdp));
});

// Handle ICE candidate
socket.on('candidate', (data) => {
    peers[data.sender].addIceCandidate(new RTCIceCandidate(data.candidate));
});

document.getElementById("btnMute").onclick = () => {
    if (!localStream) return;
    isMuted = !isMuted;
    localStream.getAudioTracks()[0].enabled = !isMuted;
    document.getElementById("btnMute").innerText = isMuted ? "🔈 Unmute" : "🔇 Mute";
};

document.getElementById("btnCamera").onclick = () => {
    if (!localStream) return;
    isCameraOff = !isCameraOff;
    localStream.getVideoTracks()[0].enabled = !isCameraOff;
    document.getElementById("btnCamera").innerText = isCameraOff ? "📷 Start Camera" : "🎥 Stop Camera";
};

document.getElementById("btnCopy").onclick = () => {
    const url = `${window.location.origin}?room=${roomNumber}`;
    navigator.clipboard.writeText(url).then(() => {
        alert("Room link copied to clipboard!");
    });
};

socket.on('user-disconnected', (userId) => {
    console.log(`User ${userId} disconnected`);

    const video = document.getElementById(`video-${userId}`);
    if (video) video.remove();

    if (peers[userId]) {
        peers[userId].close();
        delete peers[userId];
    }
});

// Create peer connection
function createPeerConnection(userId) {
    const pc = new RTCPeerConnection(configuration);

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('candidate', {
                target: userId,
                candidate: event.candidate
            });
        }
    };

    pc.ontrack = (event) => {
        // Avoid duplicate video elements
        if (document.getElementById(`video-${userId}`)) return;

        const remoteVideo = document.createElement('video');
        remoteVideo.id = `video-${userId}`;
        remoteVideo.srcObject = event.streams[0];
        remoteVideo.autoplay = true;
        remoteVideo.playsInline = true;
        remoteVideo.style.width = "300px";
        remoteVideo.style.margin = "10px";
        consultingRoom.appendChild(remoteVideo);
    };

    return pc;
}

window.onload = () => {
    const params = new URLSearchParams(window.location.search);
    const roomFromURL = params.get('room');
    if (roomFromURL) {
        inputRoomNumber.value = roomFromURL;
        btnGoRoom.click();
    }
};

