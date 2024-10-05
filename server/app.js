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

// 채팅을 파일에 저장하는 함수 (유저 ID별로 정리)
function saveChatToFile(userId, message, timestamp) {
  let chatLogs = {};
  if (fs.existsSync(chatLogPath)) {
    const existingLogs = fs.readFileSync(chatLogPath, "utf-8");
    chatLogs = JSON.parse(existingLogs);
  }

  if (!chatLogs[userId]) {
    chatLogs[userId] = [];
  }

  chatLogs[userId].push({
    timestamp: timestamp,
    message: message,
  });

  fs.writeFileSync(chatLogPath, JSON.stringify(chatLogs, null, 2), "utf-8");
}

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
    client.sendArray([{ m: "a", message: `사용자 ID: ${userId}에 대한 채팅 기록이 없습니다.` }]);
    return `사용자 ID: ${userId}에 대한 채팅 기록이 없습니다.`;
  }

  // 채팅 내역을 질문에 포함시킴
  const chatContent = chatLogs.map(log => log.message).join("\n");
  const fullQuestion = `Chat history:\n${chatContent}\n\nBased on this chat history, answer the following question: ${question}`;

  // GPT에게 전송하는 질문 및 내역을 채팅창에 출력
  client.sendArray([{ m: "a", message: `질문: ${question}` }]);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: fullQuestion }
    ],
  });

  const gptResponse = completion.choices[0].message.content;
  client.sendArray([{ m: "a", message: `GPT 응답: ${gptResponse}` }]);

  return gptResponse;
}

// 유저가 채팅할 때마다 발생하는 이벤트 (실시간 채팅만 기록)
client.on("a", async (msg) => {
  const userId = msg.p.id;
  const message = msg.a;
  const timestamp = new Date().toISOString();

  saveChatToFile(userId, message, timestamp);

  // OWNER_ID 사용자가 특정 명령어를 입력했을 때
  if (userId === OWNER_ID && message.startsWith("/")) {
    // 명령어가 슬래시로 시작하는지 확인한 후, 실제 명령어 추출
    const command = message.substring(1).trim(); // 슬래시를 제거하고 명령어 부분 추출
    const [targetUserId, ...questionParts] = command.split(" ");
    const question = questionParts.join(" ").trim();

    if (targetUserId && question) {
      // GPT로 채팅 내역과 질문을 보내고 응답을 받음
      const response = await sendChatToGPT(targetUserId, question);
      client.sendArray([{ m: "a", message: response }]);
    } else {
      client.sendArray([{ m: "a", message: "올바른 명령어 형식이 아닙니다. /{사용자ID} {질문} 형식으로 입력해 주세요." }]);
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
  console.log(`${channelName} 채널로 접속`);
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
