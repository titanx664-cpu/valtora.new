import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { motion, AnimatePresence } from "motion/react";
import { MessageCircle, X, Send, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import { format } from "date-fns";

export default function SupportChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const chat = useQuery(api.support.getMyChat);
  const messages = useQuery(
    api.support.getMyChatMessages,
    chat ? { chatId: chat._id } : "skip"
  );
  const unreadCount = useQuery(api.support.getMyUnreadCount);

  const getOrCreateChat = useMutation(api.support.getOrCreateMyChat);
  const sendMessage = useMutation(api.support.sendMessage);
  const markRead = useMutation(api.support.markAdminMessagesRead);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  // Mark admin messages as read when chat is opened
  useEffect(() => {
    if (open && chat?._id) {
      markRead({ chatId: chat._id }).catch(() => null);
    }
  }, [open, chat?._id, messages?.length]);

  const handleOpen = async () => {
    setOpen(true);
    if (!chat) {
      await getOrCreateChat().catch(() => null);
    }
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const handleSend = async () => {
    const body = input.trim();
    if (!body || sending) return;

    let chatId = chat?._id;
    if (!chatId) {
      try {
        chatId = await getOrCreateChat();
      } catch {
        toast.error("Could not start chat");
        return;
      }
    }

    setSending(true);
    setInput("");
    try {
      await sendMessage({ chatId, body });
    } catch {
      toast.error("Failed to send message");
      setInput(body);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm flex flex-col rounded-2xl border border-border shadow-2xl overflow-hidden"
            style={{ background: "oklch(0.10 0.009 155)", maxHeight: "70vh" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
                  <MessageCircle size={15} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Support</p>
                  <p className="text-[10px] text-muted-foreground">
                    {chat?.status === "open" ? "We typically reply within a few hours" : "Chat closed"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
              >
                <ChevronDown size={16} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px]">
              {/* Welcome message */}
              <div className="flex gap-2.5">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center mt-0.5">
                  <span className="text-[10px] font-bold text-primary">S</span>
                </div>
                <div className="bg-sidebar/80 border border-border rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[80%]">
                  <p className="text-xs text-muted-foreground mb-0.5 font-medium">Support</p>
                  <p className="text-sm text-foreground">
                    Hi! How can we help you today? Send us a message and we&apos;ll get back to you soon.
                  </p>
                </div>
              </div>

              {messages === undefined && chat && (
                <div className="flex justify-center py-4">
                  <Loader2 size={18} className="animate-spin text-muted-foreground" />
                </div>
              )}

              {messages?.map((msg) => {
                const isAdmin = msg.senderRole === "admin";
                return (
                  <div key={msg._id} className={cn("flex gap-2.5", !isAdmin && "flex-row-reverse")}>
                    {isAdmin && (
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center mt-0.5">
                        <span className="text-[10px] font-bold text-primary">S</span>
                      </div>
                    )}
                    <div
                      className={cn(
                        "rounded-2xl px-3.5 py-2.5 max-w-[80%]",
                        isAdmin
                          ? "bg-sidebar/80 border border-border rounded-tl-sm"
                          : "bg-primary text-primary-foreground rounded-tr-sm"
                      )}
                    >
                      {isAdmin && (
                        <p className="text-xs text-muted-foreground mb-0.5 font-medium">Support</p>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                      <p className={cn("text-[10px] mt-1", isAdmin ? "text-muted-foreground" : "text-primary-foreground/60")}>
                        {format(new Date(msg._creationTime), "h:mm a")}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-border bg-sidebar/40">
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 resize-none bg-sidebar border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 min-h-[40px] max-h-[120px]"
                  style={{ fieldSizing: "content" } as React.CSSProperties}
                  disabled={sending}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 disabled:opacity-40 hover:bg-primary/90 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground/50 text-center mt-1.5">Enter to send · Shift+Enter for new line</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        onClick={open ? () => setOpen(false) : handleOpen}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-[4.5rem] right-4 md:bottom-6 md:right-6 z-50 w-13 h-13 rounded-2xl bg-primary text-primary-foreground shadow-lg flex items-center justify-center cursor-pointer"
        style={{ width: "52px", height: "52px" }}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X size={20} />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <MessageCircle size={20} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Unread badge */}
        {!open && (unreadCount ?? 0) > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center"
          >
            {unreadCount}
          </motion.span>
        )}
      </motion.button>
    </>
  );
}
