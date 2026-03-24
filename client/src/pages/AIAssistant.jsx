import React, { useState, useRef, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatRelative } from '../utils/format';
import PageHeader from '../components/PageHeader';
import toast from 'react-hot-toast';

const EXAMPLES = [
  'Which contracts are expiring in the next 60 days?',
  'Which Take Home vehicles have the highest odometer discrepancy?',
  'What is our total fleet size split by state?',
  'Which vehicles are due for registration renewal this month?',
  'How many pool cars do we have?',
];

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isUser ? 'bg-findex-orange text-white' : 'bg-findex-midnight-lighter text-gray-400 border border-findex-midnight-border'}`}>
        {isUser ? 'You' : '✦'}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${isUser ? 'bg-findex-orange text-white rounded-tr-sm' : 'bg-findex-midnight-lighter text-gray-200 rounded-tl-sm border border-findex-midnight-border'}`}>
        {msg.content}
        {msg.timestamp && (
          <div className={`text-xs mt-1.5 ${isUser ? 'text-orange-200' : 'text-gray-600'}`}>{formatRelative(msg.timestamp)}</div>
        )}
      </div>
    </div>
  );
}

export default function AIAssistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi ${user?.name?.split(' ')[0] || 'there'}! I'm your FINDEX Fleet Assistant. I have access to live fleet data including contracts, odometer readings, personal use flags, and cost summaries.\n\nAsk me anything about your fleet — or try one of the example questions below.`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;
    setInput('');

    const newMessages = [
      ...messages,
      { role: 'user', content: userMsg, timestamp: new Date() },
    ];
    setMessages(newMessages);
    setLoading(true);

    try {
      const apiMessages = newMessages
        .filter(m => m.role !== 'system')
        .slice(-10)
        .map(({ role, content }) => ({ role, content }));

      const res = await api.post('/ai/chat', { messages: apiMessages });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.message, timestamp: new Date() }]);
    } catch (e) {
      const errMsg = e.response?.data?.message || 'Failed to get response. Please check your ANTHROPIC_API_KEY.';
      toast.error(errMsg);
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I encountered an error: ${errMsg}`, timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader title="AI Fleet Assistant" subtitle="Ask questions about your fleet data" />

      <div className="flex-1 flex flex-col card p-0 overflow-hidden min-h-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((msg, i) => <Message key={i} msg={msg} />)}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-findex-midnight-lighter border border-findex-midnight-border flex items-center justify-center text-gray-400">✦</div>
              <div className="bg-findex-midnight-lighter border border-findex-midnight-border rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center h-5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Example prompts */}
        {messages.length <= 1 && (
          <div className="px-5 pb-3">
            <p className="text-xs text-gray-600 mb-2 font-semibold uppercase tracking-wide">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map(ex => (
                <button
                  key={ex}
                  onClick={() => sendMessage(ex)}
                  className="text-xs bg-findex-midnight-lighter border border-findex-midnight-border text-gray-400 hover:text-white hover:border-findex-orange px-3 py-1.5 rounded-full transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-findex-midnight-border">
          <div className="flex gap-3">
            <textarea
              className="input flex-1 resize-none h-12 py-3 text-sm"
              placeholder="Ask about your fleet... (Enter to send, Shift+Enter for new line)"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              rows={1}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="btn-primary px-5 flex-shrink-0 flex items-center gap-2"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              )}
              Send
            </button>
          </div>
          <p className="text-xs text-gray-700 text-center mt-2">Powered by Claude · Fleet context injected automatically</p>
        </div>
      </div>
    </div>
  );
}
