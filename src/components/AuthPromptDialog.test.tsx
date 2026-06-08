import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthPromptProvider, useAuthPrompt } from "@/components/AuthPromptDialog";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, session: null, loading: false, signOut: async () => {} }),
}));

const Trigger = () => {
  const { requireAuth } = useAuthPrompt();
  return (
    <button onClick={() => requireAuth({ title: "Action privée" })}>do</button>
  );
};

describe("AuthPromptDialog", () => {
  it("shows Annuler / Se connecter / Créer un compte for non-logged-in users", () => {
    render(
      <MemoryRouter>
        <AuthPromptProvider>
          <Trigger />
        </AuthPromptProvider>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("do"));
    expect(screen.getByText("Action privée")).toBeInTheDocument();
    expect(screen.getByText("Annuler")).toBeInTheDocument();
    expect(screen.getByText("Se connecter")).toBeInTheDocument();
    expect(screen.getByText("Créer un compte")).toBeInTheDocument();
  });
});
