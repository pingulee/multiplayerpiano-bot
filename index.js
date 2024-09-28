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

// 방 생성/접속
function createChannel(channelName, settings) {
  client.start();
  client.setChannel(channelName, settings);
  console.log(channelName);
}

client.on("a", (msg) => {
  const username = msg.p.name; // 유저 이름
  const message = msg.a; // 채팅 메시지
  saveChatToFile(username, message); // 파일에 채팅 기록
});

client.on("hi", () => {
  console.log("방 생성/접속 성공");
  client.setNameAndColor("👁️🐽👁️", "#ff8687");
  client.checkAndTakeCrownUntilSuccess();
});

// 방 생성 및 스케줄링 시작
createChannel("한국방", channelSettings);
setInterval(() => {
    createChannel("한국방", channelSettings);
    console.log("방 생성 새로고침");
  }, 3600000);