import { Button, Loader, Textarea } from "@skbkontur/react-ui";
import { AlertTriangle, ArrowUp, Square } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ChatPanelProps } from "../components/ChatPanel";

export function KonturChatPanel({
  messages,
  busy,
  prompt,
  onPromptChange,
  onSubmit,
  onStop,
}: ChatPanelProps) {
  const conversation = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (conversation.current) {
      conversation.current.scrollTop = conversation.current.scrollHeight;
    }
  }, [messages, busy]);

  function submit() {
    form.current?.requestSubmit();
  }

  return (
    <aside className="right-rail k-chat" aria-label="Assistant">
      <header className="k-chat-heading">Chat</header>
      <div className="k-conversation" ref={conversation} role="log" aria-label="Conversation">
        {messages.length === 0 && !busy && (
          <div className="k-chat-empty">
            <h2>Describe what you want to build</h2>
            <p>PlayUI will generate the screen and update the preview.</p>
            <div className="k-chat-suggestions" aria-label="Prompt ideas">
              {[
                "Create a checkout screen",
                "Add a settings page",
                "Improve the empty state",
                "Make it mobile-friendly",
              ].map((suggestion) => (
                <Button
                  key={suggestion}
                  use="outline"
                  size="small"
                  onClick={() => {
                    onPromptChange(suggestion);
                    document.querySelector<HTMLTextAreaElement>(".k-composer textarea")?.focus();
                  }}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}
        {messages.map(({ role, text }, index) => (
          <div key={index} className={`k-bubble ${role}`}>
            {role === "error" && <AlertTriangle size={14} />}
            <span>{text}</span>
          </div>
        ))}
        {busy && (
          <div className="k-bubble assistant pending">
            <Loader active size="small" />
            Updating your prototype…
          </div>
        )}
      </div>
      <form className="k-composer" ref={form} onSubmit={onSubmit} aria-label="Describe a change">
        <Textarea
          aria-label="Describe a change"
          value={prompt}
          width="100%"
          rows={2}
          autoResize
          placeholder="Describe what you want to change…"
          onValueChange={onPromptChange}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <div className="k-composer-bar">
          {busy ? (
            <Button
              use="danger"
              size="small"
              icon={<Square size={11} fill="currentColor" />}
              aria-label="Stop generating"
              title="Stop generating"
              onClick={onStop}
            >
              Stop
            </Button>
          ) : (
            <Button
              use="accent"
              size="small"
              type="submit"
              icon={<ArrowUp size={16} />}
              aria-label="Send"
              title="Send · Enter"
              disabled={!prompt.trim()}
            >
              Send
            </Button>
          )}
        </div>
      </form>
    </aside>
  );
}
