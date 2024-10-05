// pages/api/connect.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { Client } from 'mpp-client-net';
import fs from 'fs';
import path from 'path';

const MPPNET_TOKEN = process.env.MPPNET_TOKEN;
const client = new Client('wss://mppclone.com', MPPNET_TOKEN);

const channelSettings = {
  visible: true,
  limit: 50,
  chat: true,
  crownsolo: false,
};

// 채팅을 파일에 저장하는 함수
function saveChatToFile(userId: string, message: string, timestamp: string) {
  const chatLogPath = path.resolve('data/chatlog.json');
  let chatLogs = {};
  if (fs.existsSync(chatLogPath)) {
    const existingLogs = fs.readFileSync(chatLogPath, 'utf-8');
    chatLogs = JSON.parse(existingLogs);
  }

  if (!chatLogs[userId]) {
    chatLogs[userId] = [];
  }

  chatLogs[userId].push({
    timestamp: timestamp,
    message: message,
  });

  fs.writeFileSync(chatLogPath, JSON.stringify(chatLogs, null, 2), 'utf-8');
}

client.on('a', (msg) => {
  const userId = msg.p.id;
  const message = msg.a;
  const timestamp = new Date().toISOString();
  saveChatToFile(userId, message, timestamp);
});

client.on('hi', () => {
  console.log('Connected to MPP server');
  client.setNameAndColor('🐖', '#ff8687');
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { channelName } = req.body;
    client.start();
    client.setChannel(channelName, channelSettings);
    res.status(200).json({ message: 'Connected to channel', channelName });
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
