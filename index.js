import { Client } from "mpp-client-net";
import dotenv from "dotenv";
import fs from "fs"; // 파일 시스템 모듈 추가
import path from "path"; // 경로 처리 모듈 추가

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

// 블랙리스트 로드 함수
function loadBlacklist() {
  const blacklistPath = path.join(__dirname, "blacklist");
  if (fs.existsSync(blacklistPath)) {
    const blacklistData = fs.readFileSync(blacklistPath, "utf-8");
    return blacklistData.split("\n").map((id) => id.trim()).filter(Boolean); // 엔터로 구분, 공백 제거
  } else {
    console.error("블랙리스트 파일이 존재하지 않습니다.");
    return [];
  }
}

// 블랙리스트 파일에서 블랙리스트 유저 ID 읽기
const blacklist = loadBlacklist();

// 방 생성/접속
function createChannel(channelName, settings) {
  client.start();
  client.setChannel(channelName, settings);
  console.log(channelName);
}

createChannel("한국방", channelSettings);

// 1시간마다 새로운 방을 생성/접속
function scheduleChannelCreation() {
  setInterval(() => {
    createChannel("한국방", channelSettings);
    console.log("방 생성 새로고침");
  }, 3600000);
}

// 왕관 가져오기
Client.prototype.takeCrown = function () {
  this.sendArray([
    {
      m: "chown",
      id: this.participantId,
    },
  ]);
};

// 왕관 상태를 체크하고 없으면 계속 시도
Client.prototype.checkAndTakeCrownUntilSuccess = function () {
  const interval = setInterval(() => {
    if (
      !this.channel.crown ||
      this.channel.crown.userId !== this.participantId
    ) {
      this.takeCrown();
    } else {
      console.log("왕관을 가져왔습니다.");
      clearInterval(interval);
    }
  }, 1000);
};

// 클라이언트 이름과 색상을 설정
Client.prototype.setNameAndColor = function (name, color) {
  this.sendArray([
    {
      m: "userset",
      set: { name: name, color: color },
    },
  ]);
};

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

scheduleChannelCreation();

// 블랙리스트 유저가 방에 있으면 퇴장시키는 함수
function kickBlacklistUser(userId) {
  if (blacklist.includes(userId)) {
    client.sendArray([
      {
        m: "kickban",
        id: userId,
        ms: 0, // 0분 퇴장
      },
    ]);
    console.log(`블랙리스트 유저 ${userId}를 퇴장시켰습니다.`);
  }
}

// 모든 유저의 채팅을 기록
client.on("a", (msg) => {
  const username = msg.p.name; // 유저 이름
  const message = msg.a; // 채팅 메시지
  saveChatToFile(username, message); // 파일에 채팅 기록
});

// 방에 새로운 유저가 접속할 때
client.on("participant added", (participant) => {
  const userId = participant._id; // 유저 ID
  console.log(`유저가 방에 접속했습니다: ${userId}`);

  // 블랙리스트에 있는지 확인하고 퇴장
  kickBlacklistUser(userId);
});

// 방 접속
client.on("hi", () => {
  console.log("방 생성/접속 성공");
  client.setNameAndColor("👁️🐽👁️", "#ff8687");
  client.checkAndTakeCrownUntilSuccess();
});
