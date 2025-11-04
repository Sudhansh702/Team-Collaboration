import { io, Socket } from 'socket.io-client';

export interface CallOffer {
  from: string;
  offer: RTCSessionDescriptionInit;
}

export interface CallAnswer {
  from: string;
  answer: RTCSessionDescriptionInit;
}

export interface IncomingCall {
  from: string;
  callType: 'audio' | 'video';
  teamId?: string;
}

class CallService {
  private socket: Socket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private callHandlers: Map<string, Function> = new Map();

  initializeSocket(socketUrl: string) {
    if (this.socket) {
      return this.socket;
    }

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    // Setup event listeners
    this.socket.on('incoming-call', (data: IncomingCall) => {
      this.emit('incoming-call', data);
    });

    this.socket.on('call-answered', (data: CallAnswer) => {
      this.emit('call-answered', data);
    });

    this.socket.on('call-rejected', (data: { from: string }) => {
      this.emit('call-rejected', data);
    });

    this.socket.on('call-ended', (data: { from: string }) => {
      this.emit('call-ended', data);
    });

    this.socket.on('offer', async (data: CallOffer) => {
      await this.handleOffer(data);
    });

    this.socket.on('answer', async (data: CallAnswer) => {
      await this.handleAnswer(data);
    });

    this.socket.on('ice-candidate', (data: { from: string; candidate: RTCIceCandidateInit }) => {
      if (this.peerConnection && data.candidate) {
        this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    return this.socket;
  }

  joinUserRoom(userId: string) {
    if (this.socket) {
      this.socket.emit('join-user-room', userId);
    }
  }

  leaveUserRoom(userId: string) {
    if (this.socket) {
      this.socket.emit('leave-user-room', userId);
    }
  }

  on(event: string, handler: Function) {
    this.callHandlers.set(event, handler);
  }

  off(event: string) {
    this.callHandlers.delete(event);
  }

  private emit(event: string, data: any) {
    const handler = this.callHandlers.get(event);
    if (handler) {
      handler(data);
    }
  }

  async initiateCall(from: string, to: string, callType: 'audio' | 'video', teamId?: string) {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }

    try {
      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video'
      });

      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Add local tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        if (this.peerConnection) {
          this.peerConnection.addTrack(track, this.localStream!);
        }
      });

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.socket) {
          this.socket.emit('ice-candidate', {
            to,
            candidate: event.candidate
          });
        }
      };

      // Create and send offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Emit call initiation
      this.socket.emit('call-initiate', { from, to, callType, teamId });

      // Send offer
      this.socket.emit('offer', {
        to,
        offer: offer
      });
    } catch (error) {
      console.error('Error initiating call:', error);
      throw error;
    }
  }

  async answerCall(from: string, to: string, callType: 'audio' | 'video') {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }

    try {
      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video'
      });

      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Add local tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        if (this.peerConnection) {
          this.peerConnection.addTrack(track, this.localStream!);
        }
      });

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.socket) {
          this.socket.emit('ice-candidate', {
            to,
            candidate: event.candidate
          });
        }
      };

      // Create and send answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // Send answer
      this.socket.emit('call-answer', {
        from,
        to,
        answer: answer
      });

      this.socket.emit('answer', {
        to,
        answer: answer
      });
    } catch (error) {
      console.error('Error answering call:', error);
      throw error;
    }
  }

  private async handleOffer(data: CallOffer) {
    if (!this.peerConnection || !this.localStream) {
      return;
    }

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      
      // Create answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      if (this.socket) {
        this.socket.emit('answer', {
          to: data.from,
          answer: answer
        });
      }
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }

  private async handleAnswer(data: CallAnswer) {
    if (!this.peerConnection) {
      return;
    }

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }

  rejectCall(from: string, to: string) {
    if (this.socket) {
      this.socket.emit('call-reject', { from, to });
    }
    this.cleanup();
  }

  endCall(from: string, to: string) {
    if (this.socket) {
      this.socket.emit('call-end', { from, to });
    }
    this.cleanup();
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getPeerConnection(): RTCPeerConnection | null {
    return this.peerConnection;
  }

  setRemoteStreamHandler(handler: (stream: MediaStream) => void) {
    if (this.peerConnection) {
      this.peerConnection.ontrack = (event) => {
        handler(event.streams[0]);
      };
    }
  }

  toggleMute(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }

  toggleVideo(): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }

  cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }

  disconnect() {
    this.cleanup();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

const callService = new CallService();
export default callService;

