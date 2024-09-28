import { Client } from "mpp-client-net";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

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

// 방 생성/접속
function createChannel(channelName, settings) {
  client.start();
  client.setChannel(channelName, settings);
  console.log(channelName);
}

// 1시간마다 새로운 방을 생성/접속
function scheduleChannelCreation() {
  setInterval(() => {
    createChannel("한국방", channelSettings);
    console.log("방 생성 새로고침");
  }, 3600000);
}

// 채팅 데이터를 파일에 저장하는 함수
function saveChatToFile(username, message) {
  const currentDate = new Date().toISOString().split("T")[0]; // 현재 날짜 (YYYY-MM-DD 형식)
  const fileName = `chat_${currentDate}.txt`; // 날짜별 파일 이름
  const filePath = path.join(__dirname, fileName); // 파일 경로 설정

  const logMessage = `[${new Date().toLocaleTimeString()}] ${username}: ${message}\n`;

  fs.appendFile(filePath, logMessage, (err) => {
    if (err) {
      console.error("채팅을 파일에 저장하는 중 오류 발생:", err);
    } else {
      console.log("채팅이 파일에 저장되었습니다:", logMessage.trim());
    }
  });
}

// 블랙리스트 조회
function loadBlacklist() {
  const blacklistFile = path.join(__dirname, "blacklist.json");
  try {
    const data = fs.readFileSync(blacklistFile, "utf-8");
    const blacklist = JSON.parse(data).blacklist;
    return blacklist;
  } catch (err) {
    console.error("블랙리스트 파일을 읽는 중 오류 발생:", err);
    return [];
  }
}

// 유저를 퇴장
function kickUser(userId, reason) {
  client.sendArray([
    {
      m: "kickban",
      _id: userId,
      ms: 0, // 0ms로 즉시 퇴장시킴
    },
  ]);
  console.log(`유저 ${userId} 퇴장: ${reason}`);
  client.sendMessageToCurrentChannel(`유저 ${userId}가 퇴장되었습니다. 사유: ${reason}`);
}

// 모든 유저 채팅 기록
client.on("a", (msg) => {
  const username = msg.p.name; // 유저 이름
  const message = msg.a; // 채팅 메시지
  saveChatToFile(username, message); // 파일에 채팅 기록
});

// 방 접속 후 블랙리스트 유저 퇴장
client.on("hi", () => {
  console.log("방 생성/접속 성공");
  client.setNameAndColor("👁️🐽👁️", "#ff8687");
  client.checkAndTakeCrownUntilSuccess();

  const blacklist = loadBlacklist(); // 블랙리스트 로드

  client.on("p", (participant) => {
    const userId = participant.id; // 접속한 유저 ID
    const blacklistedUser = blacklist.find((user) => user.nickname === userId);

    if (blacklistedUser) {
      kickUser(userId, blacklistedUser.reason); // 블랙리스트에 있으면 퇴장
    }
  });
});

// 방 생성 및 스케줄링 시작
createChannel("한국방", channelSettings);
scheduleChannelCreation();
