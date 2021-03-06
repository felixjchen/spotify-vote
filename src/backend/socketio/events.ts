import { room, io, socketMap } from "../global";
import { refreshTimeout, playTimeout } from "./timeouts";
import {
  getSimplifiedRoom,
  broadcastCurrentlyPlaying,
  broadcastUsers,
  broadcastQueue,
  setUsers,
  setCurrentlyPlaying,
  setQueue,
} from "./helpers";
import { pausePlayer } from "../spotify/player";
import { joinRoom } from "../spotify/helpers";

const createSocketIOEvents = () => {
  io.on("connect", (socket) => {
    socket.on("init", async (spotifyID) => {
      // User not logged into backend..
      if (!room.users[spotifyID]) {
        socket.emit("redirectToLogin");
        return;
      }

      socket.join("room0");
      socketMap[socket.id] = spotifyID;

      // Send client their access token and start refresh token timeout
      refreshTimeout(spotifyID, socket);

      // We update entire room about new user
      broadcastUsers("room0");

      // We update new user about the queue
      setQueue(socket);
      setCurrentlyPlaying(socket);

      joinRoom(spotifyID, "room0");
    });

    socket.on("addTrackToQueue", ({ spotifyID, track }) => {
      console.log(`${spotifyID} has added ${track.name} to queue`);

      const queueTrack = {
        track,
        votes: {},
        priority: 1,
      };
      queueTrack.votes[spotifyID] = 1;
      //  Add track to queue and sort by prio
      room.queue.push(queueTrack);
      room.queue.sort((a, b) => b.priority - a.priority);

      // If nothing is playing.. play
      if (room.currently_playing === null) {
        playTimeout();
      }

      // Update all clients with current queue
      broadcastQueue("room0");
    });

    socket.on("voteTrack", ({ spotifyID, vote, trackID }) => {
      for (let i = 0; i < room.queue.length; i++) {
        let queueTrack = room.queue[i];
        // if the vote is for this track.
        if (queueTrack.track.id === trackID) {
          queueTrack.votes[spotifyID] = vote;

          // calculate new priority
          let newPriority = 0;
          for (let spotifyID in queueTrack.votes) {
            newPriority += queueTrack.votes[spotifyID];
          }
          queueTrack.priority = newPriority;
        }
      }

      // Remove all 0 votes
      room.queue = room.queue.filter((i) => i.priority > 0);
      // sort by highest prio first
      room.queue.sort((a, b) => b.priority - a.priority);

      broadcastQueue("room0");
    });

    socket.on("disconnect", async (reason) => {
      if (socket.id in socketMap) {
        //  MORE work here for queue... we need to remove votes
        let spotifyID = socketMap[socket.id];
        let user = room.users[spotifyID];
        let { access_token, refreshTimeout } = user;
        console.log(`${spotifyID} - Disconnect, reason: ${reason}`);

        pausePlayer(access_token);
        clearTimeout(refreshTimeout);

        delete room.users[spotifyID];
        delete socketMap[socket.id];

        broadcastUsers("room0");
      }
    });
  });
};

export { createSocketIOEvents };
