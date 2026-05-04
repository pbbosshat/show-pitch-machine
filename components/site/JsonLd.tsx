// JsonLd — reusable Server Component for injecting JSON-LD structured data.
// Usage: <JsonLd data={mySchemaObject} />
// The script tag is rendered server-side so crawlers see it in the raw HTML.
// dangerouslySetInnerHTML is safe here because we control the data shape and
// only pass plain JS objects — never user-supplied strings.

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify produces valid JSON; no XSS risk from a plain object
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
