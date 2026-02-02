declare module 'qrcode-terminal' {
  interface QRCodeOptions {
    small?: boolean;
  }
  const qrcode: {
    generate(input: string, opts?: QRCodeOptions, cb?: (code: string) => void): void;
    generate(input: string, cb?: (code: string) => void): void;
    error: number;
    setErrorLevel(level: string): void;
  };
  export default qrcode;
}
