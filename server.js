// Servidor del Pixel Shooter online. Uso: npm i ws && node server.js
const { WebSocketServer } = require('ws');
const wss = new WebSocketServer({ port: process.env.PORT || 8080 });
const rooms = {};
let nextId = 1;
const send = (ws, o) => ws.readyState === 1 && ws.send(JSON.stringify(o));

wss.on('connection', ws => {
  ws.id = nextId++;
  ws.on('message', raw => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (m.t === 'join') {
      ws.room = String(m.room || 'main').slice(0, 20);
      const r = (rooms[ws.room] ??= new Set());
      if (r.size >= 4) return ws.close();           // máx. 4 jugadores por sala
      ws.host = r.size === 0;                       // el primero es el anfitrión (maneja los enemigos)
      r.add(ws);
      return send(ws, { t: 'welcome', id: ws.id, host: ws.host });
    }
    const r = rooms[ws.room];
    if (!r) return;
    m.from = ws.id;
    r.forEach(o => {
      if (m.to ? o.id === m.to : o !== ws) send(o, m); // 'to' = mensaje directo, si no, a todos los demás
    });
  });
  ws.on('close', () => {
    const r = rooms[ws.room];
    if (!r) return;
    r.delete(ws);
    r.forEach(o => send(o, { t: 'left', id: ws.id }));
    if (ws.host && r.size) { const n = [...r][0]; n.host = true; send(n, { t: 'host' }); } // pasa el anfitrión
    if (!r.size) delete rooms[ws.room];
  });
});
console.log('Servidor escuchando en puerto', process.env.PORT || 8080);
