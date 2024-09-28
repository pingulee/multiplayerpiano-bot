import { Client } from "mpp-client-net";
import fs from "fs";
import path from "path";
import OpenAI from "openai";

const MPPNET_TOKEN: string | undefined = process.env.MPPNET_TOKEN;
const OwnerId: string | undefined = process.env.OWNER_ID;
const openai = new OpenAI();

if (!MPPNET_TOKEN || !OwnerId) {
  throw new Error("환경 변수가 정의되지 않았습니다.");
}

const client: any = new Client("wss://mppclone.com", MPPNET_TOKEN);

interface ChannelSettings {
  visible: boolean;
  limit: number;
  chat: boolean;
  crownsolo: boolean;
}

const channelSettings: ChannelSettings = {
  visible: true,
  limit: 50,
  chat: true,
  crownsolo: false,
};

interface ChatLog {
  timestamp: string;
  message: string;
}

function saveChatToFile(userId: string, message: string, timestamp: string): void {
  const chatLogPath = path.resolve("data/chatlog.json");

  let chatLogs: Record<string, ChatLog[]> = {};
  if (fs.existsSync(chatLogPath)) {
    const existingLogs = fs.readFileSync(chatLogPath, "utf-8");
    chatLogs = JSON.parse(existingLogs) as Record<string, ChatLog[]>;
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

client.on("a", (msg: { p: { id: string }; a: string }) => {
  const userId = msg.p.id;
  const message = msg.a;
  const timestamp = new Date().toISOString();
  saveChatToFile(userId, message, timestamp);
});

client.on("hi", () => {
  console.log("방 생성/접속 성공");
  client.setNameAndColor("🐖", "#ff8687");
  client.checkAndTakeCrownUntilSuccess();
});

function createChannel(channelName: string, settings: ChannelSettings): void {
  client.start();
  client.setChannel(channelName, settings);
  console.log(channelName);
}

createChannel("한국방", channelSettings);
setInterval(() => {
  createChannel("한국방", channelSettings);
  console.log("방 생성 새로고침");
}, 600000);
