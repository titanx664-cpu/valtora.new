import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@/lib/data-hooks.tsx";
import { api } from "@/lib/api.ts";
import type { Id } from "@/lib/types.d.ts";
import { motion, AnimatePresence } from "motion/react";
import { MessageCircle, Send, Loader2, CheckCheck, Clock, User, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";

export default function AdminSupportPage() {
  const [selectedChatId, setSelectedChatId] = useState<Id<"supportChats"> | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  const chats = useQuery(api.support.adminListChats);

  const handleSelectChat = (id: Id<"supportChats">) => {
    setSelectedChatId(id);
    setMobileView("chat");
  };

  return (
    <div className="flex h-full min-h-[calc(100dvh-6rem)] pb-24 md:min-h-0 md:pb-0">
      {/* Sidebar — chat list */}
      <div className={cn(
        "flex flex-col border-r border-border bg-sidebar/30 flex-shrink-0",
        "w-full md:w-80",
        mobileView === "chat" ? "hidden md:flex" : "flex"
      )}>
        <div className="px-4 py-4 border-b border-border">
          <h1 className="text-base font-bold text-foreground">Support Chats</h1>
          {chats && (
            <p className="text-xs text-muted-foreground mt-0.5">{chats.length} total conversation{chats.length !== 1 ? "s" : ""}</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {chats === undefined && (
            <div className="p-3 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          )}

          {chats?.length === 0 && (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><MessageCircle /></EmptyMedia>
                <EmptyTitle>No chats yet</EmptyTitle>
                <EmptyDescription>User support conversations will appear here</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          <div className="p-2 space-y-1">
            {chats?.map((chat: any) => (
              <button
                key={chat._id}
                onClick={() => handleSelectChat(chat._id)}
                className={cn(
                  "w-full text-left px-3 py-3 rounded-xl transition-all cursor-pointer",
                  selectedChatId === chat._id
                    ? "bg-sidebar-accent"
                    : "hover:bg-sidebar-accent/50"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary/15 flex-shrink-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">
                      {chat.user?.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {chat.user?.name ?? chat.user?.username ?? "Unknown"}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {formatDistanceToNow(new Date(chat.lastMessageAt), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground truncate flex-1">
                        {chat.lastMessagePreview ?? "No messages yet"}
                      </span>
                      {(chat.unreadByAdmin ?? 0) > 0 && (
                        <span className="w-5 h-5 bg-primary rounded-full text-[10px] text-primary-foreground font-bold flex items-center justify-center flex-shrink-0">
                          {chat.unreadByAdmin}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 ml-10">
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                    chat.status === "open" ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"
                  )}>
                    {chat.status}
                  </span>
                  <span className="text-[10px] text-muted-foreground">@{chat.user?.username}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat detail panel */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0",
        mobileView === "list" ? "hidden md:flex" : "flex"
      )}>
        {selectedChatId ? (
          <ChatDetail
            chatId={selectedChatId}
            onBack={() => setMobileView("list")}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle size={40} className="text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Select a conversation to view messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChatDetail({ chatId, onBack }: { chatId: Id<"supportChats">; onBack: () => void }) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const chats = useQuery(api.support.adminListChats);
  const chat = chats?.find((c: any) => c._id === chatId);
  const messages = useQuery(api.support.adminGetMessages, { chatId });

  const reply = useMutation(api.support.adminReply);
  const markRead = useMutation(api.support.adminMarkRead);
  const setStatus = useMutation(api.support.adminSetChatStatus);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (chatId) {
      markRead({ chatId }).catch(() => null);
    }
  }, [chatId, messages?.length]);

  const handleSend = async () => {
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    setInput("");
    try {
      await reply({ chatId, body });
    } catch {
      toast.error("Failed to send reply");
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

  const handleToggleStatus = async () => {
    if (!chat) return;
    const newStatus = chat.status === "open" ? "closed" : "open";
    try {
      await setStatus({ chatId, status: newStatus });
      toast.success(`Chat marked as ${newStatus}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-shrink-0">
        <button onClick={onBack} className="md:hidden p-1.5 text-muted-foreground hover:text-foreground cursor-pointer">
          <ChevronLeft size={18} />
        </button>
        <div className="w-8 h-8 rounded-xl bg-primary/15 flex-shrink-0 flex items-center justify-center">
          <User size={14} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {chat?.user?.name ?? "Unknown User"}
          </p>
          <p className="text-xs text-muted-foreground">@{chat?.user?.username}</p>
        </div>
        {chat && (
          <Button
            size="sm"
            variant={chat.status === "open" ? "secondary" : "default"}
            onClick={handleToggleStatus}
            className="text-xs h-7 cursor-pointer"
          >
            {chat.status === "open" ? "Close Chat" : "Reopen"}
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages === undefined && (
          <div className="flex justify-center py-6">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        )}

        {messages?.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No messages yet in this conversation.</p>
          </div>
        )}

        {messages?.map((msg: any) => {
          const isAdmin = msg.senderRole === "admin";
          return (
            <div key={msg._id} className={cn("flex gap-2.5", isAdmin && "flex-row-reverse")}>
              <div className={cn(
                "w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 text-[11px] font-bold",
                isAdmin ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              )}>
                {isAdmin ? "A" : (chat?.user?.name?.charAt(0)?.toUpperCase() ?? "U")}
              </div>
              <div className={cn(
                "rounded-2xl px-3.5 py-2.5 max-w-[75%]",
                isAdmin
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-sidebar/80 border border-border rounded-tl-sm"
              )}>
                <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                <p className={cn("text-[10px] mt-1", isAdmin ? "text-primary-foreground/60" : "text-muted-foreground")}>
                  {format(new Date(msg._creationTime), "MMM d, h:mm a")}
                  {isAdmin && msg.isRead && <CheckCheck size={10} className="inline ml-1" />}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply input */}
      {chat?.status === "open" ? (
        <div className="px-4 py-3 border-t border-border flex-shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a reply..."
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
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/50 mt-1.5">Enter to send · Shift+Enter for new line</p>
        </div>
      ) : (
        <div className="px-4 py-3 border-t border-border flex-shrink-0">
          <p className="text-xs text-center text-muted-foreground">
            This chat is closed. Reopen it to send replies.
          </p>
        </div>
      )}
    </>
  );
}
