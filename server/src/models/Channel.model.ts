import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IChannel extends Document {
  name: string;
  description?: string;
  teamId: Types.ObjectId;
  type: 'public' | 'private';
  members: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ChannelSchema = new Schema<IChannel>(
  {
    name: {
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
    type: {
      type: String,
      enum: ['public', 'private'],
      default: 'public'
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    ]
  },
  {
    timestamps: true
  }
);

export default mongoose.model<IChannel>('Channel', ChannelSchema);

