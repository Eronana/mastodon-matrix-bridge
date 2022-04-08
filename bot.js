const { MatrixClient } = require('matrix-bot-sdk');
const cache = {};
async function getDirectRoomId(client, userId) {
  if (cache[userId]) {
    return cache[userId];
  }
  const rooms = await client.getJoinedRooms();
  const clientUserId = await client.getUserId();

  for (const roomId of rooms) {
    const members = await client.getRoomMembers(roomId);
    if (members.length === 2 && members[0].event.type === 'm.room.member' && members[1].event.type === 'm.room.member') {
      let user = members[0];
      if (members[1].event.user_id !== clientUserId) {
        if (members[0].event.user_id !== clientUserId) {
          continue;
        }
        user = members[1];
      }
      if (user.event.user_id === userId && user.event.prev_content && user.event.prev_content.is_direct && user.event.prev_content.membership === 'invite') {
        return cache[userId] = roomId;
      }
    }
  }
  return cache[userId] = await client.createRoom({
      preset: 'trusted_private_chat',
      invite: [userId],
      is_direct: true
  });
}

exports.createBot = function (homeserverUrl, accessToken) {
  const client = new MatrixClient(homeserverUrl, accessToken);
  return async function (user, content) {
    return client.sendMessage(await getDirectRoomId(client, user), content);
  };
};
