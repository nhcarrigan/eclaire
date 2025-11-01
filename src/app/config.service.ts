import { Injectable } from '@angular/core';
import { Config } from "./interfaces/Config";

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private config: Config | null = null;
  public getConfig(): Config | null {
    return this.config;
  }

  public setConfig(config: Config) {
    this.config = config;
  }
}
