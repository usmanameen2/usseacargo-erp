let io = null;

module.exports = {
  init: (socketIo) => { io = socketIo; },
  getIO: () => io,

  // Broadcast CRUD events to a specific user's room
  broadcastToUser: (userId, event, data) => {
    if (io) io.to(`user_${userId}`).emit(event, data);
  },

  // Broadcast to all connected clients (for global events)
  broadcastAll: (event, data) => {
    if (io) io.emit(event, data);
  },

  // CRUD event helpers
  emitCreated: (userId, entity, data) => {
    if (io) io.to(`user_${userId}`).emit(`${entity}:created`, { data, timestamp: Date.now() });
  },
  emitUpdated: (userId, entity, data) => {
    if (io) io.to(`user_${userId}`).emit(`${entity}:updated`, { data, timestamp: Date.now() });
  },
  emitDeleted: (userId, entity, id) => {
    if (io) io.to(`user_${userId}`).emit(`${entity}:deleted`, { id, timestamp: Date.now() });
  },
};
