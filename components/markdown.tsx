"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { CopyButton } from "@/components/copy-button";

export function Markdown({ children }: { children: string }) {
  return (
    <article className="prose prose-slate max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        urlTransform={(url) =>
          /^(https?:|mailto:|#|\/)/i.test(url) ? url : ""
        }
        components={{
          pre({ children, ...props }) {
            const code = String(
              (children as { props?: { children?: unknown } })?.props
                ?.children ?? "",
            ).replace(/\n$/, "");
            return (
              <div className="markdown-code-group group">
                <pre {...props} className="markdown-code">
                  {children}
                </pre>
                <CopyButton value={code} label="Copy" />
              </div>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </article>
  );
}
