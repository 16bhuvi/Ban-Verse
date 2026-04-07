import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, MessageSquare } from 'lucide-react';
import './ChatBot.css';

import config from "./config";

const ChatBot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, type: 'bot', text: "Hi! I'm BanBot, your friendly campus guide. 🎓 Whether it's finding events, joining clubs, or just navigating Banverse, I'm here to help you grow. How can I assist you today? ✨" }
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
            const res = await fetch(`${config.AI_BASE_URL}/chat`, {
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

        if (text.includes('hello') || text.includes('hi ')) {
            return "Hi there! I'm so excited to help you explore campus life. Ask me about clubs, events, or points! 🌟";
        } else if (text.includes('club') || text.includes('join')) {
            return "Finding the right club is a game-changer! Head to 'Explore Clubs' to join your favorites and start earning 10 AP. You've got this! 💪";
        } else if (text.includes('event') || text.includes('register') || text.includes('happening')) {
            return "There's always something cool happening! Check the 'Events' tab to register, discover new skills, and bag 20 AP. See you there! 🚀";
        } else if (text.includes('points') || text.includes('ap ') || text.includes('activity')) {
            return "Activity Points (AP) are your campus super-power! They build your digital resume as you engage in more activities. Keep growing! 💎";
        } else if (text.includes('profile') || text.includes('resume')) {
            return "Your profile is your digital showcase! Personalize it to let club leaders know your interests. It's the first step to a great career! 📄";
        } else if (text.includes('thank')) {
            return "Anytime! I'm always here to root for you. Let me know if you need anything else! 😊";
        } else if (text.includes('who are you') || text.includes('your name')) {
            return "I'm BanBot, your smart and friendly campus buddy! My mission is to make your student journey simple and motivating. 🌈";
        } else {
            return "That's an interesting question! While I'm still learning, I recommend checking the Dashboard or chatting with your club leaders for the latest scoop! ✨";
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
