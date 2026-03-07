import { useEffect } from "react";

type JsonLdNode = Record<string, unknown>;

type JsonLdInput = JsonLdNode | JsonLdNode[];

interface SeoHeadProps {
  title: string;
  description: string;
  path?: string;
  imagePath?: string;
  type?: "website" | "article";
  noindex?: boolean;
  structuredData?: JsonLdInput;
}

const DEFAULT_OG_IMAGE_PATH = "/og-image.svg";

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

const getSiteBaseUrl = (): string => {
  const fromEnv = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();
  if (fromEnv) {
    return trimTrailingSlash(fromEnv);
  }

  if (typeof window !== "undefined" && window.location.origin) {
    return trimTrailingSlash(window.location.origin);
  }

  return "";
};

const toAbsoluteUrl = (value: string | undefined, siteBaseUrl: string): string => {
  if (!value) {
    return siteBaseUrl;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (!siteBaseUrl) {
    return value;
  }

  return `${siteBaseUrl}${value.startsWith("/") ? value : `/${value}`}`;
};

const upsertMeta = (attr: "name" | "property", key: string, content: string) => {
  if (typeof document === "undefined") {
    return;
  }

  let node = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute(attr, key);
    document.head.appendChild(node);
  }

  node.setAttribute("content", content);
};

const upsertCanonical = (href: string) => {
  if (typeof document === "undefined") {
    return;
  }

  let node = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!node) {
    node = document.createElement("link");
    node.setAttribute("rel", "canonical");
    document.head.appendChild(node);
  }

  node.setAttribute("href", href);
};

export const SeoHead = ({
  title,
  description,
  path,
  imagePath = DEFAULT_OG_IMAGE_PATH,
  type = "website",
  noindex = false,
  structuredData,
}: SeoHeadProps) => {
  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const siteBaseUrl = getSiteBaseUrl();
    const canonicalUrl = toAbsoluteUrl(path ?? (typeof window !== "undefined" ? window.location.pathname : "/"), siteBaseUrl);
    const imageUrl = toAbsoluteUrl(imagePath, siteBaseUrl);

    document.title = title;
    upsertCanonical(canonicalUrl);

    upsertMeta("name", "description", description);
    upsertMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow");

    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:url", canonicalUrl);
    upsertMeta("property", "og:image", imageUrl);
    upsertMeta("property", "og:site_name", "Inside Out Programme");

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", imageUrl);

    document
      .querySelectorAll<HTMLScriptElement>('script[data-seo-json-ld="true"]')
      .forEach((node) => node.remove());

    const createdScripts: HTMLScriptElement[] = [];
    if (structuredData) {
      const nodes = Array.isArray(structuredData) ? structuredData : [structuredData];
      nodes.forEach((item) => {
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.dataset.seoJsonLd = "true";
        script.text = JSON.stringify(item);
        document.head.appendChild(script);
        createdScripts.push(script);
      });
    }

    return () => {
      createdScripts.forEach((node) => node.remove());
    };
  }, [description, imagePath, noindex, path, structuredData, title, type]);

  return null;
};
