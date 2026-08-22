import { useEffect, useRef } from "react";
import {
  Bold,
  Code2,
  Heading2,
  Heading3,
  Image,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
  Table2,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
}

const tools = [
  { label: "Heading 2", command: "formatBlock", value: "h2", icon: Heading2 },
  { label: "Heading 3", command: "formatBlock", value: "h3", icon: Heading3 },
  { label: "Bold", command: "bold", icon: Bold },
  { label: "Italic", command: "italic", icon: Italic },
  { label: "Bulleted list", command: "insertUnorderedList", icon: List },
  { label: "Numbered list", command: "insertOrderedList", icon: ListOrdered },
  { label: "Quote", command: "formatBlock", value: "blockquote", icon: Quote },
  { label: "Code block", command: "formatBlock", value: "pre", icon: Code2 },
] as const;

export default function RichTextEditor({
  value,
  onChange,
  disabled,
  invalid,
  describedBy,
}: RichTextEditorProps) {
  const editor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editor.current && editor.current.innerHTML !== value)
      editor.current.innerHTML = value;
  }, [value]);

  const run = (command: string, commandValue?: string) => {
    if (disabled) return;
    editor.current?.focus();
    document.execCommand(command, false, commandValue);
    onChange(editor.current?.innerHTML ?? "");
  };

  const addLink = () => {
    const url = window.prompt("Enter an HTTPS link");
    if (url && /^https?:\/\//iu.test(url)) run("createLink", url);
  };

  const addImage = () => {
    const url = window.prompt("Paste an HTTPS or Media Library image URL");
    if (
      url &&
      (/^https?:\/\//iu.test(url) || url.startsWith("/api/v1/media/files/"))
    )
      run("insertImage", url);
  };

  const addTable = () => {
    run(
      "insertHTML",
      "<table><thead><tr><th>Heading</th><th>Heading</th></tr></thead><tbody><tr><td>Value</td><td>Value</td></tr></tbody></table><p><br></p>",
    );
  };

  return (
    <div className={`overflow-hidden rounded-xl border bg-[hsl(var(--admin-surface))] focus-within:ring-2 ${invalid ? "border-red-400/70 focus-within:border-red-400 focus-within:ring-red-400/20" : "border-[hsl(var(--admin-border))] focus-within:border-primary/60 focus-within:ring-primary/[0.15]"}`}>
      <div
        className="flex flex-wrap gap-1 border-b border-[hsl(var(--admin-border))] bg-black/10 p-2"
        role="toolbar"
        aria-label="Blog formatting tools"
      >
        {tools.map((tool) => (
          <button
            key={tool.label}
            type="button"
            title={tool.label}
            aria-label={tool.label}
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() =>
              run(tool.command, "value" in tool ? tool.value : undefined)
            }
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-primary/10 hover:text-primary disabled:opacity-40"
          >
            <tool.icon size={17} />
          </button>
        ))}
        <button
          type="button"
          title="Add link"
          aria-label="Add link"
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={addLink}
          className="rounded-lg p-2 text-muted-foreground transition hover:bg-primary/10 hover:text-primary disabled:opacity-40"
        >
          <Link size={17} />
        </button>
        <button
          type="button"
          title="Add image"
          aria-label="Add image"
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={addImage}
          className="rounded-lg p-2 text-muted-foreground transition hover:bg-primary/10 hover:text-primary disabled:opacity-40"
        >
          <Image size={17} />
        </button>
        <button
          type="button"
          title="Add table"
          aria-label="Add table"
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={addTable}
          className="rounded-lg p-2 text-muted-foreground transition hover:bg-primary/10 hover:text-primary disabled:opacity-40"
        >
          <Table2 size={17} />
        </button>
      </div>
      <div
        ref={editor}
        contentEditable={!disabled}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Blog post content"
        aria-invalid={invalid}
        aria-describedby={describedBy}
        data-placeholder="Write the full article…"
        onInput={() => onChange(editor.current?.innerHTML ?? "")}
        className="blog-editor prose prose-invert min-h-80 max-w-none px-5 py-4 text-sm leading-7 outline-none empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]"
      />
    </div>
  );
}
