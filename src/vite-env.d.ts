/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

declare const __APP_VERSION__: string;

interface JitsiMeetExternalAPI {
  new (domain: string, options: object): JitsiMeetInstance;
}

interface JitsiMeetInstance {
  executeCommand: (command: string, ...args: unknown[]) => void;
  addListener: (event: string, listener: (data?: unknown) => void) => void;
  removeListener: (event: string, listener: (data?: unknown) => void) => void;
  dispose: () => void;
}

interface Window {
  JitsiMeetExternalAPI: JitsiMeetExternalAPI;
}
