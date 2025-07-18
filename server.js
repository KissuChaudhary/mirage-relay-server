const express = require('express');
const expressWs = require('express-ws');

const app = express();
expressWs(app);

function generateFunId() {
  const colors = ['purple', 'blue', 'green', 'red', 'yellow', 'orange', 'pink', 'teal', 'silver', 'gold'];
  const animals = ['monkey', 'tiger', 'lion', 'panda', 'eagle', 'shark', 'wolf', 'fox', 'bear', 'owl'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return `${randomColor}-${randomAnimal}-${randomSuffix}`;
}

app.ws('/ws', function(ws, req) {
  console.log('A new CLI tool has connected.');
  const id = generateFunId();
  const url = `https://${id}.mirage.live`;
  ws.send(JSON.stringify({ type: 'url', data: url }));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Mirage] Relay server listening on port ${PORT}`);
}); 