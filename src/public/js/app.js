// io()가 알아서 socket.io를 실행하고 있는 서버를 찾을거임
const socket = io();
// welcome id를 갖고있는 DOM을 welcome 변수에 저장
const welcome = document.getElementById("welcome");
// welcome이라는 id에서 "form"과 일치하는 element를 반환한다.
const form = welcome.querySelector("form");
const room = document.getElementById("room");

let chat = document.querySelector('#chat');
chat.scrollTop = chat.scrollHeight;

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");

const call = document.getElementById("call");
let myStream;
let muted = false;
let cameraOff = false;


call.hidden = true;
// let roomName;
let myPeerConnection;
let myDataChannel;



// async function getCameras() {
//   try {
//     // 장치리스트 가져오기
//     const devices = await navigator.mediaDevices.enumerateDevices();
//     // 카메라만 가져오기
//     const cameras = devices.filter((device) => device.kind === "videoinput");
//     console.log(cameras);
//   } catch (e) {
//     console.log(e);
//   }
// }

async function getMedia() {
  try {
    myStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    })
    myFace.srcObject = myStream;
    // await getCameras();
  } catch (e) {
    console.log(e);
  }
}

// getMedia();


function handleMuteClick() {
  myStream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled));
  if (!muted) {
    muteBtn.innerText = "소리킴";
    muted = true;
  } else {
    muteBtn.innerText = "음소거";
    muted = false;
  }
}

function handleCameraClick() {
  myStream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled));
  if (cameraOff) {
    cameraBtn.innerText = "카메라 끄기";
    cameraOff = false;
  } else {
    cameraBtn.innerText = "카메라 켜기";
    cameraOff = true;
  }
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);


window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = new SpeechRecognition();
recognition.interimResults = true;
recognition.lang = "ko-KR";


room.hidden = true;
// 방번호
let roomName;
// 메시지 내용
let texts = "";
// 소리감지체크
let sound_detect_check = false;
// 기록중지 하면 False => 안써도 동작함
let scribe = true;


// 서버로 보낼 json
let sockets =  {
  "room": "",
  "id": "",
  "talking_begin_time": 0,
  "message": "",
  "talking_end_time": 0
};


// 메시지 등록하는 함수(필요없음)
function addMessage(message) {
  const ul = document.getElementById("chat");
  const li = document.createElement("p");
  li.innerText = message;
  ul.append(li);
  const objDiv = document.getElementById("chat");
  objDiv.scrollTop = objDiv.scrollHeight;
}




// 룸에 들어왔음(필요없음)
function showRoom(){
  welcome.hidden = true;  // welcome 태그는 숨겨지고
  room.hidden = false;    // room 태그가 보인다.
}


// 나가기 버튼 클릭(리액트 - 종료버튼) => 종료버튼클릭시
function exit_room() {
  const date = new Date();
  socket.emit('forceDisconnect', date.getTime());
  location.reload();
}



// 입장하기버튼(리액트 - 회의시작)(헸음)
function handleRoomSubmit(event){
  getMedia();
  event.preventDefault();  // form 태그에서 submit을 누른 후 바로 새로고침되지 않도록 한다.

  // 회의 시간 받기
  const date = new Date();
  const meeting_start_time = date.getTime();
  const input = form.querySelector("input"); 
  const h3 = room.querySelector("h3");

  socket.emit("enter_room", input.value, meeting_start_time, showRoom);
  roomName = input.value;  // 얘가 showroom보다 먼저 실행됨. showroom은 callback 함수이므로!!
  console.log(roomName);
  h3.innerText = `방번호 : ${roomName}`;
  socket.emit("join_room", roomName);
  initCall();
  initCall();
  initCall();
  // 마이크를 켠다
  recognition.start();
  console.log("mike on");
}


// 음성인식 시작 로그 찍어야함 => 해야함
recognition.onstart = function () {
  sound_detect_check= false;
};


// 음성인식 감지 안되면 소켓에 종료시간과 메시지를 등록하고 초기화 => 녹음 다시 시작
recognition.onend = function () {
  const date = new Date();
  
  if (texts !== "") {
    sockets["message"] = texts;
    sockets["talking_end_time"] = date.getTime();
    sockets["room"] = roomName;

    // 여기서 소켓으로 보내야함
    // 새 이벤트 new_message. 백엔드로 보낸다.
    const h2 = room.querySelector("h2");

    // 막둥이 지능 올리기
    if (texts === "막둥아 기록 중지" || texts === "막둥 아 기록 중지.") {
      sockets["message"] = "기록중지@";
      h2.innerText = `기록중지`;
      socket.emit("new_message", sockets, roomName, ()=> {});
      console.log("기록중지");
    } else if (texts === "막둥아 기록 시작" || texts === "막둥 아 기록 시작.") {
      sockets["message"] = "기록시작@";
      h2.innerText = `기록시작`;
      socket.emit("new_message", sockets, roomName, ()=> {});
      console.log("다시시작");
    } else if (texts.includes("막둥아 별표") || texts.includes("막둥아 대표") || texts.includes("박동화 별표") || texts.includes("막둥 아 별표.")) {
      sockets["message"] = "별표*************";
      socket.emit("new_message", sockets, roomName, ()=> {
      addMessage(`막둥이 : ${sockets["message"]}`);
      });
      console.log("별표");
    } else if (texts.includes("막둥아 종료")) {
      socket.emit('forceDisconnect');
      location.reload();
    } 
    else {
      socket.emit("new_message", sockets, roomName, ()=> {
      addMessage(`나 : ${sockets["message"]}`);
      });
    }
  }
  texts = "";
  recognition.start();
};


// 음성감지 된경우 시작시간을 등록한다
recognition.onresult = function (e) {
  if (sound_detect_check !== true) {
    sockets["message"] = "";
    const date = new Date();
    sockets["talking_begin_time"] = date.getTime();
    sound_detect_check = true;
  }
  texts = Array.from(e.results)
    .map((results) => results[0].transcript)
    .join("");
};


// form은 element로서 이벤트를 수신할 수 있는 eventTarget이다.
// submit이라는 이벤트에 대한 콜백 함수를 지정한다.
// 완료
form.addEventListener("submit", handleRoomSubmit);

// 안해도됨
// socket.on("welcome", (user, newCount) => {
//   const h3 = room.querySelector("h3");
//   h3.innerText = `room ${roomName} (${newCount})`;
//   addMessage(`${user} 들어옴`);
// });
// socket.on("welcome", async () => {

// });

// 안해도됨
// socket.on("bye", (left, newCount) =>{
//   const h3 = room.querySelector("h3");  
//   h3.innerText = `room ${roomName} (${newCount})`;
//   addMessage(`${left} 나감`);
// });

// 필요없음
socket.on("new_message", addMessage);

// (필요없음)
socket.on("room_change", (rooms) => {
  const roomList = welcome.querySelector("ul");
  // roomList.innerHTML = "";
  // rooms 데이터로 받아온 자료들을 li에 하나씩 뿌려준 후 roomList에 넣어서 출력시킨다. 
  rooms.forEach(room => {
    const li = document.createElement("li");
    // li.innerText = room;
    // roomList.append(li);
  })
});

const stt = document.getElementById("chat");
stt.onkeyup = function (evt) {
  this.scrollTop = this.scrollHeight;
};


socket.on("welcome_rtc", async () => {
  myDataChannel = myPeerConnection.createDataChannel("chat");
  myDataChannel.addEventListener("message", (event) => console.log(event.data));
  console.log("made data channel");
  // 초대장 => 아래 코드 알림받는 브라우저(brave)에서 실행
  // brave가 offer만들고 offer전송
  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  console.log("sent the offer");
  // 어떤 방인지도 보내야함
  socket.emit("offer", offer, roomName);
});


// firefox가 초대장을 받는다. 
socket.on("offer", async (offer) => {
  myPeerConnection.addEventListener("datachannel", (event) => {
    myDataChannel = event.channel;
    myDataChannel.addEventListener("message", (event) =>
      console.log(event.data)
    );
  });
  console.log("received the offer");
  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName);
  console.log("sent the answer");
});


// brave 브라우저
socket.on("answer", (answer) => {
  console.log("received the answer");
  myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) => {
  console.log("received candidate");
  myPeerConnection.addIceCandidate(ice);
});


function handleIce(data) {
  console.log("sent candidate");
  socket.emit("ice", data.candidate, roomName);
}

function handleAddStream(data) {
  const peerFace = document.getElementById("peerFace");
  peerFace.srcObject = data.stream;
}

// (필요없음)
socket.on("scribe_start", msg => {
  const h2 = room.querySelector("h2");
  h2.innerText = "기록중";
  // h2.style.color="white";
  // document.getElementById("sc").style.color="white";
});


// (필요없음)
socket.on("scribe_end", msg => {
  const h2 = room.querySelector("h2");
  h2.innerText = "X기록중지X";
  // h2.style.color="red";
  // document.getElementById("sc").style.color="red";
});

socket.on("video_off", msc =>{
  const peerFace = document.getElementById("peerFace");
  peerFace.srcObject = null;
})


async function initCall() {
  welcome.hidden = true;
  call.hidden = false;
  await getMedia();
  makeConnection();
}

function makeConnection() {
  // 브라우저들 연결하기
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
          "stun:stun3.l.google.com:19302",
          "stun:stun4.l.google.com:19302",
        ],
      },
    ],
  });
  myPeerConnection.addEventListener("icecandidate", handleIce);
  myPeerConnection.addEventListener("addstream", handleAddStream);
  myStream
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, myStream));
}