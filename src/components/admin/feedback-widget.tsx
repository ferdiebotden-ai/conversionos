'use client';

/**
 * Admin Feedback Co-Pilot Widget
 * Floating chat widget for contractors to submit platform feedback.
 * Conversations are emailed to the owner via Resend ($0 LLM cost).
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquareText, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useBranding } from '@/components/branding-provider';

type MessageRole = 'user' | 'bot';

interface Message {
  role: MessageRole;
  content: string;
}

type Category = 'Pricing Issue' | 'Feature Request' | 'Question' | 'General Feedback';

const CATEGORIES: Category[] = [
  'Pricing Issue',
  'Feature Request',
  'Question',
  'General Feedback',
];

const BOT_GREETING =
  "Hi! I'm your platform assistant. How can I make your experience better?";

const BOT_FOLLOW_UP =
  'Thanks for sharing that. Would you like to add anything else, or shall I send this to the team?';

const BOT_SENT = 'Feedback sent! Our team will review this shortly.';

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: BOT_GREETING },
  ]);
  const [input, setInput] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const branding = useBranding();

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (!isOpen) return;
    // Small delay to let animation finish
    const timer = setTimeout(() => textareaRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const handleChipClick = useCallback((cat: Category) => {
    setCategory(cat);
    const starterMap: Record<Category, string> = {
      'Pricing Issue': "I have a question about pricing — ",
      'Feature Request': "It would be great if the platform could ",
      'Question': "I was wondering about ",
      'General Feedback': '',
    };
    setInput(starterMap[cat]);
    textareaRef.current?.focus();
  }, []);

  const handleSendMessage = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isSent) return;

    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: trimmed },
    ];

    // Add bot follow-up after first user message
    if (userMessageCount === 0) {
      newMessages.push({ role: 'bot', content: BOT_FOLLOW_UP });
    }

    setMessages(newMessages);
    setInput('');
    setUserMessageCount((c) => c + 1);
  }, [input, isSent, messages, userMessageCount]);

  const handleSubmitFeedback = useCallback(async () => {
    if (isSending || isSent) return;
    setIsSending(true);

    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.filter((m) => m.role === 'user' || m.role === 'bot'),
          category: category || 'General Feedback',
        }),
      });

      if (res.ok) {
        setMessages((prev) => [...prev, { role: 'bot', content: BOT_SENT }]);
        setIsSent(true);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'bot',
            content:
              'Something went wrong sending your feedback. Please try again.',
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          content:
            'Something went wrong sending your feedback. Please try again.',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }, [isSending, isSent, messages, category]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleReset = useCallback(() => {
    setMessages([{ role: 'bot', content: BOT_GREETING }]);
    setInput('');
    setCategory(null);
    setUserMessageCount(0);
    setIsSent(false);
    setIsSending(false);
  }, []);

  return (
    <>
      {/* FAB Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              size="icon"
              onClick={() => setIsOpen(true)}
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
              aria-label="Open feedback"
            >
              <MessageSquareText className="h-6 w-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-sm:inset-x-4 max-sm:bottom-4 max-sm:right-auto max-sm:w-auto"
          >
            <div className="flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden max-h-[min(580px,calc(100dvh-4rem))]">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <MessageSquareText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Feedback
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {branding.name}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="h-8 w-8 rounded-full"
                  aria-label="Close feedback"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Messages */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
              >
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted text-foreground rounded-bl-md'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick-action chips (before first user message) */}
              {userMessageCount === 0 && !isSent && (
                <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                  {CATEGORIES.map((cat) => (
                    <Badge
                      key={cat}
                      variant={category === cat ? 'default' : 'outline'}
                      className="cursor-pointer text-xs transition-colors hover:bg-primary/10"
                      onClick={() => handleChipClick(cat)}
                    >
                      {cat}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Input area */}
              {!isSent && (
                <div className="border-t border-border p-3 space-y-2">
                  <div className="flex items-end gap-2">
                    <Textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your feedback..."
                      className="min-h-10 max-h-28 resize-none text-sm"
                      rows={1}
                    />
                    <Button
                      size="icon"
                      onClick={handleSendMessage}
                      disabled={!input.trim()}
                      className="h-10 w-10 shrink-0 rounded-xl"
                      aria-label="Send message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Submit Feedback button */}
                  {userMessageCount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.2 }}
                    >
                      <Button
                        onClick={handleSubmitFeedback}
                        disabled={isSending}
                        className="w-full"
                        size="sm"
                      >
                        {isSending ? 'Sending...' : 'Submit Feedback'}
                      </Button>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Post-send footer */}
              {isSent && (
                <div className="border-t border-border p-3">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="w-full"
                    size="sm"
                  >
                    Send More Feedback
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
