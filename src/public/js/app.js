// io()가 알아서 socket.io를 실행하고 있는 서버를 찾을거임
const socket = io();
// welcome id를 갖고있는 DOM을 welcome 변수에 저장
const welcome = document.getElementById("welcome");
// welcome이라는 id에서 "form"과 일치하는 element를 반환한다.
const form = welcome.querySelector("form");
const room = document.getElementById("room");

window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = new SpeechRecognition();
recognition.interimResults = true;
recognition.lang = "ko-KR";

room.hidden = true;
let roomName;
let texts = "";
let sound_detect_check = false;
let scribe = true;

// 서버로 보낼 json
let sockets =  {
  "room": "",
  "id": "",
  "talking_begin_time": 0,
  "message": "",
  "talking_end_time": 0
};


// 현재 시간 구하는함수
function timeConverter(t){
  var date = new Date(t);
  var year = date.getFullYear();
  var month = "0" + (date.getMonth()+1);
  var day = "0" + date.getDate();
  var hour = "0" + date.getHours();
  var minute = "0" + date.getMinutes();
  var second = "0" + date.getSeconds();
  var ms = "0" + date.getMilliseconds();
  return year + "." + month.substr(-2) + "." + day.substr(-2) + " "+ hour.substr(-2) + ":" + minute.substr(-2) + ":" + second.substr(-2) + "." + ms.substr(-3);
}

function addMessage(message) {
  const ul = room.querySelector("ul");
  const li = document.createElement("li");
  li.innerText = message;
  ul.appendChild(li);
}


function handleMessageSubmit(event) {
  event.preventDefault();
  const input = room.querySelector("#msg input");
  const value = input.value;
  // 새 이벤트 new_message. 백엔드로 보낸다.
  socket.emit("new_message", input.value, roomName, ()=> {
    addMessage(`You : ${value}`);
  });
  input.value = '';
}


function handleNicknameSubmit(event) {
  event.preventDefault();
  const input = room.querySelector("#name input");
  sockets["id"] = input.value;
  socket.emit("nickname", input.value);
  console.log(input.value);
}


// 룸에 들어왔음
function showRoom(){
  welcome.hidden = true;  // welcome 태그는 숨겨지고
  room.hidden = false;    // room 태그가 보인다.
  const h3 = room.querySelector("h3");  
  h3.innerText = `room ${roomName}`;
  const msgForm = room.querySelector("#msg");
  const nameForm = room.querySelector("#name");
  msgForm.addEventListener("submit", handleMessageSubmit);
  nameForm.addEventListener("submit", handleNicknameSubmit);


}


function handleRoomSubmit(event){
  event.preventDefault();  // form 태그에서 submit을 누른 후 바로 새로고침되지 않도록 한다.
  const input = form.querySelector("input");  // form 태그에서 input DOM 찾기

  // 회의 시간 받기
  const date = new Date();
  meeting_start_time = date.getTime();

  socket.emit("enter_room", input.value, meeting_start_time, showRoom);
  roomName = input.value;  // 얘가 showroom보다 먼저 실행됨. showroom은 callback 함수이므로!!
  console.log(roomName);
  input.value = "";
  // 마이크를 켠다
  recognition.start();
  console.log("mike on");
}


// 음성인식 시작 로그 찍어야함
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
    // console.log(sockets);
    // 여기서 소켓으로 보내야함
    // 새 이벤트 new_message. 백엔드로 보낸다.
    const h2 = room.querySelector("h2");  
    if (texts === "막둥아 기록 중지") {
      sockets["message"] = "기록중지";
      h2.innerText = `기록중지`;
      socket.emit("new_message", sockets, roomName, ()=> {});
      console.log("기록중지");
    }
    else if (texts === "막둥아 기록 시작") {
      sockets["message"] = "기록시작";
      h2.innerText = `기록시작`;
      socket.emit("new_message", sockets, roomName, ()=> {});
      console.log("다시시작");
    }
    else if (texts.includes("막둥아 별표")) {
      socket.emit("new_message", sockets, roomName, ()=> {
      addMessage(`You : ${sockets["message"]}`);
      });
      console.log("별표");
    } else {
      socket.emit("new_message", sockets, roomName, ()=> {
      addMessage(`You : ${sockets["message"]}`);
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
form.addEventListener("submit", handleRoomSubmit);

socket.on("welcome", (user, newCount) => {
  const h3 = room.querySelector("h3");
  h3.innerText = `room ${roomName} (${newCount})`;
  addMessage(`${user} 들어옴`);
});

socket.on("bye", (left, newCount) =>{
  const h3 = room.querySelector("h3");  
  h3.innerText = `room ${roomName} (${newCount})`;
  addMessage(`${left} 나감`);
});


socket.on("new_message", addMessage);

socket.on("room_change", (rooms) => {
  const roomList = welcome.querySelector("ul");
  roomList.innerHTML = "";

  // rooms 데이터로 받아온 자료들을 li에 하나씩 뿌려준 후 roomList에 넣어서 출력시킨다. 
  rooms.forEach(room => {
    const li = document.createElement("li");
    li.innerText = room;
    roomList.append(li);
  })
});