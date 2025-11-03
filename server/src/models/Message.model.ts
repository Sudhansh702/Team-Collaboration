import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReaction {
  userId: Types.ObjectId;
  emoji: string;
}

export interface IMessage extends Document {
  channelId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  type: 'text' | 'file' | 'image' | 'link';
  fileUrl?: string;
  fileSize?: number;
  fileName?: string;
  replyTo?: Types.ObjectId;
  reactions: IReaction[];
  createdAt: Date;
  updatedAt: Date;
}

const ReactionSchema = new Schema<IReaction>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  emoji: {
    type: String,
    required: true
  }
});

const MessageSchema = new Schema<IMessage>(
  {
    channelId: {
      type: Schema.Types.ObjectId,
      ref: 'Channel',
      required: true
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['text', 'file', 'image', 'link'],
      default: 'text'
    },
    fileUrl: {
      type: String,
      default: ''
    },
    fileSize: {
      type: Number,
      default: 0
    },
    fileName: {
      type: String,
      default: ''
    },
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: 'Message'
    },
    reactions: [ReactionSchema]
  },
  {
    timestamps: true
  }
);

export default mongoose.model<IMessage>('Message', MessageSchema);

