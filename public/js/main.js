const createUserBtn = document.getElementById("create-user");
const username = document.getElementById("username");
const allusersHtml = document.getElementById("allusers");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const endCallBtn = document.getElementById("end-call-btn");
const socket = io();
let caller = [];

let localStream;

// Singleton Method(using the same instance of the method throughout the application)
// For PeerConnection
const PeerConnection = (function () {
  let peerConnection;

  const createPeerConnection = () => {
    const config = {
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
      ],
    };
    peerConnection = new RTCPeerConnection(config); // browser's webAPI
    // no need to download external library
    // add local stream to peer connection
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });
    // listen to remote stream and add to peer connection
    peerConnection.ontrack = function (event) {
      remoteVideo.srcObject = event.streams[0];
    };
    // listen to ICE-CANDIDATE
    peerConnection.onicecandidate = function (event) {
      if (event.candidate) {
        socket.emit("ice-candidate" , event.candidate);
      }
    };

    return peerConnection;
  };

  return {
    getInstance: () => {
      if (!peerConnection) {
        peerConnection = createPeerConnection();
      }
      return peerConnection;
    },
  };
})(); // immediately invoked function expression

// handle browser events
createUserBtn.addEventListener("click", (e) => {
  if (username.value !== "") {
    const usernameContainer = document.querySelector(".username-input");
    socket.emit("join-user", username.value);
    usernameContainer.style.display = "none";
  }
});

endCallBtn.addEventListener("click" , (e) => {
    socket.emit("call-ended" , caller);
})

// handle socket events
socket.on("joined", (allUsers) => {
  console.log(allUsers);

  //   <li>
  //     <span>Rizwan Khan (You)</span>
  //     <button class="call-btn"><img width="20" src="/images/phone.png" alt=""></button>
  //   </li>

  const createUsersHTML = () => {
    allusersHtml.innerHTML = "";

    for (const user in allUsers) {
      const li = document.createElement("li");
      li.textContent = `${user} ${user === username.value ? "(You)" : ""}`;

      if (user !== username.value) {
        const button = document.createElement("button");
        button.classList.add("call-btn");
        button.addEventListener("click", (e) => {
          startCall(user);
        });
        const img = document.createElement("img");
        img.setAttribute("src", "/images/phone.png");
        img.setAttribute("width", 20);

        button.appendChild(img);

        li.appendChild(button);
      }

      allusersHtml.appendChild(li);
    }
  };

  createUsersHTML();
});

socket.on("offer" , async ({from , to , offer}) => {
    const pc = PeerConnection.getInstance();
    // set remote description
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("answer" , {from , to , answer : pc.localDescription});
    caller = [from ,to];
});

socket.on("answer" , async ({from , to , answer}) => {
    const pc = PeerConnection.getInstance();
    await pc.setRemoteDescription(answer);
    // show end-call button
    endCallBtn.style.display = 'block';
    socket.emit("end-call" , {from , to});
    caller = [from ,to];
})

socket.on("ice-candidate" , async (candidate) => {
    console.log({candidate});
    const pc = PeerConnection.getInstance();
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
})

socket.on("end-call" , ({from ,to}) => {
    endCallBtn.style.display = block;
})

socket.on("call-ended" , (caller) => {
    endCall();
})

// startCall(user)
const startCall = async (user) => {
        console.log(user);

        const pc = PeerConnection.getInstance();
        const offer = await pc.createOffer();

        console.log({ offer });
        await pc.setLocalDescription(offer);
        socket.emit("offer", {
            from: username.value,
            to: user,
            offer: pc.localDescription,
        });
};

const endCall = () => {
    const pc = PeerConnection.getInstance();
    if(pc){
        pc.close();
        endCallBtn.style.display = 'none';
    }
}

// initialize App

const startMyVideo = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    console.log(stream);
    localStream = stream;
    localVideo.srcObject = stream;
  } catch (err) {}
};

startMyVideo();
