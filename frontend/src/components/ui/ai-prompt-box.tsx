import React from "react";
import { ArrowUp, Square } from "lucide-react";

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ");

interface PromptInputBoxProps {
  onSend?: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export const PromptInputBox = React.forwardRef((props: PromptInputBoxProps, ref: React.Ref<HTMLFormElement>) => {
  const { onSend = () => {}, isLoading = false, placeholder = "Message AvanGuard...", className } = props;
  const [input, setInput] = React.useState("");

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim()) {
      onSend(input);
      setInput("");
    }
  };

  const hasContent = input.trim() !== "";

  return (
    <form
      ref={ref}
      onSubmit={handleSubmit}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg bg-[#2F2F2F] px-4 py-1.5 ring-1 ring-[#424242] focus-within:ring-gray-400 transition-all",
        className
      )}
    >
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={isLoading}
        placeholder={placeholder}
        className="w-full bg-transparent text-gray-200 placeholder-gray-400 focus:outline-none py-2 text-sm overflow-hidden text-ellipsis"
      />

      <button
        type="submit"
        disabled={isLoading || !hasContent}
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
    </form>
  );
});

PromptInputBox.displayName = "PromptInputBox";
