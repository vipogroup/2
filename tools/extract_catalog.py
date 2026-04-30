#!/usr/bin/env python3
"""Extract structured product data (including images) from PDF catalogs.

Usage example:
    python tools/extract_catalog.py \
        export_vipo_products_ui/data/agents-catalog.pdf \
        --output-json export_vipo_products_ui/data/products.generated.json \
        --image-dir public/catalog-images/agents-catalog

The script produces a JSON payload ready for scripts/import-products.js and
exports page images that can be referenced by the JSON.  It uses simple
heuristics that work best when each product starts with a numbered heading
(e.g. "12. Work table") followed by free-form description/spec lines.

Dependencies (install once):
    pip install pymupdf pdfplumber
"""

from __future__ import annotations

import argparse
import json
import logging
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Iterable, List, Optional

try:
    import fitz  # type: ignore
except ImportError as exc:  # pragma: no cover - dependency notice
    raise SystemExit(
        "Missing dependency 'pymupdf'. Install it via 'pip install pymupdf'"
    ) from exc

try:
    import pdfplumber  # type: ignore
except ImportError as exc:  # pragma: no cover - dependency notice
    raise SystemExit(
        "Missing dependency 'pdfplumber'. Install it via 'pip install pdfplumber'"
    ) from exc

LOGGER = logging.getLogger("extract_catalog")

HEADER_RE = re.compile(r"^\s*(\d+[\).\-]\s+)?(?P<title>.+?)\s*$")
PRICE_RE = re.compile(r"(?P<currency>USD|EUR|ILS|₪|\$|€|RMB|CNY|USD/Unit)\s*:?\s*(?P<amount>[0-9.,]+)")
DIMENSIONS_RE = re.compile(
    r"(?P<dims>(?:\d+[.,]?\d*\s*(?:mm|cm|m|ס\"מ|סמ|ס\"מ))(?:(?:\s*[x×*]\s*|\s+by\s+)\d+[.,]?\d*\s*(?:mm|cm|m|ס\"מ|סמ|ס\"מ)){1,2})",
    re.IGNORECASE,
)
BULLET_RE = re.compile(r"^[\u2022\u25CF\-•\*]\s*(?P<text>.+)")
SPEC_SEPARATOR_RE = re.compile(r"\s*[:：\-]\s*")

TITLE_INVALID_PREFIX_RE = re.compile(
    r"^\s*(from|material|size|backsplash|dimensions|thickness|shelf|shelves|drawer|drawers|legs|leg|panel|panels|counter|countertop|sink|faucet|contact)\b",
    re.IGNORECASE,
)
TITLE_ONLY_DIMENSIONS_RE = re.compile(
    r"^\s*[\d\sx×*.,-]+(?:mm|cm|m|ס\"מ|סמ|ס\"מ)\s*$",
    re.IGNORECASE,
)
TITLE_NUMERIC_ONLY_RE = re.compile(r"^\s*[\d\sx×*.,-]+$")
TITLE_CONTACT_RE = re.compile(r"\+?\d{6,}")


def has_enough_letters(text: str, minimum: int = 3) -> bool:
    return sum(1 for char in text if char.isalpha()) >= minimum


def is_suspicious_title(text: str) -> bool:
    stripped = text.strip()
    if not stripped:
        return True
    if TITLE_CONTACT_RE.search(stripped):
        return True
    if TITLE_INVALID_PREFIX_RE.match(stripped):
        return True
    if TITLE_ONLY_DIMENSIONS_RE.match(stripped):
        return True
    if TITLE_NUMERIC_ONLY_RE.match(stripped):
        return True
    return False


@dataclass
class ProductDraft:
    name: str
    page_index: int
    raw_lines: List[str] = field(default_factory=list)
    price_text: Optional[str] = None
    specs: Dict[str, str] = field(default_factory=dict)
    features: List[str] = field(default_factory=list)
    dimensions: Optional[str] = None

    def ingest_line(self, line: str) -> None:
        if not line:
            return

        price_match = PRICE_RE.search(line)
        if price_match and not self.price_text:
            self.price_text = price_match.group(0).strip()

        dims_match = DIMENSIONS_RE.search(line)
        if dims_match and not self.dimensions:
            self.dimensions = dims_match.group("dims").strip()

        bullet_match = BULLET_RE.match(line)
        if bullet_match:
            feature = bullet_match.group("text").strip()
            if feature:
                self.features.append(feature)
            return

        if ":" in line or "：" in line or "-" in line:
            parts = SPEC_SEPARATOR_RE.split(line, maxsplit=1)
            if len(parts) == 2:
                key, value = parts
            elif len(parts) >= 3:
                key, value = parts[0], parts[-1]
            else:
                key = value = ""
            key = key.strip()
            value = value.strip()
            if key and value:
                self.specs[key] = value
                return

        self.raw_lines.append(line)

    def to_payload(self, images: List[str]) -> Dict[str, object]:
        description_lines: List[str] = []
        notes: List[str] = []

        for line in self.raw_lines:
            if line.endswith(":"):
                notes.append(line)
            else:
                description_lines.append(line)

        description = "\n".join(description_lines).strip()
        if not description and self.dimensions:
            description = f"מידות: {self.dimensions}"

        full_description_parts: List[str] = []
        if description:
            full_description_parts.append(description)
        if self.dimensions and ("מידות" not in description):
            full_description_parts.append(f"מידות: {self.dimensions}")
        if notes:
            full_description_parts.extend(notes)

        if not self.features and self.dimensions:
            self.features.append(f"Dimensions: {self.dimensions}")

        media_images = [
            {
                "url": url,
                "alt": "",
                "position": index,
                "publicId": "",
            }
            for index, url in enumerate(images)
            if url
        ]

        payload = {
            "name": self.name,
            "description": description or "",
            "fullDescription": "\n".join(full_description_parts).strip(),
            "features": self.features,
            "specs": self.specs,
            "dimensions": self.dimensions,
            "price": None,
            "priceText": self.price_text,
            "sourcePage": self.page_index + 1,
            "media": {"images": media_images, "videoUrl": ""},
            "category": "קטלוג",
            "inStock": True,
            "stockCount": 0,
            "rating": 4.5,
            "reviews": 0,
            "active": True,
        }
        return payload


def extract_text_lines(pdf_path: Path) -> List[List[str]]:
    lines_per_page: List[List[str]] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text(layout=True) or ""
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            lines_per_page.append(lines)
    return lines_per_page


def extract_images(pdf_path: Path, output_dir: Path, dpi: int = 144) -> Dict[int, List[str]]:
    output_dir.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(pdf_path)
    page_map: Dict[int, List[str]] = {}

    for page_index in range(len(doc)):
        page = doc[page_index]
        images = page.get_images(full=True)
        page_paths: List[str] = []

        for img_index, img in enumerate(images, start=1):
            xref = img[0]
            base_name = f"{pdf_path.stem}_p{page_index + 1:03}_img{img_index:02}"
            image_path = output_dir / f"{base_name}.png"

            try:
                pix = fitz.Pixmap(doc, xref)
            except RuntimeError:
                continue

            if pix.n >= 4:  # type: ignore[attr-defined]
                pix = fitz.Pixmap(fitz.csRGB, pix)
            pix.save(image_path.as_posix())
            pix = None  # release
            rel_path = image_path.as_posix().replace(str(Path.cwd()).replace("\\", "/") + "/", "")
            page_paths.append(rel_path)

        if page_paths:
            page_map[page_index] = page_paths

    return page_map


def is_new_product(line: str) -> bool:
    if not line:
        return False
    numbered = re.match(r"^\s*\d+[\).\-]\s+", line)
    if numbered:
        return True
    words = line.split()
    if len(words) <= 12 and line == line.title():
        return True
    return False


def parse_products(lines_per_page: List[List[str]]) -> List[ProductDraft]:
    products: List[ProductDraft] = []
    current: Optional[ProductDraft] = None

    for page_index, lines in enumerate(lines_per_page):
        for raw_line in lines:
            line = raw_line.strip()
            if not line:
                continue

            if is_new_product(line):
                if current:
                    products.append(current)
                title_match = HEADER_RE.match(line)
                if not title_match:
                    continue

                title = title_match.group("title").strip()
                title = re.sub(r"^\d+[\).\-]\s+", "", title)

                if is_suspicious_title(title) or not has_enough_letters(title):
                    LOGGER.debug("Skipping suspicious title on page %s: %r", page_index + 1, title)
                    current = None
                    continue

                current = ProductDraft(name=title, page_index=page_index)
                continue

            if not current:
                # Skip lines until the first product header
                continue

            current.ingest_line(line)

    if current:
        products.append(current)

    LOGGER.info("Parsed %d product drafts", len(products))
    return products


def assign_images(products: List[ProductDraft], page_images: Dict[int, List[str]]) -> Dict[str, List[str]]:
    image_allocation: Dict[str, List[str]] = {}
    for product in products:
        images = page_images.get(product.page_index, [])
        image_allocation[product.name] = images
    return image_allocation


def build_payload(products: List[ProductDraft], image_map: Dict[str, List[str]]) -> List[Dict[str, object]]:
    payloads: List[Dict[str, object]] = []
    for product in products:
        raw_images = image_map.get(product.name, [])
        images: List[str] = []

        for img_path in raw_images:
            normalized = img_path.replace("\\", "/")
            if normalized.startswith("public/"):
                normalized = "/" + normalized[len("public/") :]
            elif not normalized.startswith("/"):
                normalized = "/" + normalized
            images.append(normalized)

        if not images:
            LOGGER.debug("Skipping product without images: %r", product.name)
            continue

        payload = product.to_payload(images)
        payloads.append(payload)
    return payloads


def parse_args(argv: Optional[Iterable[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract structured product data from a PDF catalog")
    parser.add_argument("pdf", type=Path, help="Path to the catalog PDF")
    parser.add_argument(
        "--output-json",
        type=Path,
        default=None,
        help="Destination JSON path (default: <pdf>.generated.json)",
    )
    parser.add_argument(
        "--image-dir",
        type=Path,
        default=None,
        help="Directory to store extracted images (default: <output>/images/<pdf-stem>)",
    )
    parser.add_argument(
        "--image-dpi",
        type=int,
        default=144,
        help="DPI used when rasterising images (default: 144)",
    )
    return parser.parse_args(argv)


def main(argv: Optional[Iterable[str]] = None) -> None:
    args = parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    pdf_path: Path = args.pdf.resolve()
    if not pdf_path.exists():
        raise SystemExit(f"PDF not found: {pdf_path}")

    output_json: Path
    if args.output_json:
        output_json = args.output_json.resolve()
    else:
        output_json = pdf_path.with_suffix(".generated.json")

    if args.image_dir:
        image_dir = args.image_dir.resolve()
    else:
        image_dir = output_json.parent / "images" / pdf_path.stem

    LOGGER.info("Reading PDF: %s", pdf_path)
    lines_per_page = extract_text_lines(pdf_path)
    products = parse_products(lines_per_page)

    if not products:
        LOGGER.error("No products were detected in the PDF. Adjust parsing heuristics.")
        raise SystemExit(1)

    LOGGER.info("Extracting page images → %s", image_dir)
    page_images = extract_images(pdf_path, image_dir, dpi=args.image_dpi)
    image_map = assign_images(products, page_images)

    payload = build_payload(products, image_map)

    output_json.parent.mkdir(parents=True, exist_ok=True)
    with output_json.open("w", encoding="utf-8") as fp:
        json.dump({"items": payload, "source": pdf_path.name}, fp, ensure_ascii=False, indent=2)

    LOGGER.info("Written %d products to %s", len(payload), output_json)
    LOGGER.info("Remember to review the output and adjust parsing rules if needed.")


if __name__ == "__main__":  # pragma: no cover
    main(sys.argv[1:])
