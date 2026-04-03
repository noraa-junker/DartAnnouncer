import { DartAudio } from "./DartAudio";
import { Game } from "./Game";
import { Player } from "./Player";

const game = new Game();

(function () {

  document.addEventListener("DOMContentLoaded", () => {
    loadGame();
    document.getElementById("StartGameButton")?.addEventListener("click",  startGame);
    document.getElementById("AddPlayerButton")?.addEventListener("click", addPlayer);
    document.getElementById("AddAudioButton")?.addEventListener("click", startRecording);
    document.getElementById("ResetGameButton")?.addEventListener("click", () => {
      if (confirm("Are you sure you want to reset the game?")) {
        game.isGameRunning = false;
        saveGame();
        location.reload();
      }
    });

    document.getElementById("SubmitScoreButton")?.addEventListener("click", updateScore);
  });
})();

function updateScore() {
  const currentPlayer = game.players.find(player => player.id === game.currentPlayer);
  if (!currentPlayer) {
    console.error("Current player not found.");
    return;
  }

  const scoreInput = document.getElementById("ScoreInput") as HTMLInputElement;
  const score = parseInt(scoreInput.value);
  if (isNaN(score) || score < 0 || score > 180) {
    alert("Please enter a valid score between 0 and 180.");
    return;
  }

  currentPlayer.score -= score;
  if (currentPlayer.score < 0) {
    currentPlayer.score += score; // Revert the score if it goes below zero
    alert("Score cannot go below zero. Try again.");
    return;
  }

  game.audios.forEach(audio => {
    if (audio.score === score) {
      const audioElement = new Audio(audio.audioURL);
      audioElement.play();
    }
  });

  if (currentPlayer.score === 0) {
    currentPlayer.legsWon += 1;
    alert(`${currentPlayer.name} wins leg!`);
    if (currentPlayer.legsWon >= Math.ceil(game.legCount / 2)) {
      alert(`${currentPlayer.name} wins the game!`);
      game.isGameRunning = false;
      document.getElementById("setupContainer")?.style.setProperty("display", "block");
      document.getElementById("gameContainer")?.style.setProperty("display", "none");
    } else {
      game.players.forEach(player => {
        player.score = 501;
      });
    }
  }

  game.currentPlayer = game.players[(game.players.findIndex(player => player.id === game.currentPlayer) + 1) % game.players.length].id;
  scoreInput.value = "";
  drawScoreboard();
  saveGame();
}

function startGame() {
  game.isGameRunning = true;
  game.legCount = parseInt((document.getElementById("LCount") as HTMLInputElement).value);
  game.currentPlayer = game.players[0].id;

  game.players.forEach(element => {
    element.score = 501;
    element.legsWon = 0;
  });

  document.getElementById("setupContainer")?.style.setProperty("display", game.isGameRunning ? "none" : "block");
  document.getElementById("gameContainer")?.style.setProperty("display", game.isGameRunning ? "block" : "none");

  drawScoreboard();
  saveGame();
}

function drawScoreboard() {
  var scoreboard = document.getElementById("scoreboard")!;
  scoreboard.innerHTML = "";
  game.players.forEach(player => {
    const playerScore = document.createElement("p");
    const indicator = document.createElement("span");
    const info = document.createElement("span");
    indicator.textContent = player.id === game.currentPlayer ? "🟥" : "⬜";
    playerScore.setAttribute("id", "player-score-" + player.id);
    info.textContent =  `${player.name}: ${player.score} points, ${player.legsWon} legs won`;
    playerScore.appendChild(indicator);
    playerScore.appendChild(info);
    if (player.id === game.currentPlayer) {
      playerScore.style.fontWeight = "bold";
      indicator.classList.add("fade-in");
    }
    scoreboard.appendChild(playerScore);
  });
}

function addPlayer() {
  const startGameButton = document.getElementById("StartGameButton") as HTMLButtonElement;
  var playerName = (document.getElementById("PlayerNameText") as HTMLInputElement).value;
  var playerId = game.players.length > 0 ? game.players[game.players.length - 1].id + 1 : 1;
  if (playerName.trim() === "") {
    alert("Player name cannot be empty.");
    return;
  }

  game.players.push(new Player(playerName, playerId));
  addPlayerToDom(game.players[game.players.length - 1]);

  startGameButton.disabled = game.players.length < 2;
  saveGame();
}

function addPlayerToDom(player: Player) {
  const playerList = document.getElementById("PlayerList");
  const listItem = document.createElement("p");
  const removeButton = document.createElement("button");
  removeButton.textContent = "❌";
  removeButton.type = "button";
  listItem.textContent = `${player.name}`;
  listItem.appendChild(removeButton);
  listItem.setAttribute("name", "playeritem-" + player.id);
  listItem.classList.add("fade-in");
  removeButton.addEventListener("click", () => removePlayer(player.id));
  removeButton.style.marginLeft = "10px";
  playerList?.appendChild(listItem);
  console.log(`Added player: ${player.name} with ID: ${player.id}`);
}

function removePlayer(playerId: number) {
  const startGameButton = document.getElementById("StartGameButton") as HTMLButtonElement;
  const playerIndex = game.players.findIndex(player => player.id === playerId);
  if (playerIndex !== -1) {
    const removedPlayer = game.players.splice(playerIndex, 1)[0];
    const playerList = document.getElementById("PlayerList");
    const listItem = playerList?.querySelector(`p[name="playeritem-${removedPlayer.id}"]`);
    if (listItem) {
      playerList?.removeChild(listItem);
    }
    console.log(`Removed player: ${removedPlayer.name} with ID: ${removedPlayer.id}`);
  } else {
    console.log(`Player with ID: ${playerId} not found.`);
  }
  startGameButton.disabled = game.players.length < 2;
  saveGame();
}

function saveGame() {
  const gameState = JSON.stringify(game);
  localStorage.setItem("dartGameState", gameState);
  console.log("Game saved:", game);
}

function loadGame() {
  const gameState = localStorage.getItem("dartGameState");
  if (gameState) {
    const loadedGame = JSON.parse(gameState) as Game;
    Object.assign(game, loadedGame);
    console.log("Game loaded:", game);
  } else {
    console.log("No saved game found.");
  }

  game.players.forEach(element => {
    addPlayerToDom(element);
  });

  game.audios.forEach(element => {
    addAudioToDom(element);
  });

  const legCountInput = document.getElementById("LCount") as HTMLInputElement;
  legCountInput.value = game.legCount.toString();

  document.getElementById("setupContainer")?.style.setProperty("display", game.isGameRunning ? "none" : "block");
  document.getElementById("gameContainer")?.style.setProperty("display", game.isGameRunning ? "block" : "none");
  drawScoreboard();
}

let chunks: Blob[] = [];
let mediaRecorder: MediaRecorder | null = null;

function startRecording() {
  if (mediaRecorder !== null && mediaRecorder.state === "recording") {
    stopRecording();
    return;
  }

  const startRecordingButton = document.getElementById("AddAudioButton") as HTMLButtonElement;
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    console.log("getUserMedia supported.");
    navigator.mediaDevices
      .getUserMedia(
        // constraints - only audio needed for this app
        {
          audio: true,
        },
      )

      // Success callback
      .then((stream) => {
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.start();
        startRecordingButton.style.backgroundColor = "red";
        startRecordingButton.textContent = "Stop Recording";
        mediaRecorder.ondataavailable = (e) => {
          chunks.push(e.data);
        };
      })

      // Error callback
      .catch((err) => {
        console.error(`The following getUserMedia error occurred: ${err}`);
      });
  } else {
    console.log("getUserMedia not supported on your browser!");
  }
}

function stopRecording() {
  if (mediaRecorder === null) {
    console.warn("MediaRecorder is not initialized.");
    return;
  }
  const startRecordingButton = document.getElementById("AddAudioButton") as HTMLButtonElement;
  mediaRecorder.onstop = () => {
    startRecordingButton.style.backgroundColor = "";
        startRecordingButton.textContent = "Add audio";
    const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
    var scoreForAudio = NaN;
    do {
      var response = prompt("Enter the score for this audio clip:");
      scoreForAudio = response ? parseInt(response) : NaN;
      if (isNaN(scoreForAudio) || scoreForAudio < 0 || scoreForAudio > 180) {
        alert("Please enter a valid score between 0 and 180.");
      }
    } while (isNaN(scoreForAudio) || scoreForAudio < 0 || scoreForAudio > 180);
    var reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = function () {
      const base64Audio = reader.result as string;
      const audioObj = new DartAudio(scoreForAudio, base64Audio);
      chunks = [];
      game.audios.push(audioObj);
      addAudioToDom(audioObj);
      console.log("Audio added with score:", audioObj);
      saveGame();
    };
  }


  mediaRecorder.stop();
}

function addAudioToDom(audio: DartAudio) {
  const audioList = document.getElementById("AudioList");
  const listItem = document.createElement("p");
  const playButton = document.createElement("button");
  const removeButton = document.createElement("button");
  playButton.textContent = "▶️";
  playButton.type = "button";
  removeButton.textContent = "❌";
  removeButton.type = "button";
  playButton.addEventListener("click", () => {
    const audioToPlay = new Audio(audio.audioURL);
    audioToPlay.play();
  });
  playButton.style.marginRight = "10px";
  playButton.style.marginLeft = "10px";
  removeButton.addEventListener("click", () => removeAudio(audio.score));
  listItem.textContent = `Score: ${audio.score}`;
  listItem.setAttribute("name", "audioitem-" + audio.score);
  listItem.classList.add("fade-in");
  listItem.appendChild(playButton);
  listItem.appendChild(removeButton);
  audioList?.appendChild(listItem);
}

function removeAudio(score: number) {
  const audioIndex = game.audios.findIndex(audio => audio.score === score);
  if (audioIndex !== -1) {
    const removedAudio = game.audios.splice(audioIndex, 1)[0];
    const audioList = document.getElementById("AudioList");
    const listItem = audioList?.querySelector(`p[name="audioitem-${removedAudio.score}"]`);
    if (listItem) {
      audioList?.removeChild(listItem);
    }
    console.log(`Removed audio with score: ${removedAudio.score}`);
  } else {
    console.log(`Audio with score: ${score} not found.`);
  }
  saveGame();
}