/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

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
