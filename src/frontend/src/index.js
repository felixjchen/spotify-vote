import React from "react";
import { render } from "react-dom";
import io from "socket.io-client";
import Page from "./lib/page";

const urlSearchParams = new URLSearchParams(window.location.search);
const spotifyID = urlSearchParams.get("spotifyID");

// https://www.npmjs.com/package/socket.io-client
const backendURL = "http://0.0.0.0";
// const backendAddress = "https://nitr0us.azurewebsites.net";

let access_token = undefined;
let room = undefined;

const socket = io(backendURL);
socket.on("connect", () => {
  socket.emit("init", spotifyID);
});

socket.on("setRoom", (simpleRoom) => {
  room = simpleRoom;
  console.log(room);
});

socket.on("setAccessToken", (access_token) => {
  if (!access_token) {
    window.location.replace(`${backendURL}/login`);
  }
  access_token = access_token;
  console.log(access_token);
  render(
    <Page room={room} access_token={access_token} />,
    document.getElementById("root")
  );
});

// render(<Page />, document.getElementById("root"));
