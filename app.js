import { Client } from "mpp-client-net";
import fs from "fs";
import path from "path";
import readline from "readline"; // 콘솔 입력을 위한 모듈 추가
import express from "express"; // 웹 인터페이스를 위한 Express 모듈
import bodyParser from "body-parser"; // POST 요청 처리

const MPPNET_TOKEN = process.env.MPPNET_TOKEN;
const OwnerId = process.env.OWNER_ID;

const client = new Client("wss://mppclone.com", MPPNET_TOKEN);

let chat = ""; // 채팅 메시지를 저장하는 변수

// 방 설정
const channelSettings = {
  visible: true,
  limit: 50,
  chat: true,
  crownsolo: false,
};

// 채팅을 파일에 저장하는 함수 (유저 ID별로 정리)
function saveChatToFile(userId, message, timestamp) {
  const chatLogPath = path.resolve("data/chatlog.json");

  // 기존 채팅 로그 파일이 있으면 불러옴, 없으면 빈 객체 생성
  let chatLogs = {};
  if (fs.existsSync(chatLogPath)) {
    const existingLogs = fs.readFileSync(chatLogPath, "utf-8");
    chatLogs = JSON.parse(existingLogs);
  }

  // 유저 ID별로 기록 저장
  if (!chatLogs[userId]) {
    chatLogs[userId] = [];
  }

  // 새로운 채팅 기록 추가
  chatLogs[userId].push({
    timestamp: timestamp,
    message: message,
  });

  // 변경된 채팅 로그를 파일에 다시 저장
  fs.writeFileSync(chatLogPath, JSON.stringify(chatLogs, null, 2), "utf-8");
}

// 유저가 채팅할 때마다 발생하는 이벤트 (실시간 채팅만 기록)
client.on("a", (msg) => {
  const userId = msg.p.id; // 유저 ID
  const message = msg.a; // 채팅 메시지
  const timestamp = new Date().toISOString(); // 현재 시간
  saveChatToFile(userId, message, timestamp); // 파일에 채팅 기록 저장
});

// 클라이언트 접속 후 이름과 색깔 설정 및 왕관 체크
client.on("hi", () => {
  console.log("방 생성/접속 성공");
  client.setNameAndColor("🐖", "#ff8687");
  client.checkAndTakeCrownUntilSuccess();
});

// 방 생성/접속
function createChannel(channelName, settings) {
  client.start();
  client.setChannel(channelName, settings);
  console.log(channelName);
}

// 방 생성 및 10분마다 새로 방을 생성
createChannel("퍼리", channelSettings);
setInterval(() => {
  createChannel("한국방", channelSettings);
  console.log("방 생성 새로고침");
}, 600000);

// Express 앱 생성
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// 채팅 입력 폼 제공
app.get("/", (req, res) => {
  res.send(`
    <html>
    <body>
      <form action="/chat" method="POST">
        <input type="text" name="message" placeholder="채팅 입력" required />
        <button type="submit">전송</button>
      </form>
    </body>
    </html>
  `);
});

// 채팅 입력을 받아서 처리
app.post("/chat", (req, res) => {
  const message = req.body.message;
  if (message.trim()) {
    chat = message; // 입력 받은 메시지를 chat 변수에 저장
    
    console.log(`웹에서 입력된 메시지: ${message}`);
  }
  res.redirect("/"); // 입력 후 다시 폼으로 리다이렉트
});

// 일정 간격으로 chat 변수를 확인하고 비어 있지 않으면 채팅 전송
setInterval(() => {
  if (chat.trim()) {
    client.sendArray([{ m: "a", message: chat }]);
    chat = "";
  }
}, 100);

// 웹 서버 시작
const PORT = 3000;
app.listen(PORT, '0.0.0.0');
