type MessageType = 'id' | 'offer' | 'answer' | 'candidates' | 'hangup';

export type WebSocketClient = WebSocket & { isAlive?: boolean };

export type SignalingMessage = {
    type: MessageType,
    target?: string;
    source?: string;
    id?: string;
    offer?: RTCSessionDescriptionInit;
    answer?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
}