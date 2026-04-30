import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { fireEvent, screen } from "@testing-library/dom";
import PaymentMethodSelector from "@/components/ride/PaymentMethodSelector";

describe("PaymentMethodSelector", () => {
  it("renders a compact two-option payment selector", () => {
    render(<PaymentMethodSelector selected="cash" onSelect={vi.fn()} walletBalance={12.5} estimatedFare={5} />);

    expect(screen.getByRole("radiogroup", { name: /payment method/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /cash/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /wallet/i })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("$12.50")).toBeInTheDocument();
  });

  it("selects wallet when wallet has enough balance", async () => {
    const onSelect = vi.fn();
    render(<PaymentMethodSelector selected="cash" onSelect={onSelect} walletBalance={10} estimatedFare={6} />);

    fireEvent.click(screen.getByRole("radio", { name: /wallet/i }));

    expect(onSelect).toHaveBeenCalledWith("wallet");
  });

  it("does not re-select the already selected method", async () => {
    const onSelect = vi.fn();
    render(<PaymentMethodSelector selected="cash" onSelect={onSelect} walletBalance={10} estimatedFare={6} />);

    fireEvent.click(screen.getByRole("radio", { name: /cash/i }));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("disables wallet when balance is insufficient", async () => {
    const onSelect = vi.fn();
    render(<PaymentMethodSelector selected="cash" onSelect={onSelect} walletBalance={2} estimatedFare={6} />);

    const wallet = screen.getByRole("radio", { name: /wallet/i });
    expect(wallet).toBeDisabled();
    expect(screen.getByText("Low balance")).toBeInTheDocument();

    fireEvent.click(wallet);
    expect(onSelect).not.toHaveBeenCalled();
  });
});