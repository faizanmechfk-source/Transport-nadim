export type PlatformType = 'web' | 'android-webview' | 'windows-desktop';

declare global {
  interface Window {
    AndroidInterface?: {
      showToast?: (message: string) => void;
      printDocument?: (htmlContent: string) => void;
      downloadFile?: (base64Data: string, filename: string, mimeType: string) => void;
      shareDocument?: (title: string, text: string, url: string) => void;
      exitApp?: () => void;
    };
    electronAPI?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      toggleFullscreen: () => void;
      isMaximized: () => Promise<boolean>;
      onUpdateAvailable?: (callback: (info: any) => void) => void;
      checkForUpdates?: () => void;
    };
  }
}

export class NativeBridge {
  /**
   * Detect current execution platform
   */
  public static getPlatform(): PlatformType {
    if (typeof window === 'undefined') return 'web';
    if (window.electronAPI) return 'windows-desktop';
    if (window.AndroidInterface || navigator.userAgent.includes('wv') || navigator.userAgent.includes('AndroidWebView')) {
      return 'android-webview';
    }
    return 'web';
  }

  /**
   * Universal share or fallback to download/copy
   */
  public static async shareOrPrint(title: string, text: string, url?: string): Promise<boolean> {
    if (window.AndroidInterface?.shareDocument) {
      window.AndroidInterface.shareDocument(title, text, url || window.location.href);
      return true;
    }

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: url || window.location.href });
        return true;
      } catch (e) {
        // user cancelled or share failed
      }
    }

    return false;
  }

  /**
   * Universal print
   */
  public static printPage() {
    window.print();
  }

  /**
   * Toggle Fullscreen for Windows Desktop and Web
   */
  public static toggleFullscreen(): void {
    if (window.electronAPI) {
      window.electronAPI.toggleFullscreen();
      return;
    }

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  /**
   * Window controls (Windows EXE Desktop Wrapper)
   */
  public static windowMinimize() {
    window.electronAPI?.minimize();
  }

  public static windowMaximize() {
    window.electronAPI?.maximize();
  }

  public static windowClose() {
    if (window.electronAPI) {
      window.electronAPI.close();
    } else if (window.AndroidInterface?.exitApp) {
      window.AndroidInterface.exitApp();
    }
  }
}
