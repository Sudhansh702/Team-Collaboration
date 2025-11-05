import Meeting from '../models/Meeting.model';
import { NotificationService } from './notification.service';

export class MeetingReminderService {
  private static reminderInterval: NodeJS.Timeout | null = null;
  private static readonly REMINDER_INTERVAL_MS = 15 * 60 * 1000; // Check every 15 minutes
  private static readonly REMINDER_TIME_BEFORE_MS = 15 * 60 * 1000; // Notify 15 minutes before

  static start() {
    // Run immediately on start
    this.checkAndSendReminders();

    // Then run periodically
    this.reminderInterval = setInterval(() => {
      this.checkAndSendReminders();
    }, this.REMINDER_INTERVAL_MS);

    console.log('Meeting reminder service started');
  }

  static stop() {
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval);
      this.reminderInterval = null;
      console.log('Meeting reminder service stopped');
    }
  }

  private static async checkAndSendReminders() {
    try {
      const now = new Date();
      const reminderTime = new Date(now.getTime() + this.REMINDER_TIME_BEFORE_MS);
      const reminderWindowEnd = new Date(reminderTime.getTime() + this.REMINDER_INTERVAL_MS);

      // Find meetings that start within the reminder window
      const upcomingMeetings = await Meeting.find({
        status: 'scheduled',
        startTime: {
          $gte: reminderTime,
          $lte: reminderWindowEnd
        }
      })
        .populate('organizerId', 'username email')
        .populate('participants', 'username email')
        .populate('teamId', 'name');

      for (const meeting of upcomingMeetings) {
        const meetingId = (meeting._id as any).toString();
        const startTime = new Date(meeting.startTime);
        const minutesUntilStart = Math.floor((startTime.getTime() - now.getTime()) / (1000 * 60));
        
        // Check if we've already sent a reminder for this meeting
        // We'll use a simple approach: send reminder if meeting starts in 15 minutes (±5 minutes)
        if (minutesUntilStart >= 10 && minutesUntilStart <= 20) {
          const organizer = meeting.organizerId as any;
          const team = meeting.teamId as any;
          const teamName = team?.name || 'Team';
          
          // Send reminder to all participants (except organizer who already knows)
          for (const participant of meeting.participants) {
            const participantId = (participant as any)._id?.toString() || (participant as any).toString();
            const participantObj = typeof participant === 'object' ? participant : null;
            
            // Skip organizer (they already know about the meeting)
            if (participantId === meeting.organizerId.toString()) {
              continue;
            }

            try {
              await NotificationService.createNotification(
                participantId,
                'meeting',
                'Meeting Reminder',
                `Meeting "${meeting.title}" starts in ${minutesUntilStart} minutes (${teamName})`,
                meetingId
              );
            } catch (error) {
              console.error(`Failed to send reminder to participant ${participantId}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in meeting reminder service:', error);
    }
  }

  // Manual trigger for testing
  static async triggerReminders() {
    await this.checkAndSendReminders();
  }
}

