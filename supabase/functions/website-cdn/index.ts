const PROJECT_URL = Deno.env.get("SUPABASE_URL")
const BUCKET = "website"

Deno.serve(async (req) => {
  const url = new URL(req.url)

  let path = url.pathname

  if (path === "/" || path === "") {
    path = "/index.html"
  }

  const env = url.hostname.includes("test")
    ? "test"
    : "production"

  const fileUrl =
    `${PROJECT_URL}/storage/v1/object/public/${BUCKET}/${env}${path}`

  const res = await fetch(fileUrl)

  if (!res.ok) {
    const fallback =
      `${PROJECT_URL}/storage/v1/object/public/${BUCKET}/${env}/index.html`
    return fetch(fallback)
  }

  return new Response(res.body, {
    headers: {
      "content-type": res.headers.get("content-type") || "text/html",
      "cache-control": "public, max-age=3600"
    }
  })
})