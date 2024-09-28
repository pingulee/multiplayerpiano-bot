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

// 채팅 내용을 파일에 저장하는 함수
function saveChatToFile(username, message) {
  try {
    const timestamp = new Date();
    const formattedDate = timestamp.toISOString().split('T')[0]; // 날짜 (YYYY-MM-DD)
    const formattedTime = timestamp.toTimeString().split(' ')[0]; // 시간 (HH:MM:SS)

    const chatLog = {
      date: formattedDate,
      time: formattedTime,
      username: username,
      message: message,
    };

    // 파일 경로 지정
    const filePath = path.join(__dirname, 'chatlog.json');
    console.log(`파일 경로: ${filePath}`); // 디버그 로그

    // 파일이 이미 존재하는지 확인
    if (fs.existsSync(filePath)) {
      console.log('기존 파일에 기록을 추가합니다.'); // 디버그 로그
      // 파일이 존재하면 기존 내용을 읽어서 추가
      const existingData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      existingData.push(chatLog);
      fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
    } else {
      console.log('새로운 파일을 생성합니다.'); // 디버그 로그
      // 파일이 없으면 새로 생성
      fs.writeFileSync(filePath, JSON.stringify([chatLog], null, 2));
    }
  } catch (error) {
    console.error('채팅 기록을 파일에 저장하는 중 에러 발생:', error); // 에러 로그
  }
}

// 채팅을 받을 때마다 파일에 저장
client.on("a", (msg) => {
  const username = msg.p.name; // 유저 이름
  const message = msg.a; // 채팅 메시지
  console.log(`채팅 수신 - 유저: ${username}, 메시지: ${message}`); // 디버그 로그
  saveChatToFile(username, message); // 파일에 채팅 기록 저장
});

// 방 접속 성공 시 처리
client.on("hi", () => {
  console.log("방 생성/접속 성공");
  client.setNameAndColor("👁️🐽👁️", "#ff8687");
  client.checkAndTakeCrownUntilSuccess();
});

// 방 생성 및 스케줄링 시작 (10분마다 새로운 방 생성)
createChannel("한국방", channelSettings);
setInterval(() => {
  createChannel("한국방", channelSettings);
  console.log("방 생성 새로고침");
}, 600000);
