import type { MDXRemoteProps } from "next-mdx-remote/rsc";

type Components = NonNullable<MDXRemoteProps["components"]>;

export const mdxComponents: Components = {
  h2: (props) => (
    <h2
      className="font-display mt-12 mb-4 text-3xl font-medium text-slate-50"
      {...props}
    />
  ),
  h3: (props) => (
    <h3
      className="font-display mt-8 mb-3 text-2xl font-medium text-slate-100"
      {...props}
    />
  ),
  p: (props) => (
    <p className="mb-4 text-base leading-relaxed text-slate-300" {...props} />
  ),
  a: (props) => (
    <a
      className="text-cyan-200 underline decoration-cyan-300/40 underline-offset-4 hover:decoration-cyan-200"
      {...props}
    />
  ),
  ul: (props) => (
    <ul className="mb-4 list-disc space-y-2 pl-5 text-slate-300" {...props} />
  ),
  ol: (props) => (
    <ol
      className="mb-4 list-decimal space-y-2 pl-5 text-slate-300"
      {...props}
    />
  ),
  li: (props) => <li className="leading-relaxed" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="my-6 border-l border-cyan-300/40 pl-4 text-slate-400 italic"
      {...props}
    />
  ),
  hr: () => <hr className="my-10 border-white/10" />,
};
