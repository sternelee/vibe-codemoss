/**
 * 将 Mermaid 生成的 SVG 转成 XML-safe Base64 `data:` URL，供 `<img src>`
 * 与 viewerjs 使用。
 *
 * 先通过 inert template 规范化的原因：
 * - Mermaid strict mode 经 DOMPurify 后，会按 HTML 规则序列化
 *   `<foreignObject>` 内的 `<br>`、`&nbsp;` 等内容。
 * - inline SVG 能接受这类 HTML markup，但 `<img>` 会按 XML 解析 SVG，
 *   因而拒绝 HTML-only serialization。
 * - inert template 恢复 sanitized DOM，`XMLSerializer` 再输出合法 XML。
 *
 * 采用 Base64 而不是 `encodeURIComponent` 的原因：
 * - Mermaid v11 会内联 `<style>`，其中的 `<!--`、`<` selector 等字符会让
 *   `data:image/svg+xml;charset=utf-8,` 形式不稳定。
 * - Base64 是 binary-safe，viewerjs 可直接复制 `<img>`。
 *
 * 采用 TextEncoder + btoa 的原因：
 * - `btoa` 只接受 latin-1；中文等非 ASCII label 必须先编码成 UTF-8 bytes，
 *   再拼成 binary string。
 */
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

function serializeSvgForImage(svg: string): string {
  if (typeof document === "undefined" || typeof XMLSerializer === "undefined") {
    return svg;
  }

  try {
    const template = document.createElement("template");
    template.innerHTML = svg.trim();
    const svgElement = template.content.firstElementChild;
    if (
      svgElement?.localName !== "svg" ||
      svgElement.namespaceURI !== SVG_NAMESPACE
    ) {
      return svg;
    }

    for (const element of svgElement.querySelectorAll("[xmlns]")) {
      if (element.getAttribute("xmlns") === element.namespaceURI) {
        element.removeAttribute("xmlns");
      }
    }
    return new XMLSerializer().serializeToString(svgElement);
  } catch (error) {
    console.warn("[mermaid-fullscreen] svg-xml-serialization-fallback", {
      errorName: error instanceof Error ? error.name : typeof error,
      svgLength: svg.length,
    });
    // ponytail: normalization exception 只做兼容降级；diagnostic 不携带
    // SVG source / error message，避免用户内容进入日志。
    return svg;
  }
}

export function svgToDataUrl(svg: string): string {
  if (!svg) {
    return "";
  }
  const serializedSvg = serializeSvgForImage(svg);
  const utf8Bytes = new TextEncoder().encode(serializedSvg);
  let binary = "";
  for (let i = 0; i < utf8Bytes.length; i += 1) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}
