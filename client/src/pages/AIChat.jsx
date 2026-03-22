import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Spinner, Avatar } from '../components/UI';
import { api, auth } from '../hooks/useFetch';

const SUGGESTED_PROMPTS = [
  { icon: '🔥', text: 'Which customers have the highest churn risk?' },
  { icon: '📅', text: 'ELSS expires in next 30 days' },
  { icon: '📋', text: 'Generate Priya Sharma portfolio report' },
  { icon: '📊', text: 'Summarise my book — AUM, drift, churn' },
  { icon: '💰', text: 'Show me cross-sell opportunities' },
  { icon: '⚠️', text: 'Any compliance issues to address?' },
];

export default function AIChat() {
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get('customer');
  const user = auth.getUser();

  const buildWelcome = () => ({
    role: 'assistant',
    content: `Hi ${user?.name?.split(' ')[0]}! I'm your AI assistant. I can help you with customer insights, fund comparisons, portfolio analysis, and more. What would you like to know?`,
  });

  const [messages, setMessages] = useState(() => [buildWelcome()]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (customerId) {
      api
        .get(`/ai/brief/${customerId}`)
        .then((data) => {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `I see you're looking at a customer. Here's what I know:\n\n${data.brief}\n\n${data.opportunities?.length ? `**Opportunities:** ${data.opportunities.join(', ')}` : ''}\n\nWhat would you like to know about this customer?`,
            },
          ]);
        })
        .catch(() => {});
    }
  }, [customerId]);

  const sendMessage = async (text) => {
    if (!text.trim()) return;

    const userMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      if (text.toLowerCase().includes('compare') && (text.toLowerCase().includes('fund') || text.toLowerCase().includes('vs'))) {
        const funds = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g) || [];
        if (funds.length >= 2) {
          const result = await api.post('/ai/compare-funds', {
            fund1: funds[0],
            fund2: funds[1],
          });
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `**Fund Comparison**\n\n**${result.fund1.name}**\n- 1Y Return: ${result.fund1.returns1Y}%\n- 3Y Return: ${result.fund1.returns3Y}%\n- Expense Ratio: ${result.fund1.expenseRatio}%\n- Rating: ${result.fund1.rating}/5\n\n**${result.fund2.name}**\n- 1Y Return: ${result.fund2.returns1Y}%\n- 3Y Return: ${result.fund2.returns3Y}%\n- Expense Ratio: ${result.fund2.expenseRatio}%\n- Rating: ${result.fund2.rating}/5\n\n**Recommendation:** ${result.recommendation}`,
            },
          ]);
          setLoading(false);
          return;
        }
      }

      const result = await api.post('/ai/chat', {
        query: text,
        ...(customerId && { customerId }),
      });

      setMessages((prev) => [...prev, { role: 'assistant', content: result.response }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Sorry, I encountered an error: ${err.message}. Please try again.` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const clearChat = () => {
    setMessages([buildWelcome()]);
    setInput('');
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-cream">
      <div className="shrink-0 border-b border-ink-6/80 bg-cream px-4 py-3 md:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-serif text-lg font-semibold tracking-tight text-ink-1">AI Chat</h2>
            <p className="mt-1 text-sm leading-snug text-ink-4">
              Ask anything about your book, customers, markets or compliance
            </p>
          </div>
          <button
            type="button"
            onClick={clearChat}
            className="shrink-0 rounded-full bg-ink-1 px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-paper transition-colors hover:bg-ink-2"
          >
            Clear chat
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 md:px-5">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {msg.role === 'assistant' ? (
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-gold-l bg-ink-1 text-sm text-gold-l">
                🤖
              </div>
            ) : (
              <Avatar name={user?.name} size="sm" />
            )}
            <div
              className={`max-w-[80%] rounded-2xl p-3 ${
                msg.role === 'user'
                  ? 'rounded-br-sm bg-ink-1 text-paper'
                  : 'rounded-bl-sm border border-ink-6 bg-paper text-ink-2'
              }`}
            >
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gold-l bg-ink-1 text-sm text-gold-l">
              🤖
            </div>
            <div className="rounded-2xl rounded-bl-sm border border-ink-6 bg-paper p-3">
              <div className="flex gap-1">
                <div className="h-2 w-2 animate-bounce rounded-full bg-ink-5" style={{ animationDelay: '0ms' }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-ink-5" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-ink-5" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 2 && (
        <div className="border-t border-ink-6/40 px-4 py-3 md:px-5">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-5">Suggested</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => sendMessage(prompt.text)}
                className="flex max-w-[200px] items-center gap-1.5 rounded-full border border-ink-6 bg-paper px-3 py-1.5 text-left text-sm text-ink-2 transition-colors hover:bg-p2"
              >
                <span>{prompt.icon}</span>
                <span className="truncate">{prompt.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-ink-6/80 bg-paper p-4 md:px-5">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your book, portfolios, markets, or compliance..."
            className="flex-1 rounded-xl border border-ink-6 bg-p2 px-4 py-3 text-sm text-ink-1 placeholder:text-ink-5 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/25"
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
