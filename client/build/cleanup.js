// Simple cleanup script
console.log("Cleanup script running");

// Safe way to test and clear localStorage if needed
try {
  // Test localStorage access
  if (window.localStorage) {
    console.log("LocalStorage is available");
  }
} catch (e) {
  console.log("LocalStorage access error");
}

// Only run document checks once the document is ready
function checkDocumentAndCleanup() {
  // Check if document and body exist before proceeding
  if (typeof document === "undefined" || !document.body) {
    console.log("Document body not available yet, will retry later");
    setTimeout(checkDocumentAndCleanup, 100);
    return;
  }

  // Check for stuck background colors and reset them
  if (
    document.body.style.backgroundColor === "rgb(255, 0, 0)" ||
    document.body.style.backgroundColor === "red"
  ) {
    console.log("Clearing stuck background color");
    document.body.style.backgroundColor = "";
  }

  // Remove any lingering modal classes
  if (document.body.classList.contains("modal-open")) {
    console.log("Removing stuck modal-open class");
    document.body.classList.remove("modal-open");
    document.body.style.overflow = "";
  }
}

// Make sure the document is ready before running cleanup
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", checkDocumentAndCleanup);
} else {
  checkDocumentAndCleanup();
}
