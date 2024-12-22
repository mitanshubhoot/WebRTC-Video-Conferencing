// getting dom elements
var divSelectRoom = document.getElementById("selectRoom");
var divConsultingRoom = document.getElementById("consultingRoom");
var inputRoomNumber = document.getElementById("roomNumber");
var btnGoRoom = document.getElementById("goRoom");
var localVideo = document.getElementById("localVideo");
var flag = 0;
var mixed;
var remoteVideo1 = document.getElementById("remoteVideo1");
var remoteVideo2 = document.getElementById("remoteVideo2");

// variables
var roomNumber;
var localStream;
var remoteStream1;
var remoteStream2;

var configuration = { iceServers: [{
    urls: "stun:stun.services.mozilla.com",
    username: "louis@mozilla.com", 
    credential: "webrtcdemo"
}, {
    urls: ["stun:stun.example.com", "stun:stun-1.example.com"]
}]
};

var rtcPeerConnection = new RTCPeerConnection(configuration);
var rtcPeerConnection1 = new RTCPeerConnection(configuration);
var streamConstraints = { audio: true, video: true };
var isCaller;
var cur = 0;
var count = 0;
var mixer;

// Let's do this
var socket = io();
var isChannelReady = false;
var isInitiator = false;
var isStarted = false;

btnGoRoom.onclick = function () {
    if (inputRoomNumber.value === '') {
        alert("Please type a room number")
    } else {
        roomNumber = inputRoomNumber.value;
        socket.emit('create or join', roomNumber);
        divSelectRoom.style = "display: none;";
        divConsultingRoom.style = "display: block;";
    }
};

// message handlers
socket.on('created', function (room) {
    navigator.mediaDevices.getUserMedia(streamConstraints).then(function (stream) {
        localStream = stream;
        mixer = new MultiStreamsMixer([localStream,localStream]);
        mixer.frameInterval = 1;
        mixer.startDrawingFrames();
        localVideo.srcObject = mixer.getMixedStream();
        mixed = mixer.getMixedStream();
        //localVideo.srcObject = stream;
        isCaller = true;
    }).catch(function (err) {
        console.log('An error ocurred when accessing media devices', err);
    });
    isInitiator = true;
    console.log("created");
});

socket.on('join', function (room){
    console.log('Another peer made a request to join room ' + room);
    console.log('This peer is the initiator of room ' + room + '!');
    isChannelReady = true;
    console.log("join");
  });

socket.on('joined', function (room) {
    navigator.mediaDevices.getUserMedia(streamConstraints).then(function (stream) {
        localStream = stream;
        localVideo.srcObject = stream;
        socket.emit('ready', roomNumber);
    }).catch(function (err) {
        console.log('An error ocurred when accessing media devices', err);
    });
    isChannelReady = true;
    console.log("joined");
});

socket.on('message', function(message) {
    //console.log('Client received message:', message);
  });

socket.on('owner', function(room) {
        navigator.mediaDevices.getUserMedia(streamConstraints).then(function (stream) {
        localStream = stream;
        localVideo.srcObject = stream;
        socket.emit('ready', roomNumber);
    }).catch(function (err) {
        console.log('An error ocurred when accessing media devices', err);
    });
    isChannelReady = true;
    console.log("owner "+cur)
});

socket.on('candidate', function (event) {
    var candidate = new RTCIceCandidate({
        sdpMLineIndex: event.label,
        candidate: event.candidate
    });
    if(cur == 1){
        rtcPeerConnection.addIceCandidate(candidate);
    }
    else if(cur == 2)
    rtcPeerConnection1.addIceCandidate(candidate);
    console.log("candidate "+cur);
    
});

socket.on('ready', function (room) {
    if (isCaller) {
            if(cur == 0){
            rtcPeerConnection.onicecandidate = onIceCandidate;
            rtcPeerConnection.ontrack = onAddStream;    
            rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
            rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
            rtcPeerConnection.createOffer()
                .then(sessionDescription => {
                    rtcPeerConnection.setLocalDescription(sessionDescription);
                    socket.emit('offer', {
                        type: 'offer',
                        sdp: sessionDescription,
                        room: roomNumber
                    });
                })
                .catch(error => {
                    console.log(error)
                })

                sendMessage('answer');
                //console.log("Ready "+room);
        }
        else if(cur == 1){
            rtcPeerConnection1.onicecandidate = onIceCandidate;
            rtcPeerConnection1.ontrack = onAddStream;
            rtcPeerConnection1.addTrack(localStream.getTracks()[0], localStream);
            rtcPeerConnection1.addTrack(localStream.getTracks()[1], localStream);
            rtcPeerConnection1.createOffer()
                .then(sessionDescription => {
                    rtcPeerConnection1.setLocalDescription(sessionDescription);
                    socket.emit('offer', {
                        type: 'offer',
                        sdp: sessionDescription,
                        room: roomNumber
                    });
                })
                .catch(error => {
                    console.log(error)
                })

                sendMessage('answer');
        }
    }
    console.log("ready ");
});

socket.on('offer', function (event,numClient) {
    if (!isCaller) {
        cur = numClient;
        if(cur == 1){
            rtcPeerConnection.onicecandidate = onIceCandidate;
            rtcPeerConnection.ontrack = onAddStream;
            rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
            rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
            rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
            rtcPeerConnection.createAnswer()
                .then(sessionDescription => {
                    rtcPeerConnection.setLocalDescription(sessionDescription);
                    socket.emit('answer', {
                        type: 'answer',
                        sdp: sessionDescription,
                        room: roomNumber
                    });
                })
                .catch(error => {
                    console.log(error)
                })
                console.log('offer'+numClient);

        console.log(rtcPeerConnection); 
        flag = 1;
        }
        else if(cur == 2){
            rtcPeerConnection1.onicecandidate = onIceCandidate;
            rtcPeerConnection1.ontrack = onAddStream;
            rtcPeerConnection1.addTrack(localStream.getTracks()[0], localStream);
            rtcPeerConnection1.addTrack(localStream.getTracks()[1], localStream);
            rtcPeerConnection1.setRemoteDescription(new RTCSessionDescription(event));
            rtcPeerConnection1.createAnswer()
                .then(sessionDescription => {
                    rtcPeerConnection1.setLocalDescription(sessionDescription);
                    socket.emit('answer', {
                        type: 'answer',
                        sdp: sessionDescription,
                        room: roomNumber
                    });
                })
                .catch(error => {
                    console.log(error)
                })
                console.log('offer'+numClient);

        flag = 1;
        }
    }
});

socket.on('answer', function (event,numClient) {
    cur = numClient;
    console.log('answer '+cur);
    if(cur == 1)
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
    else if(cur == 2)
    rtcPeerConnection1.setRemoteDescription(new RTCSessionDescription(event));
    flag = 1;
})

// handler functions
function onIceCandidate(event) {
    if (event.candidate) {
        console.log('sending ice candidate');
        socket.emit('candidate', {
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate,
            room: roomNumber
        })
        
    console.log("iceCandidate");

    sendMessage('sentIcecadidate');
    }
}

function onAddStream(event) {
    if(cur == 1){
    remoteStream1 = event.streams[0];
    /* var mixer1 = new MultiStreamsMixer([localStream,remoteStream1]);
    mixer1.frameInterval = 1;
    mixer1.startDrawingFrames(); 
    mixed = mixer1.getMixedStream(); 
    remoteVideo1.srcObject = mixed; */

    remoteVideo1.srcObject = event.streams[0];
    }
    else if(cur == 2){
        remoteStream2 = event.streams[0];  
        /* var mixer1 = new MultiStreamsMixer([localStream,remoteStream1,remoteStream2]);
        mixer1.frameInterval = 1;
        mixer1.startDrawingFrames();
        mixed = mixer1.getMixedStream(); 
        remoteVideo1.srcObject = mixed */
        
        remoteVideo2.srcObject = event.streams[0];       
    }
    sendMessage('got user media');
}

function sendMessage(message) {
    //console.log('Client sending message: ', message);
    socket.emit('message', message);
}