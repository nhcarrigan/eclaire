import { Component, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { ConfigService } from "../config.service";
import { Config } from "../interfaces/Config";
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from "@angular/router";
import { SocketService } from "../socket.service.js";

@Component({
  selector: "app-agent",
  standalone: true,
  imports: [CommonModule, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: "./agent.component.html",
  styleUrl: "./agent.component.css",
})
export class AgentComponent {
  private config: Config | null = null;
  private transcript: string = "";
  public messages: { type: "user" | "assistant"; content: string }[] = [];
  public connected = false;
  public errors: string[] = [];
  public logs: string[] = [];
  public cost = 0;
  public openedAt = new Date();
  private keepAlive: NodeJS.Timeout | null = null;

  constructor(
    private readonly socket: SocketService,
    private readonly configService: ConfigService,
    private readonly router: Router
  ) {
    this.ensureConfig();

    this.socket.on("close", () => {
      this.connected = false;
      this.keepAlive && clearInterval(this.keepAlive);
      this.keepAlive = null;
      this.logs.push("Connection closed");
    });

    this.socket.on("error", (error) => {
      this.errors.push(JSON.stringify(error));
      this.connected = false;
      this.socket.disconnect();
    });

    this.socket.on("Error", (error) => {
      this.errors.push(JSON.stringify(error));
      this.connected = false;
      this.socket.disconnect();
    });

    this.socket.on("open", () => {
      this.connected = true;
      this.logs.push("Connection opened");
      this.keepAlive = setInterval(() => {
        this.socket.keepAlive();
      });
      window.navigator.mediaDevices
      .getUserMedia({
        audio: {
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      .then((stream) => {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = (event) => {
          const inputData = event.inputBuffer.getChannelData(0);
          const int16Data = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            int16Data[i] = Math.max(
              -32768,
              Math.min(32767, inputData[i]! * 32768)
            );
          }
          this.socket.sendAudio(int16Data.buffer);
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
        this.socket.on("close", () => {
          processor.disconnect();
          source.disconnect();
          audioContext.close();
        });
      })
      .catch((error) => {
        console.error("Error accessing microphone: ", error);
        this.errors.push("Error accessing microphone: " + error);
        this.socket.disconnect();
      });
    });

    this.socket.on("Results", (message) => {
      const data = JSON.parse(message as string);
      const transcript = data.channel.alternatives[0].transcript;
      // Finalizing might kick back an empty transcript, but we don't want to skip that because we need to trigger the translation.
      if (!transcript && !data.from_finalize) {
        return;
      }
      this.transcript += " ";
      this.transcript += transcript;
      const isFinal = data.speech_final || data.from_finalize;
      if (!isFinal) {
        console.log("Skipping non-final transcript");
        return;
      }
      this.messages.push({ type: "user", content: this.transcript });
      const formData = new FormData();
      formData.append("q", this.transcript);
      formData.append("source", this.config?.sourceLanguage ?? "en");
      formData.append("target", this.config?.targetLanguage ?? "en");
      formData.append("api_key", this.config?.translateKey ?? "");
      fetch("https://trans.nhcarrigan.com/translate", {
        method: "POST",
        body: formData,
      })
      .then((response) => response.json())
      .then((data) => {
        this.messages.push({ type: "assistant", content: data.translatedText });
      });
      this.transcript = "";
    });
  }

  private async ensureConfig() {
    this.config = this.configService.getConfig();
    if (!this.config?.apiKey) {
      await this.router.navigate(["/config"]);
    }
  }

  public disconnect() {
    this.logs.push("Disconnecting...");
    this.socket.disconnect();
    const msElapsed = new Date().getTime() - this.openedAt.getTime();
    const dollarsPerHour = 0.32;
    this.cost += (msElapsed / 1000 / 60 / 60) * dollarsPerHour;
    this.logs.push(
      `Connected for ${msElapsed}ms. ESTIMATED Cost: $${
        (msElapsed / 1000 / 60 / 60) * dollarsPerHour
      }`
    );
  }

  public finalise() {
    this.logs.push("Finalising...");
    this.socket.finalise();
    this.logs.push("Finalised!");
  }

  public async connect() {
    this.logs.push("Connecting...");
    this.socket.connect(this.config?.apiKey ?? "", this.config?.sourceLanguage ?? "en");
    while (!this.socket.isConnected()) {
      this.logs.push("Waiting for connection...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    this.connected = true;
    this.logs.push("Connected!");
  }

  public clearErrors() {
    this.errors = [];
  }

  public clearLogs() {
    this.logs = [];
  }

  public clearTranscript() {
    this.messages = [];
  }
}
