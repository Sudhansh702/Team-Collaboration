import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IChannelRead extends Document {
  userId: Types.ObjectId;
  channelId: Types.ObjectId;
  lastReadAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ChannelReadSchema = new Schema<IChannelRead>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    channelId: {
      type: Schema.Types.ObjectId,
      ref: 'Channel',
      required: true
    },
    lastReadAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Compound index to ensure one record per user-channel pair
ChannelReadSchema.index({ userId: 1, channelId: 1 }, { unique: true });

export default mongoose.model<IChannelRead>('ChannelRead', ChannelReadSchema);

