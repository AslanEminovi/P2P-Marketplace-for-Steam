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

// Wait for DOM to be fully loaded before accessing document.body
document.addEventListener("DOMContentLoaded", function () {
  // Check for stuck background colors and reset them
  if (
    document.body &&
    (document.body.style.backgroundColor === "rgb(255, 0, 0)" ||
      document.body.style.backgroundColor === "red")
  ) {
    console.log("Clearing stuck background color");
    document.body.style.backgroundColor = "";
  }

  // Remove any lingering modal classes
  if (document.body && document.body.classList.contains("modal-open")) {
    console.log("Removing stuck modal-open class");
    document.body.classList.remove("modal-open");
    document.body.style.overflow = "";
  }
});
