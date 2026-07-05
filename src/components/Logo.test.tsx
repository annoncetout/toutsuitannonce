import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import Logo from "./Logo";

/**
 * Responsive guard tests for the Logo.
 *
 * Goal: prevent overflow regressions in the navbar across mobile & desktop.
 * Rules enforced:
 *  - The root <a> must use flex + min-w-0 + max-w-full so it can shrink inside the navbar.
 *  - Every text span must be whitespace-nowrap (no wrap that pushes height/overflow).
 *  - The icon must be shrink-0 with responsive sizing (mobile < desktop).
 *  - The "ANNONCES" tagline must stay hidden on mobile (hidden md:block) to avoid overflow.
 *  - Snapshot guards the full responsive class set.
 */

const setViewport = (width: number) => {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
  window.dispatchEvent(new Event("resize"));
};

describe("Logo — responsive overflow guards", () => {
  beforeEach(() => {
    setViewport(1280);
  });

  it("root link allows shrinking inside a constrained navbar", () => {
    const { container } = render(<Logo />);
    const root = container.querySelector("a") as HTMLAnchorElement;
    expect(root).toBeInTheDocument();
    const cls = root.className;
    expect(cls).toMatch(/\bflex\b/);
    expect(cls).toMatch(/\bitems-center\b/);
    expect(cls).toMatch(/\bmin-w-0\b/);
    expect(cls).toMatch(/\bmax-w-full\b/);
  });

  it("text spans never wrap (whitespace-nowrap) to keep one-line layout", () => {
    const { container } = render(<Logo />);
    const spans = Array.from(container.querySelectorAll("span"));
    expect(spans.length).toBeGreaterThanOrEqual(2);
    for (const span of spans) {
      expect(span.className).toMatch(/whitespace-nowrap/);
    }
  });

  it("icon is shrink-0 and uses smaller size on mobile than desktop", () => {
    const { container } = render(<Logo />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    const cls = svg!.getAttribute("class") || "";
    expect(cls).toMatch(/shrink-0/);
    // mobile base size present
    expect(cls).toMatch(/\bw-5\b/);
    expect(cls).toMatch(/\bh-5\b/);
    // desktop upscale present
    expect(cls).toMatch(/md:w-11/);
    expect(cls).toMatch(/md:h-11/);
  });

  it('"ANNONCES" tagline is hidden on mobile to prevent overflow', () => {
    const { getByText } = render(<Logo />);
    const tag = getByText("ANNONCES");
    expect(tag.className).toMatch(/\bhidden\b/);
    expect(tag.className).toMatch(/md:block/);
  });

  it('"ANNONCES" tagline keeps a visible gap after "SUITE" on desktop', () => {
    const { getByText } = render(<Logo />);
    const tag = getByText("ANNONCES");
    // ml-6 (1.5rem) guarantees a clear visual space between SUITE and ANNONCES
    expect(tag.className).toMatch(/\bml-6\b/);
  });

  it("TOUT/SUITE wordmarks scale up responsively (mobile → desktop)", () => {
    const { getByText } = render(<Logo />);
    for (const word of ["TOUT", "SUITE"]) {
      const el = getByText(word);
      expect(el.className).toMatch(/text-lg/);
      expect(el.className).toMatch(/sm:text-2xl/);
      expect(el.className).toMatch(/md:text-4xl/);
    }
  });

  it("matches responsive class snapshot (regression guard)", () => {
    const { container } = render(<Logo />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("does not overflow a narrow 320px mobile navbar container", () => {
    setViewport(320);
    const { container } = render(
      <div style={{ width: 320, display: "flex" }}>
        <Logo />
      </div>
    );
    const root = container.querySelector("a")!;
    // jsdom doesn't layout, but we can assert the shrink-enabling classes are present
    expect(root.className).toMatch(/min-w-0/);
    expect(root.className).toMatch(/max-w-full/);
  });
});
