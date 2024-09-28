const { Client } = require("mpp-client-net");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const { OpenAIApi } = require("openai");

dotenv.config();

// OpenAI API 설정
const openai = new OpenAIApi({
  apiKey: process.env.OPENAI_API_KEY, // OpenAI API 키 설정 (dotenv 파일에서 가져옴)
});

const MPPNET_TOKEN = process.env.MPPNET_TOKEN;
const OwnerId = process.env.OWNER_ID;

const client = new Client("wss://mppclone.com", MPPNET_TOKEN);

// 방 설정
const channelSettings = {
  visible: true,
  limit: 50,
  chat: true,
  crownsolo: false,
};

// 채팅 로그와 GPT 상호작용을 위한 상태 저장
let chatHistory = []; // 채팅 내역을 저장할 배열

// 채팅을 파일에 저장하는 함수 (유저 ID별로 정리)
function saveChatToFile(userId, message, timestamp) {
  const chatLogPath = path.resolve("chatlog.json");

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

  // 메모리에 채팅 기록도 저장
  chatHistory.push({ userId, message, timestamp });
}

// GPT-4 API 호출 함수
async function askGPT(question) {
  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-4", // GPT-4 모델 사용
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        // 채팅 내역을 이전 대화로 추가
        ...chatHistory.map((chat) => ({
          role: "user",
          content: `User(${chat.userId}): ${chat.message}`,
        })),
        { role: "user", content: question }, // 사용자가 질문한 내용
      ],
    });

    return completion.data.choices[0].message.content; // GPT의 답변 반환
  } catch (error) {
    console.error("GPT 요청 중 오류 발생:", error);
    return "GPT 요청 중 오류가 발생했습니다.";
  }
}

// 유저가 채팅할 때마다 발생하는 이벤트 (실시간 채팅만 기록)
client.on("a", (msg) => {
  const userId = msg.p.id; // 유저 ID
  const message = msg.a; // 채팅 메시지
  const timestamp = new Date().toISOString(); // 현재 시간
  saveChatToFile(userId, message, timestamp); // 파일 및 메모리에 채팅 기록 저장

  // GPT에게 질문하는 경우 채팅에 "/질문"으로 시작하도록 설정
  if (message.startsWith("/질문 ")) {
    const question = message.replace("/질문 ", "");
    askGPT(question).then((gptResponse) => {
      // GPT의 답변을 방에 출력
      client.sendArray([
        {
          m: "a",
          message: `GPT의 답변: ${gptResponse}`,
        },
      ]);
    });
  }
});

// 클라이언트 접속 후 이름과 색깔 설정 및 왕관 체크
client.on("hi", () => {
  console.log("방 생성/접속 성공");
  client.setNameAndColor("👁️🐽👁️", "#ff8687");
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
}, 600000); // 10분마다 방 새로 생성
