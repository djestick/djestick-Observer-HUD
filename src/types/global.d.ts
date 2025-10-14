export {};

declare global {
  interface Window {
    parent: Window & {
      ipcApi?: {
        receive: (channel: string, handler: (...args: any[]) => void) => void;
      };
    };
  }
}
