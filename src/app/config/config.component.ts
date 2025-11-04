import { Component } from "@angular/core";
import {
  AbstractControl,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { ConfigService } from "../config.service";
import { Config } from "../interfaces/Config";
import { Router } from "@angular/router";

const langCodes = {
  "English": "en",
  "Albanian": "sq",
  "Arabic": "ar",
  "Azerbaijani": "az",
  "Basque": "eu",
  "Bengali": "bn",
  "Bulgarian": "bg",
  "Catalan": "ca",
  "Chinese": "zh",
  "Chinese (traditional)": "zt",
  "Czech": "cs",
  "Danish": "da",
  "Dutch": "nl",
  "Esperanto": "eo",
  "Estonian": "et",
  "Finnish": "fi",
  "French": "fr",
  "Galician": "gl",
  "German": "de",
  "Greek": "el",
  "Hebrew": "he",
  "Hindi": "hi",
  "Hungarian": "hu",
  "Indonesian": "id",
  "Irish": "ga",
  "Italian": "it",
  "Japanese": "ja",
  "Korean": "ko",
  "Kyrgyz": "ky",
  "Latvian": "lv",
  "Lithuanian": "lt",
  "Malay": "ms",
  "Norwegian": "nb",
  "Persian": "fa",
  "Polish": "pl",
  "Portuguese": "pt",
  "Portuguese (Brazil)": "pb",
  "Romanian": "ro",
  "Russian": "ru",
  "Slovak": "sk",
  "Slovenian": "sl",
  "Spanish": "es",
  "Swedish": "sv",
  "Tagalog": "tl",
  "Thai": "th",
  "Turkish": "tr",
  "Ukrainian": "uk",
  "Urdu": "ur",
}

@Component({
  selector: "app-config",
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: "./config.component.html",
  styleUrl: "./config.component.css",
})
export class ConfigComponent {
  public apiKey = new FormControl("", [Validators.required]);
  // I am aware that we are committing an API key. This is deliberate - this key has a 10 request per minute rate limit, and is provided for demonstration purposes.
  public translateKey = new FormControl("accd53eb-371e-4657-81c8-1d2d521407a7", [Validators.required]);
  public sourceLanguage = new FormControl("English", [
    Validators.required,
    () => (control: AbstractControl) =>
      [
        "English",
        "German",
        "Dutch",
        "Swedish",
        "Danish",
        "Spanish",
        "French",
        "Portuguese",
        "Italian",
        "Turkish",
        "Norwegian",
        "Indonesian",
        "Bulgarian",
        "Czech",  
        "Finnish",
        "Hindi",
        "Hungarian",
        "Japanese",
        "Korean",
        "Polish",
        "Russian",
        "Ukrainian",
        "Vietnamese",
      ].includes(control.value),
  ]);
  public targetLanguage = new FormControl("English", [
    Validators.required,
    () => (control: AbstractControl) =>
        [
          ...Object.keys(langCodes),
        ].includes(control.value),
  ]);

  public passType: "password" | "text" = "password";
  public translatePassType: "password" | "text" = "password";

  public togglePass() {
    this.passType = this.passType === "password" ? "text" : "password";
  }

  public toggleTranslatePass() {
    this.translatePassType = this.translatePassType === "password" ? "text" : "password";
  }

  public save() {
    const config: Config = {
      apiKey: this.apiKey.value ?? "",
      translateKey: this.translateKey.value ?? "",
      sourceLanguage: String(langCodes[this.sourceLanguage.value as keyof typeof langCodes]),
      targetLanguage: String(langCodes[this.targetLanguage.value as keyof typeof langCodes]),
    };
    this.configService.setConfig(config);

    this.router.navigate(["/"]);
  }

  public cancel() {
    this.router.navigate(["/"]);
  }

  constructor(private configService: ConfigService, private router: Router) {
    const config = this.configService.getConfig();
    if (!config) {
      return;
    }
    this.apiKey.setValue(config.apiKey);
    this.translateKey.setValue(config.translateKey);
    this.sourceLanguage.setValue(config.sourceLanguage);
    this.targetLanguage.setValue(config.targetLanguage);
  }
}
