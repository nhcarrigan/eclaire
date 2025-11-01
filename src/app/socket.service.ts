import { Injectable } from "@angular/core";

type Event = "Results" | "Metadata" | "UtteranceEnd" | "SpeechStarted" | "error" | "close" | "open" | "Error";

/**
 *
 */
@Injectable({
  providedIn: "root",
})
export class SocketService {
  private socket: WebSocket | null = null;

  private listeners: Record<Event | string, Array<(data: unknown)=> void>> = {};

  /**
   *
   */
  constructor() {
  }

  /**
   * @param event
   * @param callback
   */
  public on(event: Event, callback: (data: unknown)=> void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   *
   */
  public disconnect(): void {
    if (!this.socket) {
      throw new Error("Socket is not connected");
    }
    this.socket.close();
    this.socket = null;
  }

  /**
   * @param key
   */
  public connect(key: string, lang: string): void {
    if (this.isConnected()) {
      throw new Error("Socket is already connected");
    }
    if (!key) {
      throw new Error("API key is required");
    }
    this.socket = new WebSocket(`wss://api.deepgram.com/v1/listen?model=nova-3-general&encoding=linear16&sample_rate=48000&channels=1&endpointing=500&punctuate=true&language=${lang}`, [ "token", key ]);
    this.socket.onopen = () => {
      console.log("open");
      if (this.listeners.open) {
        for (const callback of this.listeners.open) {
          callback({ type: "open" });
        }
      }
    };
    this.socket.onmessage = (event) => {
      console.log(event.data);
      const { type } = JSON.parse(event.data);
      if (this.listeners[type]) {
        for (const callback of this.listeners[type]) {
          callback(event.data);
        }
      }
    };
    this.socket.onclose = (a) => {
      console.log(a);
      if (this.listeners.close) {
        for (const callback of this.listeners.close) {
          callback({ type: "close" });
        }
        return;
      }
      this.socket = null;
    };
    this.socket.onerror = (error) => {
      console.error(error);
      if (this.listeners.error) {
        for (const callback of this.listeners.error) {
          callback({ error, type: "error" });
        }
      }
    };
  }

  /**
   *
   */
  public isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * @param audio
   */
  public sendAudio(audio: ArrayBuffer): void {
    if (!this.socket) {
      throw new Error("Socket is not connected");
    }
    this.socket.send(audio);
  }

  /**
   *
   */
  public keepAlive(): void {
    if (!this.socket) {
      throw new Error("Socket is not connected");
    }
    this.socket.send(JSON.stringify({ type: "KeepAlive" }));
  }

  /**
   *
   */
  public finalise(): void {
    if (!this.socket) {
      throw new Error("Socket is not connected");
    }
    this.socket.send(JSON.stringify({ type: "Finalize" }));
  }
}
