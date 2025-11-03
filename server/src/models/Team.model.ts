import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITeamMember {
  userId: Types.ObjectId;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
}

export interface ITeam extends Document {
  name: string;
  description?: string;
  avatar?: string;
  ownerId: Types.ObjectId;
  members: ITeamMember[];
  channels: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const TeamMemberSchema = new Schema<ITeamMember>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'member'],
    default: 'member'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
});

const TeamSchema = new Schema<ITeam>(
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
    avatar: {
      type: String,
      default: ''
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    members: [TeamMemberSchema],
    channels: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Channel'
      }
    ]
  },
  {
    timestamps: true
  }
);

export default mongoose.model<ITeam>('Team', TeamSchema);

