declare module "bun" {
  interface Env {
    LOCATIONS?: string;
    BUS_STATIONS?: string;
    CALENDARS?: string;

    DATA_GO_KR_API_KEY: string;
    GOOGLE_CREDENTIALS_JSON: string;
  }
}
