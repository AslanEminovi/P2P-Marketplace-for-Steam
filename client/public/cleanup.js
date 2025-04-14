// This script performs cleanup operations on page load
console.log("Cleanup script executed");

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

// Check for localStorage errors and handle them
try {
  // Test if localStorage is accessible
  localStorage.getItem("test");
} catch (error) {
  console.log("localStorage not available, skipping cleanup");
}
