import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Button, Spinner, Avatar } from '../components/UI';
import { api, auth } from '../hooks/useFetch';

const SUGGESTED_PROMPTS = [
  { icon: '🔥', text: 'Which customers are at churn risk?' },
  { icon: '💰', text: 'Show me cross-sell opportunities' },
  { icon: '📊', text: 'What should I focus on today?' },
  { icon: '📈', text: 'Compare HDFC vs ICICI bluechip funds' },
  { icon: '⚠️', text: 'Any compliance issues to address?' },
  { icon: '🎯', text: 'How am I tracking against targets?' }
];

export default function AIChat() {
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get('customer');
  const user = auth.getUser();
  
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi ${user?.name?.split(' ')[0]}! I'm your AI assistant. I can help you with customer insights, fund comparisons, portfolio analysis, and more. What would you like to know?`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // If customer context, add initial message
  useEffect(() => {
    if (customerId) {
      // Fetch customer brief
      api.get(`/ai/brief/${customerId}`).then(data => {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: `I see you're looking at a customer. Here's what I know:\n\n${data.brief}\n\n${data.opportunities?.length ? `**Opportunities:** ${data.opportunities.join(', ')}` : ''}\n\nWhat would you like to know about this customer?`
          }
        ]);
      }).catch(() => {});
    }
  }, [customerId]);
  
  const sendMessage = async (text) => {
    if (!text.trim()) return;
    
    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      // Check for fund comparison
      if (text.toLowerCase().includes('compare') && (text.toLowerCase().includes('fund') || text.toLowerCase().includes('vs'))) {
        const funds = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g) || [];
        if (funds.length >= 2) {
          const result = await api.post('/ai/compare-funds', {
            fund1: funds[0],
            fund2: funds[1]
          });
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `**Fund Comparison**\n\n**${result.fund1.name}**\n- 1Y Return: ${result.fund1.returns1Y}%\n- 3Y Return: ${result.fund1.returns3Y}%\n- Expense Ratio: ${result.fund1.expenseRatio}%\n- Rating: ${result.fund1.rating}/5\n\n**${result.fund2.name}**\n- 1Y Return: ${result.fund2.returns1Y}%\n- 3Y Return: ${result.fund2.returns3Y}%\n- Expense Ratio: ${result.fund2.expenseRatio}%\n- Rating: ${result.fund2.rating}/5\n\n**Recommendation:** ${result.recommendation}`
          }]);
          setLoading(false);
          return;
        }
      }
      
      // General chat
      const result = await api.post('/ai/chat', { 
        query: text,
        ...(customerId && { customerId })
      });
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.response
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${err.message}. Please try again.`
      }]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };
  
  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] md:h-[calc(100vh-4rem)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {msg.role === 'assistant' ? (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0">
                🤖
              </div>
            ) : (
              <Avatar name={user?.name} size="sm" />
            )}
            <div
              className={`max-w-[80%] p-3 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-ew-blue text-white rounded-br-sm'
                  : 'bg-white border border-gray-200 rounded-bl-sm'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm">
              🤖
            </div>
            <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Suggested prompts */}
      {messages.length <= 2 && (
        <div className="px-4 py-2">
          <p className="text-xs text-gray-500 mb-2">Suggested questions</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => sendMessage(prompt.text)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
              >
                <span>{prompt.icon}</span>
                <span className="truncate max-w-[150px]">{prompt.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-100">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
          <Button type="submit" disabled={!input.trim() || loading}>
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
