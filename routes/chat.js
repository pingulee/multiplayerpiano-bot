import express from 'express';

const router = express.Router();

// 채팅 입력을 받아서 처리하는 라우트
export default (client) => {
  router.post('/chat', (req, res) => {
    const message = req.body.message;
    if (message.trim()) {
      client.sendArray([{ m: "a", message: message.trim() }]); // MPP 서버로 메시지 전송
      console.log(`웹에서 입력된 메시지: ${message}`);
    }
    res.redirect('/');
  });

  return router;
};
