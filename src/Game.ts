import type { DartAudio } from "./DartAudio";
import type { Player } from "./Player";

export class Game {
  isGameRunning: boolean = false;
  legCount: number = 1;
  currentPlayer: number = 0;
  players: Player[] = [];
  audios: DartAudio[] = [];
}