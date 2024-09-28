import { Client } from "mpp-client-net";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const MPPNET_TOKEN = process.env.MPPNET_TOKEN;
const OwnerId = process.env.OWNER_ID;
const chatLogFilePath = path.join(__dirname, "chatlog.json"); // 저장할 파일 경로

const client = new Client("wss://mppclone.com", MPPNET_TOKEN);

// 방 설정
const channelSettings = {
  visible: true,
  limit: 50,
  chat: true,
  crownsolo: false,
};

// 채팅 로그를 파일에 저장하는 함수
function saveChatToFile(username, message) {
  const timestamp = new Date().toISOString(); // 현재 시간 (ISO 형식)
  const chatEntry = {
    date: timestamp.split("T")[0], // 날짜 (YYYY-MM-DD)
    time: timestamp.split("T")[1].split(".")[0], // 시간 (HH:MM:SS)
    username: username, // 유저 이름
    message: message, // 대화 내용
  };

  // 기존 로그 파일을 읽어들여서 새로운 메시지를 추가한 후 저장
  fs.readFile(chatLogFilePath, "utf8", (err, data) => {
    let chatLogs = [];
    
    // 기존 파일이 존재하고, 데이터를 성공적으로 읽었을 경우
    if (!err && data) {
      chatLogs = JSON.parse(data); // 기존 데이터를 JSON으로 변환
    }

    chatLogs.push(chatEntry); // 새로운 채팅 메시지를 배열에 추가

    // 업데이트된 데이터를 다시 파일에 저장
    fs.writeFile(chatLogFilePath, JSON.stringify(chatLogs, null, 2), (err) => {
      if (err) {
        console.error("채팅 로그 저장 실패:", err);
      } else {
        console.log("채팅 로그 저장 성공:", chatEntry);
      }
    });
  });
}

// 방 생성/접속
function createChannel(channelName, settings) {
  client.start();
  client.setChannel(channelName, settings);
  console.log(channelName);
}

// 채팅 메시지를 받을 때마다 파일에 저장
client.on("a", (msg) => {
  const username = msg.p.name; // 유저 이름
  const message = msg.a; // 채팅 메시지
  saveChatToFile(username, message); // 파일에 채팅 기록
});

// 방에 접속하면 이름과 색깔을 설정하고, 왕관을 체크
client.on("hi", () => {
  console.log("방 생성/접속 성공");
  client.setNameAndColor("👁️🐽👁️", "#ff8687");
  client.checkAndTakeCrownUntilSuccess();
});

// 방 생성 및 10분마다 재생성
createChannel("한국방", channelSettings);
setInterval(() => {
  createChannel("한국방", channelSettings);
  console.log("방 생성 새로고침");
}, 600000); // 10분(600000ms)마다 새로 방 생성
