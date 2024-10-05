import { Client } from "mpp-client-net";
import fs from "fs";
import path from "path";
import OpenAI from "openai";

const MPPNET_TOKEN = process.env.MPPNET_TOKEN;
const OWNER_ID = process.env.OWNER_ID;

const client = new Client("wss://mppclone.com", MPPNET_TOKEN);
const openai = new OpenAI();
let chat = "";

// 방 설정
const channelSettings = {
  visible: true,
  limit: 50,
  chat: true,
  crownsolo: false,
};

// 채팅 로그 파일 경로
const chatLogPath = path.resolve("../share/data/chatlog.json");

// 채팅 로그 조회 함수
function getChatLogsByUserId(userId) {
  if (fs.existsSync(chatLogPath)) {
    const chatLogs = JSON.parse(fs.readFileSync(chatLogPath, "utf-8"));
    return chatLogs[userId] || [];
  }
  return [];
}

// GPT에게 채팅 내역과 질문 전달 후 응답 받기
async function sendChatToGPT(userId, question) {
  const chatLogs = getChatLogsByUserId(userId);

  if (chatLogs.length === 0) {
    return `사용자 ID: ${userId}에 대한 채팅 기록이 없습니다.`;
  }

  // 채팅 내역을 GPT에게 제출할 형식으로 변환
  const chatContent = chatLogs.map((log) => log.message).join("\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: `Chat history: ${chatContent}\nQuestion: ${question}` }
    ],
  });

  return completion.choices[0].message.content;
}

// 채팅을 파일에 저장하는 함수 (유저 ID별로 정리)
function saveChatToFile(userId, message, timestamp) {
  const chatLogPath = path.resolve("../share/data/chatlog.json");

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

// 유저가 채팅할 때마다 발생하는 이벤트 (특정 명령어 처리 및 실시간 채팅 기록 저장)
client.on("a", async (msg) => {
  const userId = msg.p.id; // 유저 ID
  const message = msg.a; // 채팅 메시지
  const timestamp = new Date().toISOString(); // 현재 시간

  saveChatToFile(userId, message, timestamp); // 파일에 채팅 기록 저장

  // OWNER_ID 사용자가 특정 명령어를 입력했을 때
  if (userId === OWNER_ID && message.startsWith("/")) {
    const [command, targetUserId, ...questionParts] = message.split(" ");
    const question = questionParts.join(" ");

    if (command === `/${targetUserId}`) {
      const response = await sendChatToGPT(targetUserId, question);
      client.sendArray([{ m: "a", message: response }]); // GPT 응답을 채팅으로 전송
    }
  }
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
  createChannel("퍼리", channelSettings);
  console.log("방 생성 새로고침");
}, 600000);

// 일정 간격으로 chat 변수를 확인하고 비어 있지 않으면 채팅 전송
setInterval(() => {
  if (chat.trim()) {
    client.sendArray([{ m: "a", message: chat }]);
    chat = "";
  }
}, 100);
