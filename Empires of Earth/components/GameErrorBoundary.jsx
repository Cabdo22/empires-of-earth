import React from "react";
import { btnStyle, panelStyle } from "../styles.js";

export class GameErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Game UI crashed", error, info);
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    const { hasError } = this.state;
    const { children, onRetry, onExit } = this.props;

    if (!hasError) return children;

    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(8,10,6,.94)", zIndex: 80, padding: 24 }}>
        <div style={{ ...panelStyle, maxWidth: 420, textAlign: "center" }}>
          <div style={{ color: "#dce8c0", fontSize: 18, letterSpacing: 2, marginBottom: 10 }}>UI Error</div>
          <div style={{ color: "#8a9a70", fontSize: 12, lineHeight: 1.5, marginBottom: 16 }}>
            Part of the in-game interface failed to render. Gameplay state is still in memory.
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
            <button onClick={onRetry} style={{ ...btnStyle(true), marginBottom: 0, marginRight: 0 }}>Retry UI</button>
            {onExit && <button onClick={onExit} style={{ ...btnStyle(false), marginBottom: 0, marginRight: 0 }}>Exit Match</button>}
          </div>
        </div>
      </div>
    );
  }
}
