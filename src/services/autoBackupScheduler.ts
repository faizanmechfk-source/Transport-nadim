import { AutoBackupConfig, DayOfWeek } from '../types';
import { db } from '../database/db';

const DAY_MAP: Record<DayOfWeek, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export class AutoBackupScheduler {
  private static isRunning = false;

  /**
   * Evaluates whether an automated backup is due based on settings configuration
   */
  public static isBackupDue(config?: AutoBackupConfig): boolean {
    if (!config || !config.enabled) {
      return false;
    }

    const now = new Date();

    // If no backup has ever been taken, trigger initial baseline
    if (!config.lastBackupAt) {
      return true;
    }

    const lastDate = new Date(config.lastBackupAt);
    if (isNaN(lastDate.getTime())) {
      return true;
    }

    const nowTime = now.getTime();
    const lastTime = lastDate.getTime();
    const elapsedMs = nowTime - lastTime;

    const [targetHourStr = '20', targetMinuteStr = '00'] = (config.time || '20:00').split(':');
    const targetHour = parseInt(targetHourStr, 10);
    const targetMinute = parseInt(targetMinuteStr, 10);

    const nowHour = now.getHours();
    const nowMinute = now.getMinutes();
    const hasReachedTime = nowHour > targetHour || (nowHour === targetHour && nowMinute >= targetMinute);

    const isSameCalendarDay =
      now.getFullYear() === lastDate.getFullYear() &&
      now.getMonth() === lastDate.getMonth() &&
      now.getDate() === lastDate.getDate();

    if (config.interval === 'daily') {
      // If already backed up today, not due
      if (isSameCalendarDay) {
        return false;
      }

      // If more than 24 hours have passed or reached scheduled time today
      if (elapsedMs >= 24 * 60 * 60 * 1000 || hasReachedTime) {
        return true;
      }

      return false;
    }

    if (config.interval === 'weekly') {
      const targetDayOfWeek = DAY_MAP[config.dayOfWeek || 'sunday'] ?? 0;
      const currentDayOfWeek = now.getDay();

      // If more than 7 days elapsed, definitely due
      if (elapsedMs >= 7 * 24 * 60 * 60 * 1000) {
        return true;
      }

      // If today is the target day of week, time reached, and not already backed up today or in last 6 days
      if (currentDayOfWeek === targetDayOfWeek && hasReachedTime && elapsedMs >= 6 * 24 * 60 * 60 * 1000) {
        return true;
      }

      return false;
    }

    return false;
  }

  /**
   * Computes human-readable next scheduled backup description
   */
  public static getNextScheduledInfo(config?: AutoBackupConfig): { text: string; isDueNow: boolean } {
    if (!config || !config.enabled) {
      return { text: 'Automatic backups disabled', isDueNow: false };
    }

    const isDue = this.isBackupDue(config);
    if (isDue) {
      return { text: 'Scheduled backup is due now', isDueNow: true };
    }

    const timeStr = config.time || '20:00';
    if (config.interval === 'daily') {
      return { text: `Scheduled daily at ${timeStr}`, isDueNow: false };
    }

    const dayName = (config.dayOfWeek || 'sunday').charAt(0).toUpperCase() + (config.dayOfWeek || 'sunday').slice(1);
    return { text: `Scheduled weekly on ${dayName} at ${timeStr}`, isDueNow: false };
  }

  /**
   * Executes the auto-backup if due or forced
   */
  public static async checkAndExecute(
    force = false,
    onSuccess?: (summary: string) => void
  ): Promise<boolean> {
    if (this.isRunning) {
      return false;
    }

    try {
      const settings = await db.getSettings();
      const config = settings.autoBackupConfig;

      if (!force && !this.isBackupDue(config)) {
        return false;
      }

      this.isRunning = true;
      const { snapshot, dumpJson } = await db.executeScheduledBackup(
        force ? 'manual' : 'scheduled',
        force ? 'Manual trigger by user' : `Auto-${config?.interval || 'daily'} scheduled backup`
      );

      // If automatic file download is configured, trigger client download
      if (config?.autoDownload) {
        try {
          const blob = new Blob([dumpJson], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const dateStr = new Date().toISOString().substring(0, 10);
          a.href = url;
          a.download = `TransportEntry_AutoBackup_${dateStr}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (downloadErr) {
          console.warn('Auto download prompt was suppressed by browser:', downloadErr);
        }
      }

      const summary = `${snapshot.biltyCount} Bilties, ${snapshot.memoCount} Memos (${snapshot.fileSizeKb} KB)`;
      if (onSuccess) {
        onSuccess(summary);
      }

      // Notify window listeners
      window.dispatchEvent(
        new CustomEvent('transport_auto_backup_done', {
          detail: { snapshot, summary },
        })
      );

      return true;
    } catch (err) {
      console.error('Auto backup execution error:', err);
      return false;
    } finally {
      this.isRunning = false;
    }
  }
}
