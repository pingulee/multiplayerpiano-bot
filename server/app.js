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

// 날짜별로 채팅 내역을 그룹화하는 함수
function groupChatLogsByDate(chatLogs) {
  const groupedLogs = {};

  chatLogs.forEach((log) => {
    const date = log.timestamp.split("T")[0]; // 날짜만 추출 (년-월-일)
    if (!groupedLogs[date]) {
      groupedLogs[date] = [];
    }
    groupedLogs[date].push(log.message); // 같은 날짜의 메시지끼리 묶음
  });

  return groupedLogs;
}

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
    client.sendArray([
      { m: "a", message: `사용자 ID: ${userId}에 대한 채팅 기록이 없습니다.` },
    ]);
    return;
  }

  // 날짜별로 채팅 로그 그룹화
  const groupedLogs = groupChatLogsByDate(chatLogs);

  // 각 날짜별로 채팅 내역을 묶어서 GPT에게 전송할 내용 생성
  let chatContent = "";
  for (const date in groupedLogs) {
    const messages = groupedLogs[date].join("\n");
    chatContent += `Date: ${date}\n${messages}\n\n`; // 날짜별로 구분하여 추가
  }

  // 디버깅: GPT에게 전송할 질문과 채팅 내역 로그 출력
  console.log(`질문: ${question}`);
  console.log(`GPT로 보내는 채팅 내역: ${chatContent}`);

  // GPT에게 전송하는 채팅 내역을 채팅창에 출력
  client.sendArray([
    { m: "a", message: `GPT로 보내는 채팅 내역: ${chatContent}` },
  ]);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        {
          role: "user",
          content: `Chat history:\n${chatContent}\nQuestion: ${question}`,
        },
      ],
    });

    const gptResponse = completion.choices[0].message.content;
    client.sendArray([
      { m: "a", message: `'${userId}' ${question}: ${gptResponse}` },
    ]);
  } catch (error) {
    console.error("GPT 요청 오류:", error);
    client.sendArray([{ m: "a", message: "GPT 요청 중 오류가 발생했습니다." }]);
  }
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

    // 디버깅: 명령어와 질문 출력
    console.log(`명령어: ${command}, 대상: ${targetUserId}, 질문: ${question}`);

    if (targetUserId && question) {
      // GPT로 채팅 내역과 질문을 보내고 응답을 받음
      const response = await sendChatToGPT(targetUserId, question);
      client.sendArray([{ m: "a", message: response }]);
    } else {
      client.sendArray([
        {
          m: "a",
          message:
            "올바른 명령어 형식이 아닙니다. /{사용자ID} {질문} 형식으로 입력해 주세요.",
        },
      ]);
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
