'use client';

import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useTheme } from './ThemeProvider';
import './ChatClient.css';

// Socket.IO Message Types (from ElizaOS documentation)
enum SOCKET_MESSAGE_TYPE {
  ROOM_JOINING = 1,
  SEND_MESSAGE = 2,
  MESSAGE = 3,
  ACK = 4,
  THINKING = 5,
  CONTROL = 6
}

const AGENT_ID = process.env.NEXT_PUBLIC_ELIZA_AGENT_ID || 'cb11f567-f3a2-011c-bdfe-872f7453f6d1';
const SOCKET_URL = process.env.NEXT_PUBLIC_ELIZA_SOCKET_URL || 'http://localhost:3000';

// Generate or retrieve a persistent user ID (UUID format required by ElizaOS)
const getUserId = (): string => {
    if (typeof window === 'undefined') return crypto.randomUUID();
    
    let userId = localStorage.getItem('eliza_user_id');
    if (!userId) {
        userId = crypto.randomUUID();
        localStorage.setItem('eliza_user_id', userId);
    }
    return userId;
};

interface Message {
    text: string;
    sender: 'user' | 'agent';
    id: string;
}

interface ChatClientProps {
    onNewMessage?: () => void;
}

export default function ChatClient({ onNewMessage }: ChatClientProps) {
    const { theme } = useTheme();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [userId] = useState(() => getUserId());
    const socketRef = useRef<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        console.log('[ChatClient] Initializing Socket.IO connection to:', SOCKET_URL);
        console.log('[ChatClient] Agent/Room ID:', AGENT_ID);

        const socket = io(SOCKET_URL, {
            'reconnection': true,
            'reconnectionDelay': 1000,
            'reconnectionAttempts': 5,
            'timeout': 20000,
            'transports': ['polling', 'websocket']
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[SUCCESS] Connected to Eliza, socket ID:', socket.id);
            setIsConnected(true);
            setConnectionError(null);

            // Join the room - CRITICAL for receiving broadcasts
            socket.emit('message', {
                type: SOCKET_MESSAGE_TYPE.ROOM_JOINING,
                payload: {
                    roomId: AGENT_ID,
                    entityId: userId,
                }
            });
            console.log('[SENT] Room join request for room:', AGENT_ID);
        });

        socket.on('connect_error', (error) => {
            console.error('[ERROR] Connection error:', error.message);
            setIsConnected(false);
            setConnectionError('Cannot connect to agent. Please ensure the agent is running.');
        });

        socket.on('disconnect', (reason) => {
            console.log('[DISCONNECTED] Reason:', reason);
            setIsConnected(false);
        });

        // Listen for messageBroadcast - the main event for receiving messages
        socket.on('messageBroadcast', (data: any) => {
            console.log('[RECEIVED] Broadcast:', data);
            
            // Check if this message is for our room
            if (data.roomId === AGENT_ID || data.channelId === AGENT_ID) {
                console.log('[SUCCESS] Message is for our room!');
                console.log('[INFO] Sender:', data.senderName, 'Text:', data.text);
                
                // Add agent messages (filter out our own echoed messages by checking senderId)
                if (data.senderId !== userId && data.senderId !== 'Zcash Explorer User') {
                    setIsTyping(false);
                    setMessages((prev) => [
                        ...prev,
                        {
                            text: data.text,
                            sender: 'agent',
                            id: Date.now().toString() + Math.random(),
                        },
                    ]);
                    onNewMessage?.();
                }
            } else {
                console.log('[INFO] Message is for different room:', data.roomId || data.channelId);
            }
        });

        socket.on('messageComplete', (data: any) => {
            console.log('[SUCCESS] Message processing complete:', data);
        });

        socket.on('connection_established', (data: any) => {
            console.log('[SUCCESS] Connection established:', data);
        });

        // Debug: Log all events
        socket.onAny((eventName, ...args) => {
            console.log('[EVENT]', eventName, args);
        });

        return () => {
            socket.disconnect();
        };
    }, [userId]);

    const handleSend = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || !socketRef.current) return;

        const userMessage = input.trim();
        setInput('');

        // Add user message immediately
        setMessages((prev) => [
            ...prev,
            {
                text: userMessage,
                sender: 'user',
                id: Date.now().toString(),
            },
        ]);

        // Send to server using proper ElizaOS message format
        // All IDs must be valid UUIDs
        const messagePayload = {
            type: SOCKET_MESSAGE_TYPE.SEND_MESSAGE,
            payload: {
                senderId: userId,
                senderName: 'Zcash Explorer User',
                message: userMessage,
                roomId: AGENT_ID,
                channelId: AGENT_ID,
                serverId: '00000000-0000-0000-0000-000000000000',
                messageId: crypto.randomUUID(),
                source: 'zcash-explorer',
                attachments: [],
                metadata: {}
            }
        };
        
        console.log('[SENDING] Message:', messagePayload);
        socketRef.current.emit('message', messagePayload);
        
        // Show typing indicator
        setIsTyping(true);
        
        // Auto-hide typing indicator after 10 seconds as fallback
        setTimeout(() => setIsTyping(false), 10000);
    };

    const isDark = theme === 'dark';

    return (
        <div className="chat-widget-container" data-theme={theme}>
            {/* Header */}
            <div className="chat-header">
                <div className="chat-header-content">
                    <div className="chat-agent-info">
                        <div className="chat-avatar">
                            <i className="fa-solid fa-shield-halved" aria-hidden="true" />
                        </div>
                        <div className="chat-agent-details">
                            <span className="chat-agent-name">Zcash Agent</span>
                            <div className="chat-status">
                                <div className={`chat-status-dot ${isConnected ? 'online' : 'offline'}`} />
                                <span className="chat-status-text">{isConnected ? 'Online' : 'Offline'}</span>
                            </div>
                        </div>
                    </div>
                </div>
                {connectionError && (
                    <div className="chat-error">
                        <i className="fa-solid fa-exclamation-triangle" /> {connectionError}
                    </div>
                )}
            </div>

            {/* Messages */}
            <div className="chat-messages">
                {messages.length === 0 && (
                    <div className="chat-empty-state">
                        <i className="fa-solid fa-comments" />
                        <p className="empty-title">Welcome to Zcash Agent</p>
                        <p className="empty-subtitle">Ask me about Zcash, privacy, shielded transactions, or blockchain technology.</p>
                    </div>
                )}
                {messages.map((msg) => (
                    <div key={msg.id} className={`chat-message-wrapper ${msg.sender}`}>
                        {msg.sender === 'agent' && (
                            <div className="message-avatar agent">
                                <i className="fa-solid fa-robot" />
                            </div>
                        )}
                        <div className={`chat-bubble ${msg.sender}`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                
                {/* Typing Indicator */}
                {isTyping && (
                    <div className="chat-message-wrapper agent">
                        <div className="message-avatar agent">
                            <i className="fa-solid fa-robot" />
                        </div>
                        <div className="chat-bubble agent typing">
                            <div className="typing-dots">
                                <span />
                                <span />
                                <span />
                            </div>
                        </div>
                    </div>
                )}
                
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="chat-input-container">
                <form onSubmit={handleSend} className="chat-input-form">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isConnected ? "Message Zcash Agent..." : "Connecting..."}
                        disabled={!isConnected}
                        className="chat-input"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || !isConnected}
                        className="chat-send-button"
                        aria-label="Send message"
                    >
                        <i className="fa-solid fa-paper-plane" />
                    </button>
                </form>
            </div>
        </div>
    );
}
