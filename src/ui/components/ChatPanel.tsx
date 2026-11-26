import { useEffect, useRef } from "react";
import { AlertTriangle, ArrowUp, Square } from "lucide-react";
import type { Message } from "../types";

type ChatPanelProps = {
  messages: Message[];
  busy: boolean;
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onStop: () => void;
};

export function ChatPanel({
  messages,
  busy,
  prompt,
  onPromptChange,
  onSubmit,
  onStop,
}: ChatPanelProps) {
  const conversation = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversation.current) {
      conversation.current.scrollTop = conversation.current.scrollHeight;
    }
  }, [messages, busy]);

  return (
    <aside className="right-rail" aria-label="Assistant">
      <header className="assistant-heading">Chat</header>
      <div className="conversation" ref={conversation} role="log" aria-label="Conversation">
        {messages.map(({ role, text }, index) => (
          <div key={index} className={`bubble ${role}`}>
            {role === "error" && <AlertTriangle size={14} />}
            <span>{text}</span>
          </div>
        ))}
        {busy && (
          <div className="bubble assistant pending">
            <span className="typing" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            Updating your prototype…
          </div>
        )}
      </div>
      <form className="composer" onSubmit={onSubmit}>
        <textarea
          aria-label="Describe a change"
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          placeholder="Describe what you want to change…"
          rows={2}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <div className="composer-bar">
          {busy ? (
            <button
              type="button"
              className="send-button stop-button"
              aria-label="Stop generating"
              title="Stop generating"
              onClick={onStop}
            >
              <Square size={11} fill="currentColor" />
            </button>
          ) : (
            <button
              type="submit"
              className="send-button"
              aria-label="Send"
              title="Send · Enter"
              disabled={!prompt.trim()}
            >
              <ArrowUp size={16} />
            </button>
          )}
        </div>
      </form>
    </aside>
  );
}
