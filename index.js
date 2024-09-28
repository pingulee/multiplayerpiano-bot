import { Client } from "mpp-client-net";
import dotenv from "dotenv";

dotenv.config();

const MPPNET_TOKEN = process.env.MPPNET_TOKEN;
const OwnerId = process.env.OWNER_ID;
const MPPNET_TOKEN =

const client = new Client("wss://mppclone.com", MPPNET_TOKEN);

// 방 생성/접속
function createChannel(channelName, settings) {
  client.start();
  client.setChannel(channelName, settings);
  console.log(`방 '${channelName}'생성/접속 완료.`);
}

// 원하는 방의 설정 예시
const channelSettings = {
  visible: true, // 방을 채널 목록에 표시할지 여부
  limit: 50, // 최대 인원 수
  chat: true, // 채팅 허용 여부
  crownsolo: false, // 피아노 연주 권한 여부 (true일 경우 크라운 홀더만 가능)
  color: "#440c09", // 방 배경색
};

// 방 생성 및 접속
createChannel("한국방", channelSettings);

// 클라이언트 이름을 'A'로 설정
Client.prototype.setName = function (name) {
  this.sendArray([
    {
      m: "userset",
      set: { name: name },
    },
  ]);
};

// 방에 접속하면 봇 이름 👁️🐽👁️로 설정
client.on("hi", () => {
  console.log("방 접속 성공");
  client.setName("👁️🐽👁️");
  client.setColor("#ff8687");
});

// 메시지를 보내는 함수 (테스트 용도로 사용 가능)
Client.prototype.sendMessageToCurrentChannel = function (message) {
  this.sendArray([
    {
      m: "a",
      message: message,
    },
  ]);
};
