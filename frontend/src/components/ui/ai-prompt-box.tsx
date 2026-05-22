import React from "react";
import { ArrowUp, Square } from "lucide-react";

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ");

interface PromptInputBoxProps {
  onSend?: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export const PromptInputBox = React.forwardRef((props: PromptInputBoxProps, ref: React.Ref<HTMLDivElement>) => {
  const { onSend = () => {}, isLoading = false, placeholder = "Message AvanGuard...", className } = props;
  const [input, setInput] = React.useState("");

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim()) {
      onSend(input);
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasContent = input.trim() !== "";

  return (
    <div
      ref={ref}
      className={cn(
        "flex w-full items-center gap-2 rounded-2xl bg-[#2F2F2F] px-4 py-2 ring-1 ring-[#424242] focus-within:ring-gray-400 transition-all",
        className
      )}
    >
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        placeholder={placeholder}
        rows={1}
        className="w-full resize-none bg-transparent text-gray-200 placeholder-gray-400 focus:outline-none min-h-[24px] max-h-[200px] py-2 scrollbar-thin overflow-y-auto"
        style={{ height: "auto" }}
      />

      <button
        type="button"
        disabled={isLoading || !hasContent}
        onClick={handleSubmit}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
          hasContent && !isLoading
            ? "bg-white text-black hover:bg-gray-200"
            : "bg-[#424242] text-gray-500",
          isLoading && "bg-[#424242]"
        )}
      >
        {isLoading ? (
          <Square className="h-3 w-3 fill-gray-400 animate-pulse" />
        ) : (
          <ArrowUp className="h-4 w-4" />
        )}
      </button>
    </div>
  );
});

PromptInputBox.displayName = "PromptInputBox";
