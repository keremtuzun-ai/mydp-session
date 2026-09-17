// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserChip } from "@/components/mun/user-chip";

describe("UserChip", () => {
  it("prints the board title under the member's name", () => {
    const { container } = render(<UserChip name="Ela Tunç" username="ela-tunc" />);
    const stack = container.querySelector("span.leading-tight")!;
    const lines = [...stack.children].map((el) => el.textContent);
    expect(lines).toEqual(["Ela Tunç", "Ms. President", "ela-tunc"]);
    expect(screen.getByText("Ms. President")).toHaveClass("board-title");
  });

  it("leaves everyone else with name and username only", () => {
    const { container } = render(<UserChip name="Kerem Tuzun" username="keremtuzun" />);
    const stack = container.querySelector("span.leading-tight")!;
    expect([...stack.children].map((el) => el.textContent)).toEqual(["Kerem Tuzun", "keremtuzun"]);
  });
});
