import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, MessageSquare } from 'lucide-react';
import './ChatBot.css';

const ChatBot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, type: 'bot', text: "Hello! I'm BanBot, your Banasthali campus assistant. How can I help you today? 👋" }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;
    
        const userMsg = { id: Date.now(), type: 'user', text: inputValue };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsTyping(true);
    
        try {
            const res = await fetch("http://localhost:8000/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_input: inputValue })
            });
            const data = await res.json();
            
            setMessages(prev => [...prev, { 
                id: Date.now() + 1, 
                type: 'bot', 
                text: data.bot_response || getBotResponse(inputValue) 
            }]);
        } catch (err) {
            console.error("ChatBot error:", err);
            // Fallback to local logic if server is down
            const botResponse = getBotResponse(inputValue);
            setMessages(prev => [...prev, { id: Date.now() + 1, type: 'bot', text: botResponse }]);
        } finally {
            setIsTyping(false);
        }
    };
    
    // Fallback logic for basic queries
    const getBotResponse = (input) => {
        const text = input.toLowerCase();

        if (text.includes('hello') || text.includes('hi')) {
            return "Hi there! Feel free to ask me anything about clubs, events, or your dashboard.";
        } else if (text.includes('club') || text.includes('join')) {
            return "To join a club, head over to the 'Explore Clubs' tab in your sidebar. You can browse through various categories and click 'Join'. Joining a club earns you 10 activity points!";
        } else if (text.includes('event') || text.includes('register')) {
            return "Check the 'Events' tab for upcoming campus activities. Click the 'Register' button on any event to participate. You'll get 20 points for every registration!";
        } else if (text.includes('points') || text.includes('activity')) {
            return "Activity points are earned by joining clubs, registering for events, and participating in campus activities. These points show your engagement levels on campus!";
        } else if (text.includes('profile') || text.includes('resume')) {
            return "You can update your bio, interests, and profile picture in the 'Profile' section. You can also upload your resume there for club leaders to see.";
        } else if (text.includes('thank')) {
            return "You're very welcome! Let me know if you need anything else.";
        } else if (text.includes('who are you') || text.includes('your name')) {
            return "I'm BanBot, the official AI assistant for Banverse. My goal is to help you navigate your student life more easily!";
        } else {
            return "That's a great question! For more specific information, you can always reach out to the respective club leaders or check the 'Notifications' tab for official updates.";
        }
    };

    return (
        <div className="chatbot-wrapper">
            {isOpen && (
                <div className="chatbot-window">
                    <div className="chatbot-header">
                        <div className="chatbot-header-info">
                            <div className="bot-avatar">
                                <Bot size={20} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '16px' }}>BanBot</h3>
                                <span className="bot-status">Online and ready to help</span>
                            </div>
                        </div>
                        <button className="close-btn" onClick={() => setIsOpen(false)}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="chatbot-messages">
                        {messages.map(msg => (
                            <div key={msg.id} className={`message ${msg.type === 'bot' ? 'bot-message' : 'user-message'}`}>
                                {msg.text}
                            </div>
                        ))}
                        {isTyping && (
                            <div className="typing-indicator">BanBot is typing...</div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form className="chatbot-input" onSubmit={handleSend}>
                        <input
                            type="text"
                            placeholder="Type your question..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                        />
                        <button type="submit" className="send-btn" disabled={!inputValue.trim()}>
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            )}

            <button className="chatbot-button" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
            </button>
        </div>
    );
};

export default ChatBot;
