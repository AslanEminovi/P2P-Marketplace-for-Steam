import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import i18n from "./i18n/config";
// Import Bootstrap CSS
import "bootstrap/dist/css/bootstrap.min.css";
import { I18nextProvider } from "react-i18next";

// Global error handler component
class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Global error caught:", error);
    console.error("Error info:", errorInfo);
    this.setState({ error });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "20px",
            margin: "20px",
            backgroundColor: "#1F2B45",
            borderRadius: "8px",
            color: "white",
            textAlign: "center",
            fontFamily: "Arial, sans-serif",
            maxWidth: "600px",
            marginLeft: "auto",
            marginRight: "auto",
            marginTop: "100px",
            boxShadow: "0 0 15px rgba(0, 0, 0, 0.5)",
          }}
        >
          <h1 style={{ color: "#00D2FF" }}>Something went wrong</h1>
          <p style={{ fontSize: "16px", lineHeight: "1.5" }}>
            We're sorry, but the application encountered an error. Our team has
            been notified.
          </p>
          <div style={{ margin: "20px 0" }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "linear-gradient(135deg, #3373F2, #00D2FF)",
                border: "none",
                padding: "10px 20px",
                borderRadius: "4px",
                color: "white",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              Reload Page
            </button>
          </div>
          <details
            style={{
              textAlign: "left",
              margin: "20px 0",
              padding: "10px",
              background: "rgba(0,0,0,0.2)",
              borderRadius: "4px",
            }}
          >
            <summary
              style={{ cursor: "pointer", padding: "8px", color: "#BBC7DB" }}
            >
              Error Details
            </summary>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                padding: "10px",
                fontSize: "12px",
                color: "#ff6b6b",
              }}
            >
              {this.state.error && this.state.error.toString()}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </I18nextProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>
);
