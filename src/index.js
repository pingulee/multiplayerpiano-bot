import { Client } from "mpp-client-net";
import fs from "fs";
import path from "path";
import OpenAI from "openai";

const MPPNET_TOKEN = process.env.MPPNET_TOKEN;
const OwnerId = process.env.OWNER_ID;
const openai = new OpenAI();

const client = new Client("wss://mppclone.com", MPPNET_TOKEN);

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
createChannel("한국방", channelSettings);
setInterval(() => {
  createChannel("한국방", channelSettings);
  console.log("방 생성 새로고침");
}, 600000);
