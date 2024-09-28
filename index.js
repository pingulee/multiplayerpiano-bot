import { Client } from "mpp-client-net";
import dotenv from "dotenv";

dotenv.config();

const MPPNET_TOKEN = process.env.MPPNET_TOKEN;
const OwnerId = process.env.OWNER_ID;

const client = new Client("wss://mppclone.com", MPPNET_TOKEN);

// 방 생성/접속
function createChannel(channelName, settings) {
  client.start();
  client.setChannel(channelName, settings);
  console.log(`방 '${channelName}'생성/접속 완료.`);
}

// 방 설정
const channelSettings = {
  visible: true,
  limit: 50,
  chat: true,
  crownsolo: false,
};

// 방 생성 및 접속
createChannel("한국방", channelSettings);

// 왕관 가져오는 함수
Client.prototype.takeCrown = function () {
  this.sendArray([
    {
      m: "chown",
      id: this.participantId, // 왕관을 가져옴
    },
  ]);
};

// 1시간마다 새로운 방을 생성하는 함수
function scheduleChannelCreation() {
  setInterval(() => {
    createChannel("한국방", channelSettings);
  }, 3600000);
}

// 왕관 상태를 체크하고 없으면 계속 시도하는 함수
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
  }, 1000); // 1초마다 시도
};

// 클라이언트 이름과 색상을 설정하는 함수
Client.prototype.setNameAndColor = function (name, color) {
  this.sendArray([
    {
      m: "userset",
      set: { name: name, color: color },
    },
  ]);
};

// 방에 접속하면 봇 이름과 색깔을 설정하고, 왕관이 없으면 가져오기 시도
client.on("hi", () => {
  console.log("방 접속 성공");
  client.setNameAndColor("👁️🐽👁️", "#ff8687");
  client.checkAndTakeCrownUntilSuccess(); // 왕관을 가져올 때까지 계속 시도
});

