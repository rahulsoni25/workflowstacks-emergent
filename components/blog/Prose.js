// Typography wrapper for rendered article HTML. The blog is the one part of
// the site that is *read* top to bottom, so this sets a reading measure and
// styles the raw HTML from lib/blog/markdown (tables, code, callouts) via
// global .blog-prose rules in globals.css.
export default function Prose({ html }) {
  return <div className="blog-prose" dangerouslySetInnerHTML={{ __html: html }} />
}
