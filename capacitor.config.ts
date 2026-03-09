import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cosmeticscan.advisor',
  appName: 'Cosmetic Advisor',
  webDir: 'www',
  server: {
    url: 'http://10.0.2.2:3000',
    cleartext: true
  },
  ios: {
    allowsLinkPreview: false,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
