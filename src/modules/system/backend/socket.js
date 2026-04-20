let systemIo;

export function initSystemSocket(io) {
  systemIo = io.of('/system');
  
  systemIo.on('connection', (socket) => {
    // Authenticate and join user room
    socket.on('join', (userId) => {
      socket.join(`user_${userId}`);
    });
  });
}

export function getSystemIo() {
  return systemIo;
}
