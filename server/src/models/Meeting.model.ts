import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMeeting extends Document {
  title: string;
  description?: string;
  teamId: Types.ObjectId;
  organizerId: Types.ObjectId;
  participants: Types.ObjectId[];
  startTime: Date;
  endTime: Date;
  meetingLink?: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const MeetingSchema = new Schema<IMeeting>(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true
    },
    organizerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    meetingLink: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
      default: 'scheduled'
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<IMeeting>('Meeting', MeetingSchema);

